export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addTaskMasterTask } from '@/lib/siteTaskMaster';
import { getDocumentActors, getDocumentEditors, recordDocumentAction, recordDocumentEdit } from '@/lib/documentAudit';
import { autoGrantCreatorProjectTools } from '@/lib/autoGrantCreatorTools';
import { checkDocumentApprovalAccess } from '@/lib/documentApprovalAccess';

function readScopeMetadata(scope) {
  try {
    const parsed = scope ? JSON.parse(scope) : {};
    return parsed?.audit && typeof parsed.audit === 'object' ? parsed.audit : {};
  } catch { return {}; }
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
        raBills: { select: { id: true, billNo: true, status: true, netPayable: true, date: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    const [editors, actors] = await Promise.all([
      getDocumentEditors(prisma, 'WorkOrder', workOrders.map(order => order.id)),
      getDocumentActors(prisma, 'WorkOrder', workOrders.map(order => order.id)),
    ]);
    return NextResponse.json(workOrders.map(order => ({ ...order, ...readScopeMetadata(order.scope), ...actors[order.id], ...editors[order.id] })));
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

    const workOrder = await prisma.workOrder.create({
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
          rate: item.rate
        });
      });
    }

    return NextResponse.json(workOrder, { status: 201 });
  } catch (error) {
    console.error('Error creating work order:', error);
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
    if (data.action === 'approve' || data.action === 'unapprove') {
      const access = await checkDocumentApprovalAccess(request, prisma, { module: 'Contracting', toolName: 'Approve Work Order', projectId: existing.projectId });
      if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
      if (data.action === 'approve' && existing.status !== 'Draft') return NextResponse.json({ error: 'Only draft work orders can be approved.' }, { status: 409 });
      if (data.action === 'unapprove' && existing.status !== 'Approved') return NextResponse.json({ error: 'Only approved work orders can be unapproved.' }, { status: 409 });
      const priorScope = (() => { try { return existing.scope ? JSON.parse(existing.scope) : {}; } catch { return {}; } })();
      const actor = access.session.type === 'admin' ? 'Administrator' : (await prisma.employee.findUnique({ where: { id: access.session.id }, select: { name: true } }))?.name || 'Employee';
      const audit = { ...(priorScope.audit || {}), approvedBy: data.action === 'approve' ? actor : null, approvedAt: data.action === 'approve' ? new Date().toISOString() : null };
      const updated = await prisma.workOrder.update({ where: { id }, data: { status: data.action === 'approve' ? 'Approved' : 'Draft', scope: JSON.stringify({ ...priorScope, audit }) }, include: { project: { select: { id: true, name: true } } } });
      await recordDocumentAction(prisma, { entityType: 'WorkOrder', entityId: updated.id, module: 'Contracting', action: data.action === 'approve' ? 'APPROVE' : 'UNAPPROVE', actorName: actor });
      return NextResponse.json({ ...updated, ...audit, approvedBy: audit.approvedBy });
    }
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

    const updated = await prisma.workOrder.update({
      where: { id },
      data: updateData,
      include: { project: { select: { id: true, name: true } } }
    });

    await recordDocumentEdit(prisma, {
      entityType: 'WorkOrder', entityId: updated.id, module: 'Contracting', editorName: fields.editedBy,
    });
    return NextResponse.json({ ...updated, ...audit, approvedBy: audit.approvedBy || null, editedBy: fields.editedBy || null });
  } catch (error) {
    console.error('Error updating work order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const order = await prisma.workOrder.findUnique({ where: { id }, include: { raBills: { select: { id: true } } } });
    if (!order) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    if (order.status !== 'Draft') return NextResponse.json({ error: 'Only draft work orders can be deleted.' }, { status: 409 });
    if (order.raBills.length) return NextResponse.json({ error: 'This work order has RA bills and cannot be deleted.' }, { status: 409 });
    await prisma.workOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting work order:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete work order' }, { status: 500 });
  }
}
