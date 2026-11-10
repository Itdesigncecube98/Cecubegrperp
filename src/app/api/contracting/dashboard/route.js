export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { getEmployeeGrantedProjectIds } from '@/lib/projectAccess';

const num = value => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

function parseDateRange(from, to) {
  const where = {};
  if (from || to) {
    const gte = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
    const lt = to ? dateExclusive(to) : undefined;
    where.AND = [{
      OR: [
        { startDate: { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) } },
        { startDate: null, createdAt: { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) } },
      ],
    }];
  }
  return where;
}

function groupByContractor(workOrders, bills) {
  const grouped = new Map();
  for (const order of workOrders) {
    const key = order.contractorId || `name:${order.contractorName || 'Unassigned'}`;
    const row = grouped.get(key) || {
      contractorId: order.contractorId || null,
      name: order.contractorName || 'Unassigned',
      workOrders: 0, workOrderValue: 0, delayedOrders: 0, foreclosedOrders: 0,
      raBill: 0, retention: 0, outstanding: 0, rejectedBills: 0,
    };
    row.workOrders += 1;
    row.workOrderValue += num(order.contractValue);
    const status = String(order.status || '').toLowerCase();
    if (status.includes('foreclos')) row.foreclosedOrders += 1;
    if (order.endDate && order.endDate < new Date() && !['closed', 'completed', 'cancelled', 'canceled', 'foreclosed'].some(value => status.includes(value))) row.delayedOrders += 1;
    grouped.set(key, row);
  }
  for (const bill of bills) {
    const order = bill.workOrder;
    const key = order?.contractorId || `name:${order?.contractorName || 'Unassigned'}`;
    const row = grouped.get(key) || {
      contractorId: order?.contractorId || null,
      name: order?.contractorName || 'Unassigned',
      workOrders: 0, workOrderValue: 0, delayedOrders: 0, foreclosedOrders: 0,
      raBill: 0, retention: 0, outstanding: 0, rejectedBills: 0,
    };
    row.raBill += num(bill.currentBill);
    row.retention += num(bill.retentionAmount);
    if (String(bill.status || '').toLowerCase() === 'paid') row.outstanding += 0;
    else row.outstanding += num(bill.netPayable);
    if (String(bill.status || '').toLowerCase() === 'rejected') row.rejectedBills += 1;
  }
  return [...grouped.values()];
}

export async function GET(request) {
  const session = readAuthSession(request);
  if (!session) return NextResponse.json({ error: 'Please sign in to view the contractor dashboard.' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const selectedProjectId = searchParams.get('projectId') || 'ALL';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    let allowedProjectIds = null;
    if (session.type === 'employee') {
      const grants = await getEmployeeGrantedProjectIds(prisma, session.id);
      const [masterIds, legacyProjects] = await Promise.all([
        prisma.projectMaster.findMany({ where: { id: { in: grants } }, select: { id: true } }),
        prisma.project.findMany({ where: { id: { in: grants } }, select: { name: true } }),
      ]);
      const matchingMasters = legacyProjects.length
        ? await prisma.projectMaster.findMany({ where: { name: { in: legacyProjects.map(project => project.name) } }, select: { id: true } })
        : [];
      allowedProjectIds = [...new Set([...masterIds, ...matchingMasters].map(project => project.id))];
    }

    const projects = await prisma.projectMaster.findMany({
      where: allowedProjectIds ? { id: { in: allowedProjectIds } } : {},
      select: { id: true, name: true, projectId: true, location: true, status: true },
      orderBy: { name: 'asc' },
    });
    if (selectedProjectId !== 'ALL' && !projects.some(project => project.id === selectedProjectId)) {
      return NextResponse.json({ error: 'Project not found or access denied.' }, { status: 404 });
    }
    const projectIds = selectedProjectId === 'ALL' ? projects.map(project => project.id) : [selectedProjectId];
    const dateRange = parseDateRange(fromDate, toDate);
    const workOrderWhere = { projectId: { in: projectIds }, ...dateRange };

    const [contractors, projectWorkOrders, workOrders, bills, labourRequests] = await Promise.all([
      prisma.contractor.findMany({ select: { id: true, companyName: true, status: true } }),
      projectIds.length ? prisma.workOrder.findMany({ where: { projectId: { in: projectIds } }, select: { id: true, contractorId: true, contractorName: true } }) : [],
      projectIds.length ? prisma.workOrder.findMany({
        where: workOrderWhere,
        select: { id: true, projectId: true, contractorId: true, contractorName: true, contractValue: true, status: true, startDate: true, endDate: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }) : [],
      projectIds.length ? prisma.workOrderRABill.findMany({
        where: { projectId: { in: projectIds }, ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: new Date(`${fromDate}T00:00:00.000Z`) } : {}), ...(toDate ? { lt: dateExclusive(toDate) } : {}) } } : {}) },
          select: { id: true, billNo: true, currentBill: true, netPayable: true, retentionAmount: true, status: true, date: true, workOrder: { select: { id: true, contractorId: true, contractorName: true, woNo: true, projectId: true } } },
      }) : [],
      projectIds.length ? prisma.labourRequisition.findMany({
        where: { projectId: { in: projectIds }, ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: new Date(`${fromDate}T00:00:00.000Z`) } : {}), ...(toDate ? { lt: dateExclusive(toDate) } : {}) } } : {}) },
        select: { id: true, projectId: true, workOrderId: true, category: true, designation: true, quantity: true, duration: true, rate: true, status: true, date: true },
      }) : [],
    ]);

    // Advance records are linked to work orders by ID. The helper values below
    // are filled from the filtered work-order query before the final response.
    const workOrderIds = workOrders.map(order => order.id);
    const filteredAdvances = projectIds.length ? await prisma.advancePayment.findMany({
      where: {
        OR: [{ projectId: { in: projectIds } }, { woId: { in: workOrderIds } }],
        ...(fromDate || toDate ? { advDate: { ...(fromDate ? { gte: new Date(`${fromDate}T00:00:00.000Z`) } : {}), ...(toDate ? { lt: dateExclusive(toDate) } : {}) } } : {}),
      },
      select: { id: true, projectId: true, woId: true, advNo: true, advDate: true, advanceAmount: true, balanceAmount: true, status: true },
    }) : [];

    const projectContractorIds = new Set(projectWorkOrders.map(order => order.contractorId).filter(Boolean));
    const projectContractorNames = new Set(projectWorkOrders.map(order => String(order.contractorName || '').trim().toLowerCase()).filter(Boolean));
    const visibleContractors = allowedProjectIds
      ? contractors.filter(contractor => projectContractorIds.has(contractor.id) || projectContractorNames.has(String(contractor.companyName || '').trim().toLowerCase()))
      : contractors;
    const activeContractors = visibleContractors.filter(contractor => ['active', 'regular'].includes(String(contractor.status || '').toLowerCase()));
    const trialContractors = visibleContractors.filter(contractor => String(contractor.status || '').toLowerCase().includes('trial'));
    const inactiveContractors = visibleContractors.filter(contractor => !['active', 'regular'].includes(String(contractor.status || '').toLowerCase()) && !String(contractor.status || '').toLowerCase().includes('trial'));

    const contractorRows = groupByContractor(workOrders, bills);
    const topContractors = contractorRows.slice().sort((a, b) => b.workOrderValue - a.workOrderValue).slice(0, 10);
    const performance = contractorRows.slice().sort((a, b) => (b.delayedOrders + b.foreclosedOrders + b.rejectedBills) - (a.delayedOrders + a.foreclosedOrders + a.rejectedBills)).slice(0, 15);
    const labourMap = new Map();
    for (const requestRow of labourRequests) {
      const category = requestRow.category?.trim() || 'Uncategorised';
      const row = labourMap.get(category) || { name: category, requisitions: 0, quantity: 0, amount: 0 };
      row.requisitions += 1;
      row.quantity += num(requestRow.quantity);
      row.amount += num(requestRow.rate) * num(requestRow.quantity) * Math.max(1, num(requestRow.duration));
      labourMap.set(category, row);
    }
    const labourCategories = [...labourMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 10);

    const now = new Date();
    const statuses = workOrders.map(order => String(order.status || '').toLowerCase());
    const totalWO = workOrders.length;
    const completed = statuses.filter(status => status.includes('completed') || status === 'closed').length;
    const cancelled = statuses.filter(status => status.includes('cancel')).length;
    const foreclosed = statuses.filter(status => status.includes('foreclos')).length;
    const open = Math.max(0, totalWO - completed - cancelled - foreclosed);
    const delayedOrders = workOrders.filter(order => order.endDate && order.endDate < now && !['closed', 'completed', 'cancelled', 'canceled', 'foreclosed'].some(value => String(order.status || '').toLowerCase().includes(value)));
    const statisticCounts = [
      { name: 'Work Orders', count: totalWO },
      { name: 'RA Bills', count: bills.length },
      { name: 'Advances', count: filteredAdvances.length },
      { name: 'Delayed Work Orders', count: delayedOrders.length },
    ].map(item => ({ ...item, percentage: totalWO > 0 ? Math.min(100, Math.round(item.count / totalWO * 100)) : 0 }));

    const monthly = new Map();
    const ensureMonth = date => {
      const value = new Date(date);
      const key = Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 7);
      if (!key) return null;
      const item = monthly.get(key) || { month: key, workOrderValue: 0, raBill: 0, retention: 0, outstanding: 0 };
      monthly.set(key, item);
      return item;
    };
    for (const order of workOrders) {
      const row = ensureMonth(order.startDate || order.createdAt);
      if (row) row.workOrderValue += num(order.contractValue);
    }
    for (const bill of bills) {
      const row = ensureMonth(bill.date);
      if (row) {
        row.raBill += num(bill.currentBill);
        row.retention += num(bill.retentionAmount);
        if (String(bill.status || '').toLowerCase() !== 'paid') row.outstanding += num(bill.netPayable);
      }
    }
    const contractorSummary = [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      projects, selectedProjectId, fromDate, toDate,
      contractors: { total: visibleContractors.length, active: activeContractors.length, onTrial: trialContractors.length, inactive: inactiveContractors.length },
      statisticCounts,
      workOrderStats: { total: totalWO, open, cancelled, foreclosed, completed },
      topContractors, labourCategories, contractorSummary, performance,
      totals: {
        contractValue: workOrders.reduce((sum, order) => sum + num(order.contractValue), 0),
        raBilled: bills.reduce((sum, bill) => sum + num(bill.currentBill), 0),
        advance: filteredAdvances.reduce((sum, item) => sum + num(item.advanceAmount), 0),
        delayed: delayedOrders.length,
      },
    });
  } catch (error) {
    console.error('Error loading contractor dashboard:', error);
    return NextResponse.json({ error: 'Failed to load contractor dashboard data.' }, { status: 500 });
  }
}

function dateExclusive(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

