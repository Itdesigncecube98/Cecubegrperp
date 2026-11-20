export const dynamic = 'force-dynamic';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addTaskMasterTask } from '@/lib/siteTaskMaster';
import { getDocumentActors, getDocumentEditors, recordDocumentAction, recordDocumentEdit } from '@/lib/documentAudit';
import { autoGrantCreatorProjectTools } from '@/lib/autoGrantCreatorTools';
import { checkDocumentApprovalAccess } from '@/lib/documentApprovalAccess';
import { readAuthSession } from '@/lib/authSession';
import { assertProjectOrderWithinAllocatedBudget, ProjectBudgetError } from '@/lib/projectAllocatedBudget';
import {
  addContractManagerApprovalRow,
  buildWorkOrderApprovalRows,
  buildPendingApprovalRows,
  getApplicableApprovalStages,
  getProcurementApprovalConfig,
  replaceDocumentApprovalRows,
  summarizeApprovalSteps,
  PROCUREMENT_DOCUMENT_TYPES,
  CONTRACT_MANAGER_APPROVER_ID,
} from '@/lib/procurementApprovalWorkflow';

function readScopeMetadata(scope) {
  try {
    const parsed = scope ? JSON.parse(scope) : {};
    return parsed?.audit && typeof parsed.audit === 'object' ? parsed.audit : {};
  } catch { return {}; }
}

async function getWorkOrderStatusHistory(client, workOrderIds) {
  if (!workOrderIds.length) return [];
  const placeholders = workOrderIds.map((_, index) => `$${index + 1}`).join(', ');
  return client.$queryRawUnsafe(
    `SELECT "id", "workOrderId", "fromStatus", "toStatus", "changedAt", "actorName", "note"
     FROM "WorkOrderStatusHistory"
     WHERE "workOrderId" IN (${placeholders})
     ORDER BY "changedAt" ASC`,
    ...workOrderIds,
  );
}

function recordWorkOrderStatus(client, { workOrderId, fromStatus = null, toStatus, actorName = null, note = null }) {
  return client.$executeRawUnsafe(
    `INSERT INTO "WorkOrderStatusHistory"
      ("id", "workOrderId", "fromStatus", "toStatus", "changedAt", "actorName", "note")
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)`,
    randomUUID(),
    workOrderId,
    fromStatus,
    toStatus,
    actorName,
    note,
  );
}

// GET /api/contracting/work-orders
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId    = searchParams.get('projectId');
    const contractorId = searchParams.get('contractorId');
    const status       = searchParams.get('status');
    const id           = searchParams.get('id');

    const where = {};
    if (projectId) where.projectId = projectId;
    if (contractorId) where.contractorId = contractorId;
    if (status) where.status = status;
    if (id) where.id = id;

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, projectId: true } },
        raBills: { select: { id: true, billNo: true, status: true, netPayable: true, date: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    const [statusHistory, editors, actors, approvalRows, approvalConfig] = await Promise.all([
      getWorkOrderStatusHistory(prisma, workOrders.map(order => order.id)),
      getDocumentEditors(prisma, 'WorkOrder', workOrders.map(order => order.id)),
      getDocumentActors(prisma, 'WorkOrder', workOrders.map(order => order.id)),
      prisma.documentApprovalStep.findMany({
        where: { documentType: PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER, documentId: { in: workOrders.map(order => order.id) } },
        select: { documentId: true, stage: true, approverEmployeeId: true, status: true },
      }),
      getProcurementApprovalConfig(prisma),
    ]);
    const historyByWorkOrder = new Map();
    for (const entry of statusHistory) {
      const entries = historyByWorkOrder.get(entry.workOrderId) || [];
      entries.push(entry);
      historyByWorkOrder.set(entry.workOrderId, entries);
    }
    const approvalRowsByWorkOrder = new Map();
    approvalRows.forEach(row => {
      const rows = approvalRowsByWorkOrder.get(row.documentId) || [];
      rows.push(row);
      approvalRowsByWorkOrder.set(row.documentId, rows);
    });
    return NextResponse.json(workOrders.map(order => {
      let approvalRowsForOrder = approvalRowsByWorkOrder.get(order.id) || [];
      if (!approvalRowsForOrder.length && ['Draft', 'Pending Approval'].includes(order.status)) {
        approvalRowsForOrder = buildPendingApprovalRows(getApplicableApprovalStages(approvalConfig, order.contractValue));
      }
      if (['Draft', 'Pending Approval'].includes(order.status)) {
        approvalRowsForOrder = addContractManagerApprovalRow(approvalRowsForOrder);
      }
      return {
        ...order,
        statusHistory: historyByWorkOrder.get(order.id) || [],
        approvalWorkflow: summarizeApprovalSteps(approvalRowsForOrder),
        ...readScopeMetadata(order.scope),
        ...actors[order.id],
        ...editors[order.id],
      };
    }));
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/contracting/work-orders
export async function POST(request) {
  try {
    const data = await request.json();
        const { projectId, contractorId, contractorName, contractorPhone, contractorGst, contractorPan,
          wbsTask, scope, startDate, endDate, contractValue, advancePercent, retentionPercent, paymentTerms,
          woNo: requestedWoNo, woDate, preview, items, quotationTerms } = data;

    if (!projectId || !contractorName) {
      return NextResponse.json({ error: 'projectId and contractorName are required' }, { status: 400 });
    }

    const project = await prisma.projectMaster.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const count = await prisma.workOrder.count();
    const defaultPrefix = `WO-${new Date().getFullYear()}`;
    let sequence = count + 1;
    let woNo = requestedWoNo || `${defaultPrefix}-${String(sequence).padStart(4, '0')}`;

    // A client may send a display placeholder or an already-used number.
    // Always resolve it to an unused unique work-order number before insert.
    if (await prisma.workOrder.findUnique({ where: { woNo } })) {
      do {
        sequence += 1;
        woNo = `${defaultPrefix}-${String(sequence).padStart(4, '0')}`;
      } while (await prisma.workOrder.findUnique({ where: { woNo } }));
    }

    const cv = parseFloat(contractValue) || 0;
    const ap = parseFloat(advancePercent) || 0;

    let workOrder = await prisma.$transaction(async tx => {
      await assertProjectOrderWithinAllocatedBudget(tx, {
        projectMasterId: projectId,
        projectName: project.name,
        amount: cv,
      });

      return tx.workOrder.create({
        data: {
        woNo,
        projectId,
        contractorId:     contractorId || null,
        contractorName,
        contractorPhone:  contractorPhone || null,
        contractorGst:    contractorGst || null,
        contractorPan:    contractorPan || null,
        wbsTask:          wbsTask || null,
        scope:            JSON.stringify({ scope: scope || null, preview: preview || null, items: items || [], quotationTerms: quotationTerms || {}, audit: { madeBy: data.madeBy || data.editedBy || null, approvedBy: null, approvedAt: null } }),
        startDate:        woDate ? new Date(woDate) : startDate ? new Date(startDate) : null,
        endDate:          endDate ? new Date(endDate) : null,
        contractValue:    cv,
        advancePercent:   ap,
        advanceAmount:    (cv * ap) / 100,
        retentionPercent: parseFloat(retentionPercent) || 0,
        paymentTerms:     paymentTerms || quotationTerms?.paymentTerms || null,
        status:           'Draft',
        },
        include: {
          project: { select: { id: true, name: true, projectId: true } }
        }
      });
    });
    await recordWorkOrderStatus(prisma, {
      workOrderId: workOrder.id,
      toStatus: 'Draft',
      actorName: data.madeBy || data.editedBy || 'System',
      note: 'Work order created',
    });

    const approvalConfig = await getProcurementApprovalConfig(prisma);
    const approvalStages = getApplicableApprovalStages(approvalConfig, cv);
    workOrder = await prisma.$transaction(async tx => {
      await replaceDocumentApprovalRows(
        tx,
        PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER,
        workOrder.id,
        buildWorkOrderApprovalRows(approvalStages)
      );
      const updated = await tx.workOrder.update({
        where: { id: workOrder.id },
        data: { status: 'Pending Approval' },
        include: { project: { select: { id: true, name: true, projectId: true } } },
      });
      await recordWorkOrderStatus(tx, {
        workOrderId: workOrder.id,
        fromStatus: 'Draft',
        toStatus: 'Pending Approval',
        actorName: data.madeBy || data.editedBy || 'System',
        note: 'Submitted to Contract Manager for approval.',
      });
      return updated;
    });

    const legacyProject = await prisma.project.findFirst({ where: { name: project.name }, select: { id: true } });
    await autoGrantCreatorProjectTools(prisma, request, {
      requestedEmployeeId: data.creatorEmployeeId,
      projectId: legacyProject?.id || projectId,
      projectName: project.name,
      module: 'Contracting',
      toolNames: ['Create Work Order', 'View Work Order', 'Edit Work Order', 'Delete Work Order'],
    });
    await recordDocumentAction(prisma, { entityType: 'WorkOrder', entityId: workOrder.id, module: 'Contracting', action: 'CREATE', actorName: data.madeBy || data.editedBy });
    if (legacyProject) {
      (Array.isArray(items) ? items : []).forEach(item => {
        addTaskMasterTask(legacyProject.id, {
          groupName: `Work Order ${woNo}`,
          subgroupName: contractorName || 'Work Order Tasks',
          taskName: item.description,
          description: `Work order ${woNo}`,
          source: 'Work Order',
          quantity: item.qty,
          unit: item.unit || 'Job',
          rate: item.rate,
          sourceId: item.id ? String(item.id) : null
        });
      });
    }

    return NextResponse.json(workOrder, { status: 201 });
  } catch (error) {
    console.error('Error creating work order:', error);
    if (error instanceof ProjectBudgetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/contracting/work-orders
export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, status, ...fields } = data;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const existing = await prisma.workOrder.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    if (!data.action && existing.status === 'Approved') return NextResponse.json({ error: 'Unapprove this work order within 2 days before editing it.' }, { status: 409 });
    if (data.action === 'send-to-accounts') {
      if (existing.status !== 'Approved') return NextResponse.json({ error: 'Only approved work orders can be sent to Accounts.' }, { status: 409 });
      const access = await checkDocumentApprovalAccess(request, prisma, { module: 'Contracting', toolName: 'Approve Work Order', projectId: existing.projectId });
      if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
      const actor = access.session.type === 'admin' ? 'Administrator' : (await prisma.employee.findUnique({ where: { id: access.session.id }, select: { name: true } }))?.name || 'Employee';
      const priorScope = (() => { try { return existing.scope ? JSON.parse(existing.scope) : {}; } catch { return {}; } })();
      const accountsSentAt = new Date().toISOString();
      const updated = await prisma.$transaction(async tx => {
        if (fields.contractValue !== undefined) {
          await assertProjectOrderWithinAllocatedBudget(tx, {
            projectMasterId: existing.projectId,
            amount: updatedAmount,
            excludeWorkOrderId: id,
          });
        }
        const result = await tx.workOrder.update({
          where: { id },
          data: { scope: JSON.stringify({ ...priorScope, audit: { ...(priorScope.audit || {}), accountsSentBy: actor, accountsSentAt } }) },
          include: { project: { select: { id: true, name: true } } },
        });
        await recordWorkOrderStatus(tx, {
          workOrderId: id,
          fromStatus: existing.status,
          toStatus: 'Sent to Accounts',
          actorName: actor,
          note: 'Work order sent to Accounts',
        });
        return result;
      });
      return NextResponse.json({ ...updated, accountsSentBy: actor, accountsSentAt });
    }
    if (data.action === 'approve') {
      const session = readAuthSession(request);
      if (!session) return NextResponse.json({ error: 'Sign in to approve this work order.' }, { status: 401 });
      if (!['Draft', 'Pending Approval'].includes(existing.status)) {
        return NextResponse.json({ error: 'This work order is no longer awaiting approval.' }, { status: 409 });
      }

      let approvalRows = await prisma.documentApprovalStep.findMany({
        where: { documentType: PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER, documentId: id },
      });
      if (!approvalRows.some(row => row.stage === 0 && row.approverEmployeeId === CONTRACT_MANAGER_APPROVER_ID)) {
        const managerAccess = await checkDocumentApprovalAccess(request, prisma, {
          module: 'Contracting',
          toolName: 'Approve Work Order',
          projectId: existing.projectId,
          allowAnyProject: true,
        });
        if (!managerAccess.allowed) return NextResponse.json({ error: managerAccess.error }, { status: managerAccess.status });
        const approvalConfig = await getProcurementApprovalConfig(prisma);
        const stages = getApplicableApprovalStages(approvalConfig, existing.contractValue);
        await prisma.$transaction(async tx => {
          await tx.$queryRaw`SELECT "id" FROM "WorkOrder" WHERE "id" = ${id} FOR UPDATE`;
          const currentRows = await tx.documentApprovalStep.findMany({
            where: { documentType: PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER, documentId: id },
          });
          if (!currentRows.some(row => row.stage === 0 && row.approverEmployeeId === CONTRACT_MANAGER_APPROVER_ID)) {
            if (currentRows.length) {
              await tx.documentApprovalStep.updateMany({
                where: { documentType: PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER, documentId: id },
                data: { status: 'PENDING', approvedAt: null },
              });
              await tx.documentApprovalStep.createMany({
                data: [{
                  ...buildWorkOrderApprovalRows([])[0],
                  documentType: PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER,
                  documentId: id,
                }],
                skipDuplicates: true,
              });
            } else {
              await replaceDocumentApprovalRows(
                tx,
                PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER,
                id,
                buildWorkOrderApprovalRows(stages)
              );
            }
            if (existing.status !== 'Pending Approval') {
              await tx.workOrder.update({ where: { id }, data: { status: 'Pending Approval' } });
            }
            await recordWorkOrderStatus(tx, {
              workOrderId: id,
              fromStatus: existing.status,
              toStatus: 'Pending Approval',
              note: 'Submitted to Contract Manager for approval.',
            });
          }
        });
        approvalRows = await prisma.documentApprovalStep.findMany({
          where: { documentType: PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER, documentId: id },
        });
      }

      const progress = summarizeApprovalSteps(approvalRows);
      const isContractManagerStage = progress.currentStage === 0
        && progress.currentApproverIds.includes(CONTRACT_MANAGER_APPROVER_ID);
      let actorName;
      if (isContractManagerStage) {
        const access = await checkDocumentApprovalAccess(request, prisma, {
          module: 'Contracting',
          toolName: 'Approve Work Order',
          projectId: existing.projectId,
          allowAnyProject: true,
        });
        if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
        actorName = access.session.type === 'admin'
          ? 'Administrator'
          : (await prisma.employee.findUnique({ where: { id: access.session.id }, select: { name: true } }))?.name || 'Employee';
      } else {
        if (!progress.currentApproverIds.includes(session.id)) {
          return NextResponse.json({ error: 'This work order is waiting for its assigned approvers.' }, { status: 403 });
        }
        const employee = session.type === 'employee'
          ? await prisma.employee.findUnique({ where: { id: session.id }, select: { name: true } })
          : null;
        actorName = employee?.name || 'Administrator';
      }

      if (approvalRows.length) {
        const approvedAt = new Date();
        const result = await prisma.$transaction(async tx => {
          await tx.$queryRaw`SELECT "id" FROM "WorkOrder" WHERE "id" = ${id} FOR UPDATE`;
          const currentOrder = await tx.workOrder.findUnique({
            where: { id },
            select: { status: true, scope: true },
          });
          if (!currentOrder || !['Draft', 'Pending Approval'].includes(currentOrder.status)) return null;
          const currentRows = await tx.documentApprovalStep.findMany({
            where: { documentType: PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER, documentId: id },
          });
          const currentProgress = summarizeApprovalSteps(currentRows);
          const currentIsContractManagerStage = currentProgress.currentStage === 0
            && currentProgress.currentApproverIds.includes(CONTRACT_MANAGER_APPROVER_ID);
          if (currentIsContractManagerStage !== isContractManagerStage) return null;
          const approverEmployeeId = currentIsContractManagerStage ? CONTRACT_MANAGER_APPROVER_ID : session.id;
          if (!currentProgress.currentApproverIds.includes(approverEmployeeId)) return null;
          const changed = await tx.documentApprovalStep.updateMany({
            where: {
              documentType: PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER,
              documentId: id,
              stage: currentProgress.currentStage,
              approverEmployeeId,
              status: 'PENDING',
            },
            data: { status: 'APPROVED', approvedAt },
          });
          if (changed.count !== 1) return null;

          const updatedRows = await tx.documentApprovalStep.findMany({
            where: { documentType: PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER, documentId: id },
          });
          const updatedProgress = summarizeApprovalSteps(updatedRows);
          const finalApproval = updatedProgress.complete;
          const nextStatus = finalApproval ? 'Approved' : 'Pending Approval';
          const currentScope = (() => { try { return currentOrder.scope ? JSON.parse(currentOrder.scope) : {}; } catch { return {}; } })();
          const audit = {
            ...(currentScope.audit || {}),
            approvedBy: finalApproval ? actorName : null,
            approvedAt: finalApproval ? approvedAt.toISOString() : null,
          };
          const updated = await tx.workOrder.update({
            where: { id },
            data: { status: nextStatus, scope: JSON.stringify({ ...currentScope, audit }) },
            include: { project: { select: { id: true, name: true } } },
          });
          await recordWorkOrderStatus(tx, {
            workOrderId: id,
            fromStatus: currentOrder.status,
            toStatus: nextStatus,
            actorName,
            note: currentIsContractManagerStage
              ? finalApproval
                ? 'Contract Manager approved the work order.'
                : 'Contract Manager approved the work order and forwarded it to the configured employee approval levels.'
              : finalApproval
                ? 'Work order approved after all configured approvals.'
                : `Level ${currentProgress.currentStage} approval recorded (${updatedProgress.approvedCount} of ${updatedProgress.totalApproverCount} total approvals complete).`,
          });
          return { updated, audit, approvalWorkflow: updatedProgress };
        });
        if (!result) return NextResponse.json({ error: 'This approval was already recorded. Refresh and try again.' }, { status: 409 });
        await recordDocumentAction(prisma, {
          entityType: 'WorkOrder',
          entityId: id,
          module: 'Contracting',
          action: result.approvalWorkflow.complete ? 'APPROVE' : 'APPROVAL_STAGE',
          actorName,
        });
        return NextResponse.json({ ...result.updated, ...result.audit, approvalWorkflow: result.approvalWorkflow });
      }
    }

    if (data.action === 'approve' || data.action === 'unapprove') {
      const access = await checkDocumentApprovalAccess(request, prisma, { module: 'Contracting', toolName: 'Approve Work Order', projectId: existing.projectId });
      if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
      if (data.action === 'approve' && existing.status !== 'Draft') return NextResponse.json({ error: 'Only draft work orders can be approved.' }, { status: 409 });
      if (data.action === 'unapprove' && existing.status !== 'Approved') return NextResponse.json({ error: 'Only approved work orders can be unapproved.' }, { status: 409 });
      const priorScope = (() => { try { return existing.scope ? JSON.parse(existing.scope) : {}; } catch { return {}; } })();
      if (data.action === 'unapprove' && (!priorScope.audit?.approvedAt || Date.now() - new Date(priorScope.audit.approvedAt).getTime() > 2 * 24 * 60 * 60 * 1000)) {
        return NextResponse.json({ error: 'Work order approval can only be removed within 2 days.' }, { status: 409 });
      }
      const actor = access.session.type === 'admin' ? 'Administrator' : (await prisma.employee.findUnique({ where: { id: access.session.id }, select: { name: true } }))?.name || 'Employee';
      const audit = { ...(priorScope.audit || {}), approvedBy: data.action === 'approve' ? actor : null, approvedAt: data.action === 'approve' ? new Date().toISOString() : null };
      const nextStatus = data.action === 'approve' ? 'Approved' : 'Draft';
      const updated = await prisma.$transaction(async tx => {
        const result = await tx.workOrder.update({ where: { id }, data: { status: nextStatus, scope: JSON.stringify({ ...priorScope, audit }) }, include: { project: { select: { id: true, name: true } } } });
        if (data.action === 'unapprove') {
          await tx.documentApprovalStep.updateMany({
            where: { documentType: PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER, documentId: id },
            data: { status: 'PENDING', approvedAt: null },
          });
        }
        await recordWorkOrderStatus(tx, {
          workOrderId: id,
          fromStatus: existing.status,
          toStatus: nextStatus,
          actorName: actor,
          note: data.action === 'approve' ? 'Work order approved' : 'Work order approval removed',
        });
        return result;
      });
      await recordDocumentAction(prisma, { entityType: 'WorkOrder', entityId: updated.id, module: 'Contracting', action: data.action === 'approve' ? 'APPROVE' : 'UNAPPROVE', actorName: actor });
      return NextResponse.json({ ...updated, ...audit, approvedBy: audit.approvedBy });
    }
    const currentAudit = (() => { try { return existing.scope ? JSON.parse(existing.scope)?.audit || {} : {}; } catch { return {}; } })();
    if (currentAudit.approvedAt) return NextResponse.json({ error: 'Unapprove this work order within 2 days before editing it.' }, { status: 409 });
    if (status === 'Approved') return NextResponse.json({ error: 'Use the approval action to approve a work order.' }, { status: 400 });
    const priorScope = (() => { try { return existing.scope ? JSON.parse(existing.scope) : {}; } catch { return {}; } })();
    const audit = { ...(priorScope.audit || {}) };

    const updateData = {};
    if (status) updateData.status = status;
    if (fields.contractorName) updateData.contractorName = fields.contractorName;
    if (fields.scope !== undefined || fields.preview !== undefined || fields.items !== undefined || fields.quotationTerms !== undefined) {
      updateData.scope = JSON.stringify({
        scope: fields.scope || null,
        preview: fields.preview || null,
        items: fields.items || [],
        quotationTerms: fields.quotationTerms || {},
        audit,
      });
    }
    if (fields.wbsTask !== undefined) updateData.wbsTask = fields.wbsTask;
    if (fields.paymentTerms !== undefined) updateData.paymentTerms = fields.paymentTerms;
    if (fields.endDate !== undefined) updateData.endDate = fields.endDate ? new Date(fields.endDate) : null;
    if (fields.woNo !== undefined) updateData.woNo = fields.woNo;
    if (fields.woDate !== undefined) updateData.startDate = fields.woDate ? new Date(fields.woDate) : null;
    if (fields.contractorPhone !== undefined) updateData.contractorPhone = fields.contractorPhone;
    if (fields.contractorGst !== undefined) updateData.contractorGst = fields.contractorGst;
    if (fields.contractorPan !== undefined) updateData.contractorPan = fields.contractorPan;
    if (fields.contractValue !== undefined) updateData.contractValue = Number(fields.contractValue) || 0;
    if (fields.advancePercent !== undefined) updateData.advancePercent = Number(fields.advancePercent) || 0;

    const updatedAmount = fields.contractValue !== undefined ? Number(fields.contractValue) || 0 : existing.contractValue;
    const approvalConfig = await getProcurementApprovalConfig(prisma);
    const approvalStages = getApplicableApprovalStages(approvalConfig, updatedAmount);
    const approvalStatus = 'Pending Approval';
    updateData.status = approvalStatus;
    if (fields.advancePercent !== undefined || fields.contractValue !== undefined) {
      updateData.advanceAmount = updatedAmount * (Number(updateData.advancePercent ?? existing.advancePercent) || 0) / 100;
    }

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.workOrder.update({
        where: { id },
        data: updateData,
        include: { project: { select: { id: true, name: true } } }
      });
      await replaceDocumentApprovalRows(
        tx,
        PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER,
        id,
        buildWorkOrderApprovalRows(approvalStages)
      );
      await recordWorkOrderStatus(tx, {
        workOrderId: id,
        fromStatus: existing.status,
        toStatus: approvalStatus,
        actorName: fields.editedBy || data.actorName || 'System',
        note: 'Work order edited and resubmitted to Contract Manager for approval.',
      });
      return result;
    });

    await recordDocumentEdit(prisma, {
      entityType: 'WorkOrder', entityId: updated.id, module: 'Contracting', editorName: fields.editedBy,
    });
    return NextResponse.json({ ...updated, ...audit, approvedBy: audit.approvedBy || null, editedBy: fields.editedBy || null });
  } catch (error) {
    console.error('Error updating work order:', error);
    if (error instanceof ProjectBudgetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const order = await prisma.workOrder.findUnique({ where: { id }, include: { raBills: { select: { id: true } } } });
    if (!order) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    if (!['Draft', 'Pending Approval'].includes(order.status)) return NextResponse.json({ error: 'Only unapproved work orders can be deleted.' }, { status: 409 });
    if (order.raBills.length) return NextResponse.json({ error: 'This work order has RA bills and cannot be deleted.' }, { status: 409 });
    const approvedSteps = await prisma.documentApprovalStep.count({
      where: { documentType: PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER, documentId: id, status: 'APPROVED' },
    });
    if (approvedSteps) return NextResponse.json({ error: 'This work order has already been approved at a stage and cannot be deleted.' }, { status: 409 });
    await prisma.$transaction(async tx => {
      await tx.documentApprovalStep.deleteMany({
        where: { documentType: PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER, documentId: id },
      });
      await tx.workOrder.delete({ where: { id } });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting work order:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete work order' }, { status: 500 });
  }
}
