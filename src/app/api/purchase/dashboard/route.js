export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { getEmployeeGrantedProjectIds } from '@/lib/projectAccess';

const amount = value => Number(value || 0) || 0;
const dayAfter = value => { const date = new Date(`${value}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + 1); return date; };

export async function GET(request) {
  const session = readAuthSession(request);
  if (!session) return NextResponse.json({ error: 'Please sign in to view the purchase dashboard.' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const projectName = searchParams.get('project') || 'ALL';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const dateWhere = from || to ? { poDate: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lt: dayAfter(to) } : {}) } } : {};
    let allowedProjectNames = null;
    if (session.type === 'employee') {
      const grantedIds = await getEmployeeGrantedProjectIds(prisma, session.id);
      const dashboardGrants = grantedIds.length ? await prisma.employeeProjectToolAccess.findMany({
        where: { employeeId: String(session.id), projectId: { in: grantedIds }, granted: true, tool: { is: { module: 'Purchase', name: 'Purchase Dashboard View' } } },
        select: { projectId: true },
      }) : [];
      const dashboardProjectIds = dashboardGrants.map(grant => grant.projectId);
      const [legacyProjects, masterProjects] = await Promise.all([
        dashboardProjectIds.length ? prisma.project.findMany({ where: { id: { in: dashboardProjectIds } }, select: { name: true } }) : [],
        dashboardProjectIds.length ? prisma.projectMaster.findMany({ where: { OR: [{ id: { in: dashboardProjectIds } }, { projectId: { in: dashboardProjectIds } }] }, select: { name: true } }) : [],
      ]);
      allowedProjectNames = [...new Set([...legacyProjects, ...masterProjects].map(row => row.name).filter(Boolean))];
      if (projectName !== 'ALL' && !allowedProjectNames.includes(projectName)) {
        return NextResponse.json({ error: 'You do not have purchase dashboard access for this project.' }, { status: 403 });
      }
    }
    const projectWhere = projectName !== 'ALL' ? { projectName } : allowedProjectNames ? { projectName: { in: allowedProjectNames } } : {};
    const poWhere = { ...dateWhere, ...projectWhere };
    const [pos, vendors, bills, projects] = await Promise.all([
      prisma.purchaseOrder.findMany({ where: poWhere, select: { id: true, poNumber: true, poDate: true, createdAt: true, approvedAt: true, status: true, totalAmount: true, supplierId: true, supplierName: true, projectName: true, items: { select: { description: true, totalAmount: true, quantity: true } }, grns: { select: { id: true } } }, orderBy: { poDate: 'asc' } }),
      prisma.vendorMaster.findMany({ select: { id: true, name: true, status: true } }),
      prisma.vendorBill.findMany({ where: (from || to) ? { billDate: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lt: dayAfter(to) } : {}) } } : {}, select: { poNo: true, grossAmount: true, netAmount: true, paidAmount: true } }),
      prisma.purchaseOrder.findMany({ where: { AND: [{ projectName: { not: null } }, ...(allowedProjectNames ? [{ projectName: { in: allowedProjectNames } }] : [])] }, distinct: ['projectName'], select: { projectName: true }, orderBy: { projectName: 'asc' } }),
    ]);
    const poNumbers = new Set(pos.map(po => po.poNumber));
    const visibleBills = bills.filter(bill => bill.poNo && poNumbers.has(bill.poNo));
    const billedPOs = new Set(visibleBills.map(bill => bill.poNo));
    const supplierIds = new Set(pos.map(po => po.supplierId).filter(Boolean));
    const supplierNames = new Set(pos.map(po => po.supplierName.trim().toLowerCase()));
    const relatedVendors = vendors.filter(vendor => supplierIds.has(vendor.id) || supplierNames.has(vendor.name.trim().toLowerCase()));
    const statuses = pos.map(po => String(po.status).toUpperCase());
    const totalPO = pos.length;
    const poStats = [
      { name: 'Total PO', value: totalPO },
      { name: 'Completed PO', value: statuses.filter(status => ['FULLY_RECEIVED', 'CLOSED'].includes(status)).length },
      { name: 'Open PO', value: statuses.filter(status => ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'].includes(status)).length },
      { name: 'Cancel PO', value: statuses.filter(status => status === 'CANCELLED').length },
      { name: 'Foreclose PO', value: 0 },
    ];
    const monthlyMap = new Map();
    for (const po of pos) {
      const date = new Date(po.poDate); const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + amount(po.totalAmount));
    }
    const supplierMap = new Map(); const materialMap = new Map();
    for (const po of pos) {
      const supplier = supplierMap.get(po.supplierName) || { name: po.supplierName, amount: 0 };
      supplier.amount += amount(po.totalAmount); supplierMap.set(po.supplierName, supplier);
      for (const item of po.items) { const name = item.description || 'Uncategorised'; materialMap.set(name, (materialMap.get(name) || 0) + amount(item.totalAmount)); }
    }
    const cycles = pos.filter(po => po.approvedAt && po.createdAt).map(po => Math.max(0, (new Date(po.approvedAt) - new Date(po.createdAt)) / 86400000));
    const grnCount = pos.reduce((sum, po) => sum + po.grns.length, 0);
    const billedCount = pos.filter(po => po.grns.length && billedPOs.has(po.poNumber)).reduce((sum, po) => sum + po.grns.length, 0);
    const amountBilled = visibleBills.reduce((sum, bill) => sum + amount(bill.grossAmount), 0);
    return NextResponse.json({
      projects: projects.map(row => row.projectName).filter(Boolean), project: projectName, from, to,
      suppliers: { total: relatedVendors.length, active: relatedVendors.filter(v => ['active', 'regular'].includes(String(v.status).toLowerCase())).length, inactive: relatedVendors.filter(v => !['active', 'regular'].includes(String(v.status).toLowerCase())).length },
      poStats, topSuppliers: [...supplierMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 10), topMaterials: [...materialMap].map(([name, value]) => ({ name, amount: value })).sort((a, b) => b.amount - a.amount).slice(0, 10),
      monthlyPO: [...monthlyMap].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, value })), avgCycleDays: cycles.length ? cycles.reduce((sum, value) => sum + value, 0) / cycles.length : 0,
      grnBilling: { grnCount, billedCount, unbilledCount: Math.max(0, grnCount - billedCount), amountBilled, amountUnbilled: Math.max(0, pos.reduce((sum, po) => sum + amount(po.totalAmount), 0) - amountBilled) },
    });
  } catch (error) {
    console.error('Error fetching purchase dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase dashboard data' }, { status: 500 });
  }
}
