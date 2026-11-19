import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import {
  addContractManagerApprovalRow,
  addPurchaseManagerApprovalRow,
  buildPendingApprovalRows,
  getApplicableApprovalStages,
  getProcurementApprovalConfig,
  summarizeApprovalSteps,
  PROCUREMENT_DOCUMENT_TYPES,
  PURCHASE_MANAGER_APPROVER_ID,
  CONTRACT_MANAGER_APPROVER_ID,
} from '@/lib/procurementApprovalWorkflow';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = readAuthSession(request);
  if (session?.type !== 'employee') {
    return NextResponse.json({ error: 'Employee sign-in is required.' }, { status: 401 });
  }

  try {
    const [purchaseOrders, workOrders, approvalConfig] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: { status: { in: ['DRAFT', 'PENDING_APPROVAL'] } },
        select: {
          id: true,
          poNumber: true,
          projectName: true,
          supplierName: true,
          totalAmount: true,
          status: true,
          poDate: true,
          statusHistory: {
            orderBy: { changedAt: 'asc' },
            select: { id: true, fromStatus: true, toStatus: true, changedAt: true, actorName: true, note: true },
          },
        },
      }),
      prisma.workOrder.findMany({
        where: { status: { in: ['Draft', 'Pending Approval'] } },
        include: {
          project: { select: { name: true } },
          statusHistory: {
            orderBy: { changedAt: 'asc' },
            select: { id: true, fromStatus: true, toStatus: true, changedAt: true, actorName: true, note: true },
          },
        },
      }),
      getProcurementApprovalConfig(prisma),
    ]);
    const poIds = purchaseOrders.map(order => order.id);
    const woIds = workOrders.map(order => order.id);
    const approvalRows = await prisma.documentApprovalStep.findMany({
      where: {
        OR: [
          { documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER, documentId: { in: poIds } },
          { documentType: PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER, documentId: { in: woIds } },
        ],
      },
      select: { documentType: true, documentId: true, stage: true, threshold: true, approverEmployeeId: true, status: true, approvedAt: true },
    });
    const approvalEmployeeIds = [...new Set([
      ...approvalRows.map(row => row.approverEmployeeId),
      ...(approvalConfig.levels || []).flatMap(level => level.approverEmployeeIds || []),
    ].filter(id => id && id !== PURCHASE_MANAGER_APPROVER_ID && id !== CONTRACT_MANAGER_APPROVER_ID))];
    const approvalEmployees = approvalEmployeeIds.length
      ? await prisma.employee.findMany({
        where: { id: { in: approvalEmployeeIds } },
        select: { id: true, name: true },
      })
      : [];
    const employeeNames = new Map(approvalEmployees.map(employee => [employee.id, employee.name]));

    const rowsByDocument = new Map();
    approvalRows.forEach(row => {
      const key = `${row.documentType}:${row.documentId}`;
      const rows = rowsByDocument.get(key) || [];
      rows.push(row);
      rowsByDocument.set(key, rows);
    });
    const pending = [
      ...purchaseOrders.map(order => ({
        documentType: PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER,
        documentId: order.id,
        documentNumber: order.poNumber,
        projectName: order.projectName,
        counterparty: order.supplierName,
        amount: order.totalAmount,
        date: order.poDate,
        status: order.status,
        statusHistory: order.statusHistory,
      })),
      ...workOrders.map(order => ({
        documentType: PROCUREMENT_DOCUMENT_TYPES.WORK_ORDER,
        documentId: order.id,
        documentNumber: order.woNo,
        projectName: order.project?.name || '',
        counterparty: order.contractorName,
        amount: order.contractValue,
        date: order.startDate,
        status: order.status,
        statusHistory: order.statusHistory,
      })),
    ].map(document => {
      const key = `${document.documentType}:${document.documentId}`;
      const savedRows = rowsByDocument.get(key) || [];
      let approvalRowsForDocument = savedRows.length
        ? savedRows
        : buildPendingApprovalRows(getApplicableApprovalStages(approvalConfig, document.amount));
      if (document.documentType === PROCUREMENT_DOCUMENT_TYPES.PURCHASE_ORDER) {
        approvalRowsForDocument = addPurchaseManagerApprovalRow(approvalRowsForDocument);
      } else {
        approvalRowsForDocument = addContractManagerApprovalRow(approvalRowsForDocument);
      }
      const approvalWorkflow = summarizeApprovalSteps(approvalRowsForDocument);
      const approvalHistory = approvalRowsForDocument
        .map(row => ({
          stage: row.stage,
          threshold: row.threshold,
          approverName: row.approverEmployeeId === PURCHASE_MANAGER_APPROVER_ID
            ? 'Purchase Manager'
            : row.approverEmployeeId === CONTRACT_MANAGER_APPROVER_ID
              ? 'Contract Manager'
              : employeeNames.get(row.approverEmployeeId) || 'Assigned employee',
          status: row.status,
          approvedAt: row.approvedAt || null,
        }))
        .sort((first, second) => first.stage - second.stage || first.approverName.localeCompare(second.approverName));
      return { ...document, approvalWorkflow, approvalHistory };
    }).filter(document => document.approvalWorkflow.currentApproverIds.includes(session.id));

    return NextResponse.json({ data: pending });
  } catch (error) {
    console.error('Error fetching assigned procurement approvals:', error);
    return NextResponse.json({ error: 'Failed to load assigned approvals.' }, { status: 500 });
  }
}
