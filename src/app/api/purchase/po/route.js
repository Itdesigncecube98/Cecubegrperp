export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDocumentEditors, recordDocumentEdit } from '@/lib/documentAudit';
import { autoGrantCreatorProjectTools } from '@/lib/autoGrantCreatorTools';
import { checkDocumentApprovalAccess } from '@/lib/documentApprovalAccess';
import { recordDocumentAction } from '@/lib/documentAudit';
import { readAuthSession } from '@/lib/authSession';
import {
  addPurchaseManagerApprovalRow,
  buildPendingApprovalRows,
  buildPurchaseOrderApprovalRows,
  getApplicableApprovalStages,
  getProcurementApprovalConfig,
  replaceDocumentApprovalRows,
  summarizeApprovalSteps,
  PROCUREMENT_DOCUMENT_TYPES,
  PURCHASE_MANAGER_APPROVER_ID,
} from '@/lib/procurementApprovalWorkflow';

async function getVendorFallback(vendorId) {
  if (!vendorId) return null;
  return prisma.vendorMaster.findUnique({ where: { id: vendorId } });
}

async function getProjectLocation(projectId, projectName) {
  const project = projectId
    ? await prisma.projectMaster.findUnique({ where: { id: projectId } })
    : projectName
      ? await prisma.projectMaster.findFirst({ where: { name: projectName } })
      : null;
  if (project?.location) return project.location;
  const legacyProject = projectName
    ? await prisma.project.findFirst({ where: { name: projectName }, select: { state: true } })
    : null;
  return legacyProject?.state || '';
}

function normalizeMaterialName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const id = searchParams.get('id');

    const where = {};
    const VALID_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED'];
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }
    if (id) where.id = id;

    // PurchaseOrder only has items[] and grns[] as relations
    // Supplier info is stored as flat fields: supplierName, supplierAddress, etc.
    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        items: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
        grns: {
          select: {
            id: true,
            grnNumber: true,   // field is grnNumber, not grnNo
            status: true,
            items: {
              select: {
                poItemId: true,
                receivedQty: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const libraryItems = await prisma.materialLibraryItem.findMany({
      where: { resourceType: 'Material' },
      select: {
        name: true,
        group: { select: { libraryId: true, library: { select: { name: true } } } }
      }
    });
    const libraryMatches = libraryItems.map(item => ({
      key: normalizeMaterialName(item.name),
      name: item.group?.library?.name || '',
      libraryId: item.group?.libraryId || null
    })).filter(item => item.key && item.name);
    const [editors, approvalRows, approvalConfig] = await Promise.all([
      getDocumentEditors(prisma, 'PurchaseOrder', pos.map(po => po.id)),
      prisma.documentApprovalStep.findMany({
        where: { documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER, documentId: { in: pos.map(po => po.id) } },
        select: { documentId: true, stage: true, approverEmployeeId: true, status: true },
      }),
      getProcurementApprovalConfig(prisma),
    ]);
    const approvalRowsByPo = new Map();
    approvalRows.forEach(row => {
      const rows = approvalRowsByPo.get(row.documentId) || [];
      rows.push(row);
      approvalRowsByPo.set(row.documentId, rows);
    });

    const resolveMaterialLibrary = description => {
      const key = normalizeMaterialName(description);
      if (!key) return null;
      return libraryMatches.find(item => item.key === key)
        || libraryMatches.find(item => item.key.includes(key) || key.includes(item.key))
        || null;
    };

    const enriched = await Promise.all(pos.map(async po => {
      const vendor = await getVendorFallback(po.supplierId);
      const projectLocation = await getProjectLocation(po.projectId, po.projectName);
      let remarkData = {};
      try {
        const parsed = po.remarks ? JSON.parse(po.remarks) : {};
        remarkData = parsed && typeof parsed === 'object' ? parsed : {};
        if (typeof remarkData.remarks === 'string') {
          const nested = JSON.parse(remarkData.remarks);
          if (nested && typeof nested === 'object') remarkData = { ...remarkData, ...nested };
        }
      } catch (error) {
        remarkData = {};
      }
      const resolvedItems = (po.items || []).map(item => ({
        ...item,
        materialLibrary: resolveMaterialLibrary(item.description)
      }));
      const poLibrary = resolvedItems.find(item => item.materialLibrary)?.materialLibrary || null;
      const savedApprovalRows = approvalRowsByPo.get(po.id) || [];
      let approvalRowsForPo = savedApprovalRows.length
        ? savedApprovalRows
        : buildPendingApprovalRows(getApplicableApprovalStages(approvalConfig, po.totalAmount));
      if (['DRAFT', 'PENDING_APPROVAL'].includes(po.status)) {
        approvalRowsForPo = addPurchaseManagerApprovalRow(approvalRowsForPo);
      }
      return {
        ...po,
        ...editors[po.id],
        approvalWorkflow: summarizeApprovalSteps(approvalRowsForPo),
        items: resolvedItems.map(item => ({
          ...item,
          materialLibrary: item.materialLibrary || poLibrary
        })),
        supplierContact: po.supplierContact || vendor?.contactPerson || null,
        supplierPhone: po.supplierPhone || vendor?.whatsappNo || vendor?.mobile || null,
        supplierEmail: po.supplierEmail || vendor?.email || null,
        supplierGstin: po.supplierGstin || vendor?.gstin || vendor?.gstNo || null,
        supplierPan: po.supplierPan || vendor?.pan || vendor?.panNumber || null,
        supplierAddress: po.supplierAddress || vendor?.address || '',
        deliveryAddress: po.deliveryAddress || projectLocation,
        deliveryContact: po.deliveryContact || remarkData.siteContactPerson || null,
        deliveryPhone: po.deliveryPhone || remarkData.siteContactDetail || null
      };
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching POs:', error);
    return NextResponse.json({ error: 'Failed to fetch POs' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const vendor = await getVendorFallback(body.supplierId);
    const projectLocation = await getProjectLocation(body.projectId, body.projectName);

    // Generate PO number
    const count = await prisma.purchaseOrder.count();
    const poNumber = body.poNumber || `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // PurchaseOrder schema uses: supplierName, supplierAddress, supplierContact,
    // supplierPhone, supplierEmail, supplierGstin, supplierPan, supplierId (optional)
    // Financial: subTotal, cgstAmount, sgstAmount, igstAmount, totalTaxAmount, totalAmount
    // Workflow: companyId, projectId, projectName, preparedBy, preparedByName, approvedBy, approvedByName
    // Relations: items[], grns[]

    const items = body.items || [];
    let subTotal = 0;
    items.forEach(item => {
      subTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
    });

    const cgstAmount = parseFloat(body.cgstAmount) || 0;
    const sgstAmount = parseFloat(body.sgstAmount) || 0;
    const igstAmount = parseFloat(body.igstAmount) || 0;
    const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;

    const discount = parseFloat(body.discount) || 0;
    const freight = parseFloat(body.freight) || 0;
    const otherCharges = parseFloat(body.otherCharges) || 0;
    const totalAmount = subTotal - discount + totalTaxAmount + freight + otherCharges;
    
    const extraData = {
      discount,
      freight,
      otherCharges,
      remarks: body.remarks || ''
    };

    let po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        poDate: body.poDate ? new Date(body.poDate) : new Date(),
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
        status: 'DRAFT',

        // Supplier info (flat fields — no vendor relation on this model)
        supplierId: body.supplierId || null,
        supplierName: body.supplierName || '',
        supplierAddress: body.supplierAddress || vendor?.address || '',
        supplierContact: body.supplierContact || vendor?.contactPerson || null,
        supplierPhone: body.supplierPhone || vendor?.whatsappNo || vendor?.mobile || null,
        supplierEmail: body.supplierEmail || vendor?.email || null,
        supplierGstin: body.supplierGstin || vendor?.gstin || vendor?.gstNo || null,
        supplierPan: body.supplierPan || vendor?.pan || vendor?.panNumber || null,

        // Delivery
        deliveryAddress: body.deliveryAddress || projectLocation,
        deliveryContact: body.deliveryContact || null,
        deliveryPhone: body.deliveryPhone || null,

        // Financials
        subTotal,
        cgstPercent: parseFloat(body.cgstPercent) || 0,
        cgstAmount,
        sgstPercent: parseFloat(body.sgstPercent) || 0,
        sgstAmount,
        igstPercent: parseFloat(body.igstPercent) || 0,
        igstAmount,
        totalTaxAmount,
        roundOff: parseFloat(body.roundOff) || 0,
        totalAmount,
        totalAmountWords: body.totalAmountWords || null,

        // Terms
        paymentTerms: body.paymentTerms || null,
        scopeOfWork: body.scopeOfWork || null,
        deliverySchedule: body.deliverySchedule || null,
        otherTerms: body.otherTerms || null,

        // Workflow
        companyId: body.companyId || '',
        projectId: body.projectId || null,
        projectName: body.projectName || null,
        preparedBy: body.preparedBy || null,
        preparedByName: body.preparedByName || 'Purchase Manager',
        approvedBy: body.approvedBy || null,
        approvedByName: body.approvedByName || 'Director',
        remarks: JSON.stringify(extraData),

        items: {
          create: items.map((item, idx) => ({
            sNo: item.sNo || idx + 1,
            description: item.description || item.item || '',
            hsnCode: item.hsnCode || null,
            quantity: parseFloat(item.quantity) || 0,
            unit: item.unit || 'Nos',
            rate: parseFloat(item.rate) || 0,
            discountPercent: parseFloat(item.discountPercent) || 0,
            taxableAmount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0),
            gstPercent: parseFloat(item.gstPercent) || 0,
            gstAmount: ((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)) * ((parseFloat(item.gstPercent) || 0) / 100),
            totalAmount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0) * (1 + (parseFloat(item.gstPercent) || 0) / 100),
            pendingQty: parseFloat(item.quantity) || 0,
            specifications: item.specifications || item.specification || null,
            remarks: item.remarks || null,
          }))
        }
      },
      include: {
        items: true,
        grns: true
      }
    });

    await prisma.purchaseOrderStatusHistory.create({
      data: {
        purchaseOrderId: po.id,
        toStatus: 'DRAFT',
        actorName: body.preparedByName || body.preparedBy || body.createdBy || 'Purchase Manager',
        note: 'Purchase order drafted',
      },
    });

    const approvalConfig = await getProcurementApprovalConfig(prisma);
    const approvalStages = getApplicableApprovalStages(approvalConfig, totalAmount);
    po = await prisma.$transaction(async tx => {
      await replaceDocumentApprovalRows(
        tx,
        PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER,
        po.id,
        buildPurchaseOrderApprovalRows(approvalStages)
      );
      const updated = await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'PENDING_APPROVAL', approvedBy: null, approvedByName: '', approvedAt: null },
        include: { items: true, grns: true },
      });
      await tx.purchaseOrderStatusHistory.create({
        data: {
          purchaseOrderId: po.id,
          fromStatus: 'DRAFT',
          toStatus: 'PENDING_APPROVAL',
          actorName: body.preparedByName || body.preparedBy || body.createdBy || 'Purchase Manager',
          note: 'Submitted to Purchase Manager for approval.',
        },
      });
      return updated;
    });

    await autoGrantCreatorProjectTools(prisma, req, {
      requestedEmployeeId: body.createdById,
      projectId: body.projectId,
      projectName: body.projectName || body.project,
      module: 'Purchase',
      toolNames: ['Purchase Orders Create', 'Purchase Orders View', 'Purchase Orders Edit', 'Purchase Orders Delete'],
    });

    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    console.error('Error creating PO:', error);
    return NextResponse.json({ error: error.message || 'Failed to create PO' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, action, status } = body;
    if (!id) return NextResponse.json({ error: 'PO id is required' }, { status: 400 });

    const VALID_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED'];

    if (!action && !status) {
      const existingForEdit = await prisma.purchaseOrder.findUnique({ where: { id }, select: { id: true, status: true, approvedAt: true } });
      if (!existingForEdit) return NextResponse.json({ error: 'Purchase order not found.' }, { status: 404 });
      if (existingForEdit.approvedAt) return NextResponse.json({ error: 'Unapprove this purchase order within 2 days before editing it.' }, { status: 409 });
      const vendor = await getVendorFallback(body.supplierId);
      const projectLocation = await getProjectLocation(body.projectId, body.projectName);
      const items = body.items || [];
      const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0);
      const cgstAmount = parseFloat(body.cgstAmount) || 0;
      const sgstAmount = parseFloat(body.sgstAmount) || 0;
      const igstAmount = parseFloat(body.igstAmount) || 0;
      const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;
      
      const discount = parseFloat(body.discount) || 0;
      const freight = parseFloat(body.freight) || 0;
      const otherCharges = parseFloat(body.otherCharges) || 0;
      
      const extraData = {
        discount,
        freight,
        otherCharges,
        remarks: body.remarks || ''
      };
      const editedTotalAmount = subTotal - discount + totalTaxAmount + freight + otherCharges;
      const approvalConfig = await getProcurementApprovalConfig(prisma);
      const approvalStages = getApplicableApprovalStages(approvalConfig, editedTotalAmount);
      
      const updated = await prisma.$transaction(async tx => {
        await tx.purchaseOrderItem.deleteMany({ where: { poId: id } });
        const saved = await tx.purchaseOrder.update({
          where: { id },
          data: {
            poDate: body.poDate ? new Date(body.poDate) : undefined,
            status: 'PENDING_APPROVAL',
            approvedBy: null,
            approvedByName: '',
            approvedAt: null,
            deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
            supplierId: body.supplierId || null,
            supplierName: body.supplierName || vendor?.name || '', supplierAddress: body.supplierAddress || vendor?.address || '',
            supplierContact: body.supplierContact || vendor?.contactPerson || null, supplierPhone: body.supplierPhone || vendor?.whatsappNo || vendor?.mobile || null,
            supplierEmail: body.supplierEmail || vendor?.email || null, supplierGstin: body.supplierGstin || vendor?.gstin || vendor?.gstNo || null,
            supplierPan: body.supplierPan || vendor?.pan || vendor?.panNumber || null, projectName: body.projectName || null, deliveryAddress: body.deliveryAddress || projectLocation,
            paymentTerms: body.paymentTerms || null, scopeOfWork: body.scopeOfWork || null,
            deliverySchedule: body.deliverySchedule || null, otherTerms: body.otherTerms || null,
            subTotal, totalTaxAmount, totalAmount: editedTotalAmount,
            remarks: JSON.stringify(extraData),
            roundOff: parseFloat(body.roundOff) || 0, totalAmountWords: body.totalAmountWords || null,
            items: { create: items.map((item, index) => ({
              sNo: item.sNo || index + 1, description: item.description || item.item || '',
              hsnCode: item.hsnCode || null,
              quantity: parseFloat(item.quantity) || 0, unit: item.unit || 'Nos', rate: parseFloat(item.rate) || 0,
              discountPercent: parseFloat(item.discountPercent || item.itemDiscount) || 0,
              taxableAmount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0),
              gstPercent: parseFloat(item.gstPercent) || 0,
              gstAmount: ((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)) * ((parseFloat(item.gstPercent) || 0) / 100),
              totalAmount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0) * (1 + (parseFloat(item.gstPercent) || 0) / 100),
              pendingQty: parseFloat(item.quantity) || 0,
              specifications: item.specifications || item.specification || null,
            })) }
          }, include: { items: true }
        });
        await replaceDocumentApprovalRows(
          tx,
          PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER,
          id,
          buildPurchaseOrderApprovalRows(approvalStages)
        );
        await tx.purchaseOrderStatusHistory.create({
          data: {
            purchaseOrderId: id,
            fromStatus: existingForEdit.status,
            toStatus: 'PENDING_APPROVAL',
            actorName: body.editedBy || 'System',
            note: 'Purchase order edited and resubmitted to Purchase Manager for approval.',
          },
        });
        return saved;
      });
      await recordDocumentEdit(prisma, {
        entityType: 'PurchaseOrder', entityId: updated.id, module: 'Purchase', editorName: body.editedBy,
      });
      return NextResponse.json(updated);
    }

    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Purchase order not found.' }, { status: 404 });
    if (action === 'approve') {
      const session = readAuthSession(req);
      if (!session) return NextResponse.json({ error: 'Sign in to approve this purchase order.' }, { status: 401 });
      if (!['DRAFT', 'PENDING_APPROVAL'].includes(existing.status)) {
        return NextResponse.json({ error: 'This purchase order is no longer awaiting approval.' }, { status: 409 });
      }

      let approvalRows = await prisma.documentApprovalStep.findMany({
        where: { documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER, documentId: id },
      });
      if (!approvalRows.some(row => row.stage === 0 && row.approverEmployeeId === PURCHASE_MANAGER_APPROVER_ID)) {
        const managerAccess = await checkDocumentApprovalAccess(req, prisma, {
          module: 'Purchase',
          toolName: 'Purchase Orders Approve',
          projectId: existing.projectId,
          projectName: existing.projectName,
        });
        if (!managerAccess.allowed) return NextResponse.json({ error: managerAccess.error }, { status: managerAccess.status });
        const approvalConfig = await getProcurementApprovalConfig(prisma);
        const stages = getApplicableApprovalStages(approvalConfig, existing.totalAmount);
        await prisma.$transaction(async tx => {
          await tx.$queryRaw`SELECT "id" FROM "PurchaseOrder" WHERE "id" = ${id} FOR UPDATE`;
          const currentRows = await tx.documentApprovalStep.findMany({
            where: { documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER, documentId: id },
          });
          if (!currentRows.some(row => row.stage === 0 && row.approverEmployeeId === PURCHASE_MANAGER_APPROVER_ID)) {
            if (currentRows.length) {
              await tx.documentApprovalStep.updateMany({
                where: { documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER, documentId: id },
                data: { status: 'PENDING', approvedAt: null },
              });
              await tx.documentApprovalStep.createMany({
                data: [{
                  ...buildPurchaseOrderApprovalRows([])[0],
                  documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER,
                  documentId: id,
                }],
                skipDuplicates: true,
              });
            } else {
              await replaceDocumentApprovalRows(
                tx,
                PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER,
                id,
                buildPurchaseOrderApprovalRows(stages)
              );
            }
            if (existing.status !== 'PENDING_APPROVAL') {
              await tx.purchaseOrder.update({ where: { id }, data: { status: 'PENDING_APPROVAL' } });
            }
            await tx.purchaseOrderStatusHistory.create({
              data: {
                purchaseOrderId: id,
                fromStatus: existing.status,
                toStatus: 'PENDING_APPROVAL',
                note: 'Submitted to Purchase Manager for approval.',
              },
            });
          }
        });
        approvalRows = await prisma.documentApprovalStep.findMany({
          where: { documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER, documentId: id },
        });
      }

      const progress = summarizeApprovalSteps(approvalRows);
      const isPurchaseManagerStage = progress.currentStage === 0
        && progress.currentApproverIds.includes(PURCHASE_MANAGER_APPROVER_ID);
      let actorName;
      if (isPurchaseManagerStage) {
        const access = await checkDocumentApprovalAccess(req, prisma, {
          module: 'Purchase',
          toolName: 'Purchase Orders Approve',
          projectId: existing.projectId,
          projectName: existing.projectName,
        });
        if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
        actorName = access.session.type === 'admin'
          ? 'Administrator'
          : (await prisma.employee.findUnique({ where: { id: access.session.id }, select: { name: true } }))?.name || 'Employee';
      } else {
        if (!progress.currentApproverIds.includes(session.id)) {
          return NextResponse.json({ error: 'This purchase order is waiting for its assigned approvers.' }, { status: 403 });
        }
        const employee = session.type === 'employee'
          ? await prisma.employee.findUnique({ where: { id: session.id }, select: { name: true } })
          : null;
        actorName = employee?.name || 'Administrator';
      }

      if (approvalRows.length) {
        const approvedAt = new Date();
        const result = await prisma.$transaction(async tx => {
          await tx.$queryRaw`SELECT "id" FROM "PurchaseOrder" WHERE "id" = ${id} FOR UPDATE`;
          const currentOrder = await tx.purchaseOrder.findUnique({
            where: { id },
            select: { status: true },
          });
          if (!currentOrder || !['DRAFT', 'PENDING_APPROVAL'].includes(currentOrder.status)) return null;
          const currentRows = await tx.documentApprovalStep.findMany({
            where: { documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER, documentId: id },
          });
          const currentProgress = summarizeApprovalSteps(currentRows);
          const currentIsManagerStage = currentProgress.currentStage === 0
            && currentProgress.currentApproverIds.includes(PURCHASE_MANAGER_APPROVER_ID);
          if (currentIsManagerStage !== isPurchaseManagerStage) return null;
          const approverEmployeeId = currentIsManagerStage ? PURCHASE_MANAGER_APPROVER_ID : session.id;
          if (!currentProgress.currentApproverIds.includes(approverEmployeeId)) return null;
          const changed = await tx.documentApprovalStep.updateMany({
            where: {
              documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER,
              documentId: id,
              stage: currentProgress.currentStage,
              approverEmployeeId,
              status: 'PENDING',
            },
            data: { status: 'APPROVED', approvedAt },
          });
          if (changed.count !== 1) return null;

          const updatedRows = await tx.documentApprovalStep.findMany({
            where: { documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER, documentId: id },
          });
          const updatedProgress = summarizeApprovalSteps(updatedRows);
          const finalApproval = updatedProgress.complete;
          const nextStatus = finalApproval ? 'APPROVED' : 'PENDING_APPROVAL';
          await tx.purchaseOrder.update({
            where: { id },
            data: {
              status: nextStatus,
              approvedAt: finalApproval ? approvedAt : null,
              approvedBy: finalApproval ? actorName : null,
              approvedByName: finalApproval ? actorName : '',
            },
            include: { items: true },
          });
          await tx.purchaseOrderStatusHistory.create({
            data: {
              purchaseOrderId: id,
              fromStatus: currentOrder.status,
              toStatus: nextStatus,
              actorName,
              note: currentIsManagerStage
                ? finalApproval
                  ? 'Purchase Manager approved the purchase order.'
                  : 'Purchase Manager approved the purchase order and forwarded it to the configured employee approval levels.'
                : finalApproval
                  ? 'Purchase order approved after all configured approvals.'
                  : `Level ${currentProgress.currentStage} approval recorded (${updatedProgress.approvedCount} of ${updatedProgress.totalApproverCount} total approvals complete).`,
            },
          });
          const updated = await tx.purchaseOrder.findUnique({
            where: { id },
            include: { items: true, statusHistory: { orderBy: { changedAt: 'asc' } } },
          });
          return { updated, approvalWorkflow: updatedProgress };
        });
        if (!result) return NextResponse.json({ error: 'This approval was already recorded. Refresh and try again.' }, { status: 409 });
        await recordDocumentAction(prisma, {
          entityType: 'PurchaseOrder',
          entityId: id,
          module: 'Purchase',
          action: result.approvalWorkflow.complete ? 'APPROVE' : 'APPROVAL_STAGE',
          actorName,
        });
        return NextResponse.json({ ...result.updated, approvalWorkflow: result.approvalWorkflow });
      }
    }

    if (action === 'approve' || action === 'unapprove' || status === 'APPROVED') {
      const access = await checkDocumentApprovalAccess(req, prisma, { module: 'Purchase', toolName: 'Purchase Orders Approve', projectId: existing.projectId, projectName: existing.projectName });
      if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
      body.approvalActor = access.session.type === 'admin' ? 'Administrator' : (await prisma.employee.findUnique({ where: { id: access.session.id }, select: { name: true } }))?.name || 'Employee';
    }
    if (action === 'approve' && !['DRAFT', 'PENDING_APPROVAL'].includes(existing.status)) return NextResponse.json({ error: 'Only draft or pending purchase orders can be approved.' }, { status: 409 });
    if (action === 'unapprove' && existing.status !== 'APPROVED') return NextResponse.json({ error: 'Only approved purchase orders can be unapproved.' }, { status: 409 });
    if (action === 'unapprove' && (!existing.approvedAt || Date.now() - new Date(existing.approvedAt).getTime() > 2 * 24 * 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Purchase order approval can only be removed within 2 days.' }, { status: 409 });
    }
    if (action === 'unapprove') {
      const [grnCount, bill] = await Promise.all([
        prisma.goodsReceiptNote.count({ where: { poId: existing.id } }).catch(() => 0),
        prisma.vendorBill.findFirst({ where: { poNo: existing.poNumber }, select: { id: true } }),
      ]);
      if (grnCount || bill) return NextResponse.json({ error: 'This PO has a GRN or purchase bill, so its approval cannot be removed.' }, { status: 409 });
    }
    if (status === 'APPROVED' && action !== 'approve') return NextResponse.json({ error: 'Use the approve action to approve a purchase order.' }, { status: 400 });

    let newStatus;
    if (action === 'approve') newStatus = 'APPROVED';
    else if (action === 'unapprove') newStatus = 'PENDING_APPROVAL';
    else if (action === 'submit') newStatus = 'PENDING_APPROVAL';
    else if (action === 'reject') newStatus = 'CANCELLED';
    else if (status && VALID_STATUSES.includes(status)) newStatus = status;
    else return NextResponse.json({ error: 'Invalid action or status' }, { status: 400 });

    const updateData = { status: newStatus };
    if (action === 'approve') {
      updateData.approvedBy = body.approvalActor;
      updateData.approvedByName = body.approvalActor;
      updateData.approvedAt = new Date();
    } else if (action === 'unapprove') {
      updateData.approvedBy = null;
      updateData.approvedByName = '';
      updateData.approvedAt = null;
    }
    const po = await prisma.$transaction(async tx => {
      await tx.purchaseOrder.update({
        where: { id },
        data: updateData,
      });
      if (action === 'unapprove') {
        await tx.documentApprovalStep.updateMany({
          where: { documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER, documentId: id },
          data: { status: 'PENDING', approvedAt: null },
        });
      }
      if (existing.status !== newStatus) {
        const actorName = body.approvalActor || body.editedBy || body.actorName || 'System';
        const actionNotes = {
          approve: 'Purchase order approved',
          unapprove: 'Approval removed',
          submit: 'Purchase order submitted for approval',
          reject: body.remarks || 'Purchase order rejected',
        };
        await tx.purchaseOrderStatusHistory.create({
          data: {
            purchaseOrderId: id,
            fromStatus: existing.status,
            toStatus: newStatus,
            actorName,
            note: actionNotes[action] || 'Purchase order status updated',
          },
        });
      }
      const updated = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true, statusHistory: { orderBy: { changedAt: 'asc' } } },
      });
      if (action === 'unapprove') {
        const approvalRows = await tx.documentApprovalStep.findMany({
          where: { documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER, documentId: id },
        });
        return { ...updated, approvalWorkflow: summarizeApprovalSteps(approvalRows) };
      }
      return updated;
    });

    if (action === 'approve' || action === 'unapprove') await recordDocumentAction(prisma, { entityType: 'PurchaseOrder', entityId: po.id, module: 'Purchase', action: action === 'approve' ? 'APPROVE' : 'UNAPPROVE', actorName: body.approvalActor });

    return NextResponse.json(po);
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to update purchase order' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'PO id is required' }, { status: 400 });
    const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { grns: { select: { id: true } } } });
    if (!po) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(po.status)) return NextResponse.json({ error: 'Only unapproved purchase orders can be deleted.' }, { status: 409 });
    if (po.grns?.length) return NextResponse.json({ error: 'This purchase order has GRN records and cannot be deleted.' }, { status: 409 });
    const approvedSteps = await prisma.documentApprovalStep.count({
      where: { documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER, documentId: id, status: 'APPROVED' },
    });
    if (approvedSteps) return NextResponse.json({ error: 'This purchase order has already been approved at a stage and cannot be deleted.' }, { status: 409 });
    await prisma.$transaction(async tx => {
      await tx.documentApprovalStep.deleteMany({
        where: { documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER, documentId: id },
      });
      await tx.purchaseOrderItem.deleteMany({ where: { poId: id } });
      await tx.purchaseOrder.delete({ where: { id } });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete purchase order' }, { status: 500 });
  }
}
