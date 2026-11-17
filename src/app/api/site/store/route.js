import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import { checkDocumentApprovalAccess } from '@/lib/documentApprovalAccess';

export const dynamic = 'force-dynamic';
const ISSUE_STATUSES = ['Issued', 'In Transit', 'Delivered', 'Received', 'Cancelled'];
const SITE_STORE_PERMISSION_TOOLS = {
  canAdd: 'Site Store Add',
  canEdit: 'Site Store Edit',
  canChangeStatus: 'Site Store Status Change',
};

function noSiteStorePermissions() {
  return { canAdd: false, canEdit: false, canChangeStatus: false };
}

function routeError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function clean(value) {
  return String(value || '').trim();
}

async function getSiteStoreAccessError(request, projectId, toolName) {
  const access = await checkDocumentApprovalAccess(request, prisma, {
    module: 'Site',
    toolName,
    projectId,
  });
  if (access.allowed) return null;
  return {
    status: access.status,
    error: access.status === 401
      ? 'Sign in to access Site Store.'
      : `You do not have ${toolName} permission for this project.`,
  };
}

async function getSiteStorePermissions(request, projectId) {
  if (!projectId) return noSiteStorePermissions();
  const permissions = await Promise.all(Object.entries(SITE_STORE_PERMISSION_TOOLS).map(async ([key, toolName]) => {
    const access = await checkDocumentApprovalAccess(request, prisma, {
      module: 'Site',
      toolName,
      projectId,
    });
    return [key, access.allowed];
  }));
  return Object.fromEntries(permissions);
}

async function syncApprovedReceipts() {
  const grns = await prisma.siteGRN.findMany({
    where: { status: { in: ['Received', 'Accepted', 'Approved', 'APPROVED'] } },
    include: { items: true, gtn: { include: { items: true } } }
  });
  const rows = [];
  const poNumbers = [...new Set(grns.map(grn => grn.poNo).filter(Boolean))];
  const bills = poNumbers.length ? await prisma.vendorBill.findMany({
    where: { poNo: { in: poNumbers } },
    select: { poNo: true, billNo: true },
    orderBy: { createdAt: 'desc' }
  }) : [];
  const billByPo = new Map();
  bills.forEach(bill => { if (!billByPo.has(bill.poNo)) billByPo.set(bill.poNo, bill.billNo); });

  for (const grn of grns) {
    for (const item of grn.items) {
      if (Number(item.acceptedQty) <= 0) continue;
      const gtnItem = grn.gtn?.items.find(candidate => candidate.requisitionId === item.requisitionId && candidate.materialName === item.materialName);
      const requiresCompletedTesting = item.testRequired === true;
      const testingApproved = gtnItem?.testStatus === 'Pass'
        || (grn.gtn && ['Completed', 'Approved', 'APPROVED'].includes(grn.gtn.status));
      if (requiresCompletedTesting && !testingApproved) continue;
      if (requiresCompletedTesting && gtnItem?.testStatus === 'Fail') continue;
      rows.push({
        projectId: grn.projectId,
        requisitionId: item.requisitionId,
        grnId: grn.id,
        grnItemId: item.id,
        gtnId: grn.gtnId || null,
        materialName: item.materialName,
        unit: item.unit,
        quantity: Number(item.acceptedQty),
        storeName: item.storeName,
        brand: item.brand,
        poNo: grn.poNo,
        purchaseBillNo: billByPo.get(grn.poNo) || null,
        sourceType: requiresCompletedTesting ? 'GTN' : 'GRN',
        status: 'AVAILABLE',
        receivedAt: grn.grnDate,
        remarks: item.remarks
      });
    }
  }
  if (rows.length) await prisma.siteStoreStock.createMany({ data: rows, skipDuplicates: true });
}

export async function GET(request) {
  try {
    await syncApprovedReceipts();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();
    const where = {
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
      quantity: { gt: 0 },
      ...(search ? { materialName: { contains: search, mode: 'insensitive' } } : {})
    };
    const [stock, issues] = await Promise.all([
      prisma.siteStoreStock.findMany({
      where,
      include: { project: { select: { id: true, projectId: true, name: true } } },
      orderBy: { receivedAt: 'desc' }
      }),
      prisma.siteStoreIssue.findMany({
        where: projectId ? { projectId } : {},
        include: {
          project: { select: { id: true, projectId: true, name: true } },
          items: { orderBy: { createdAt: 'asc' } },
          statusHistory: { orderBy: { changedAt: 'asc' } },
        },
        orderBy: { issueDate: 'desc' },
      }),
    ]);
    const permissionProjectIds = [...new Set([
      ...(projectId ? [projectId] : []),
      ...issues.map(issue => issue.projectId),
    ])];
    const permissionsByProjectId = Object.fromEntries(await Promise.all(
      permissionProjectIds.map(async id => [id, await getSiteStorePermissions(request, id)])
    ));
    const poNumbers = [...new Set(stock.map(item => item.poNo).filter(Boolean))];
    const bills = poNumbers.length ? await prisma.vendorBill.findMany({
      where: { poNo: { in: poNumbers } },
      select: { poNo: true, billNo: true },
      orderBy: { createdAt: 'desc' }
    }) : [];
    const billByPo = new Map();
    bills.forEach(bill => { if (!billByPo.has(bill.poNo)) billByPo.set(bill.poNo, bill.billNo); });
    const enriched = stock.map(item => ({ ...item, purchaseBillNo: item.purchaseBillNo || billByPo.get(item.poNo) || null }));
    return NextResponse.json({
      items: enriched,
      issues,
      permissions: projectId ? permissionsByProjectId[projectId] || noSiteStorePermissions() : noSiteStorePermissions(),
      permissionsByProjectId,
      totals: {
        lines: enriched.length,
        quantity: enriched.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching site store:', error);
    return NextResponse.json({ error: 'Failed to fetch site store' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const projectId = clean(body.projectId);
    if (!projectId) return NextResponse.json({ error: 'Select an engineering project before issuing material.' }, { status: 400 });
    const accessError = await getSiteStoreAccessError(request, projectId, SITE_STORE_PERMISSION_TOOLS.canAdd);
    if (accessError) return NextResponse.json({ error: accessError.error }, { status: accessError.status });
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Add at least one material line to the issue.' }, { status: 400 });
    }

    const requestedQuantities = new Map();
    for (const line of body.items) {
      const stockId = clean(line?.stockId);
      const quantity = Number(line?.quantity);
      if (!stockId || !Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json({ error: 'Each material line needs a stock item and a quantity greater than zero.' }, { status: 400 });
      }
      requestedQuantities.set(stockId, (requestedQuantities.get(stockId) || 0) + quantity);
    }

    const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();
    if (!Number.isFinite(issueDate.getTime())) {
      return NextResponse.json({ error: 'Enter a valid issue date and time.' }, { status: 400 });
    }

    const issue = await prisma.$transaction(async transaction => {
      const issueItems = [];
      for (const [stockId, quantity] of requestedQuantities.entries()) {
        const stock = await transaction.siteStoreStock.findUnique({ where: { id: stockId } });
        if (!stock || stock.projectId !== projectId) {
          throw routeError('A selected stock item does not belong to this project.', 404);
        }
        if (stock.status !== 'AVAILABLE' || Number(stock.quantity) < quantity) {
          throw routeError(`Insufficient available quantity for ${stock.materialName}.`, 409);
        }

        const updated = await transaction.siteStoreStock.updateMany({
          where: { id: stockId, projectId, status: 'AVAILABLE', quantity: { gte: quantity } },
          data: { quantity: { decrement: quantity } },
        });
        if (updated.count !== 1) {
          throw routeError(`Stock changed while issuing ${stock.materialName}. Refresh and try again.`, 409);
        }
        issueItems.push({
          stockId,
          materialName: stock.materialName,
          unit: stock.unit,
          quantity,
        });
      }

      return transaction.siteStoreIssue.create({
        data: {
          issueNo: `SIS-${randomUUID().slice(0, 8).toUpperCase()}`,
          projectId,
          issueDate,
          status: 'Issued',
          vehicleNo: clean(body.vehicleNo) || null,
          workOrderNo: clean(body.workOrderNo) || null,
          purchaseOrderNo: clean(body.purchaseOrderNo) || null,
          purchaseBillNo: clean(body.purchaseBillNo) || null,
          ewayBillNo: clean(body.ewayBillNo) || null,
          challanNo: clean(body.challanNo) || null,
          remarks: clean(body.remarks) || null,
          issuedBy: clean(body.issuedBy) || null,
          items: { create: issueItems },
          statusHistory: {
            create: {
              toStatus: 'Issued',
              actorName: clean(body.issuedBy) || null,
              note: 'Issue created',
            },
          },
        },
        include: {
          project: { select: { id: true, projectId: true, name: true } },
          items: { orderBy: { createdAt: 'asc' } },
          statusHistory: { orderBy: { changedAt: 'asc' } },
        },
      });
    });

    return NextResponse.json({ issue }, { status: 201 });
  } catch (error) {
    console.error('Error issuing site store material:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to issue site store material' },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const action = clean(body.action || 'status');
    const issueId = clean(body.issueId);
    if (!issueId) return NextResponse.json({ error: 'issueId is required.' }, { status: 400 });
    const existingIssue = await prisma.siteStoreIssue.findUnique({
      where: { id: issueId },
      select: { projectId: true, status: true },
    });
    if (!existingIssue) return NextResponse.json({ error: 'Site store issue not found.' }, { status: 404 });

    if (action === 'edit') {
      const accessError = await getSiteStoreAccessError(request, existingIssue.projectId, SITE_STORE_PERMISSION_TOOLS.canEdit);
      if (accessError) return NextResponse.json({ error: accessError.error }, { status: accessError.status });
      if (existingIssue.status === 'Cancelled') {
        return NextResponse.json({ error: 'Cancelled issues cannot be edited.' }, { status: 409 });
      }
      const issueDate = body.issueDate ? new Date(body.issueDate) : undefined;
      if (issueDate && !Number.isFinite(issueDate.getTime())) {
        return NextResponse.json({ error: 'Enter a valid issue date and time.' }, { status: 400 });
      }
      const issue = await prisma.siteStoreIssue.update({
        where: { id: issueId },
        data: {
          issueDate,
          vehicleNo: clean(body.vehicleNo) || null,
          workOrderNo: clean(body.workOrderNo) || null,
          purchaseOrderNo: clean(body.purchaseOrderNo) || null,
          purchaseBillNo: clean(body.purchaseBillNo) || null,
          ewayBillNo: clean(body.ewayBillNo) || null,
          challanNo: clean(body.challanNo) || null,
          remarks: clean(body.remarks) || null,
        },
        include: {
          project: { select: { id: true, projectId: true, name: true } },
          items: { orderBy: { createdAt: 'asc' } },
          statusHistory: { orderBy: { changedAt: 'asc' } },
        },
      });
      return NextResponse.json({ issue });
    }

    if (action !== 'status') {
      return NextResponse.json({ error: 'Action must be edit or status.' }, { status: 400 });
    }
    const status = clean(body.status);
    if (!ISSUE_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Status must be one of: ${ISSUE_STATUSES.join(', ')}.` }, { status: 400 });
    }
    const accessError = await getSiteStoreAccessError(request, existingIssue.projectId, SITE_STORE_PERMISSION_TOOLS.canChangeStatus);
    if (accessError) return NextResponse.json({ error: accessError.error }, { status: accessError.status });

    const issue = await prisma.$transaction(async transaction => {
      const existing = await transaction.siteStoreIssue.findUnique({
        where: { id: issueId },
        include: {
          items: true,
          statusHistory: { orderBy: { changedAt: 'asc' } },
        },
      });
      if (!existing) throw routeError('Site store issue not found.', 404);
      if (existing.status === 'Cancelled' && status !== 'Cancelled') {
        throw routeError('A cancelled issue cannot be reopened.', 409);
      }
      if (existing.status === status) return existing;

      const transitioned = await transaction.siteStoreIssue.updateMany({
        where: { id: issueId, status: existing.status },
        data: { status, updatedAt: new Date() },
      });
      if (transitioned.count !== 1) {
        throw routeError('Issue status changed in another request. Refresh and try again.', 409);
      }

      await transaction.siteStoreIssueStatusHistory.create({
        data: {
          issueId,
          fromStatus: existing.status,
          toStatus: status,
          actorName: clean(body.actorName) || null,
          note: `Status changed from ${existing.status} to ${status}`,
        },
      });

      if (status === 'Cancelled') {
        for (const item of existing.items) {
          await transaction.siteStoreStock.update({
            where: { id: item.stockId },
            data: { quantity: { increment: item.quantity }, status: 'AVAILABLE' },
          });
        }
      }

      return transaction.siteStoreIssue.findUnique({
        where: { id: issueId },
        include: {
          project: { select: { id: true, projectId: true, name: true } },
          items: { orderBy: { createdAt: 'asc' } },
          statusHistory: { orderBy: { changedAt: 'asc' } },
        },
      });
    });
    return NextResponse.json({ issue });
  } catch (error) {
    console.error('Error updating site store issue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update site store issue' },
      { status: error.status || 500 }
    );
  }
}
