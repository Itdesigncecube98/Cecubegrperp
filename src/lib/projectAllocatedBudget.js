import fs from 'fs';
import path from 'path';

export class ProjectBudgetError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.name = 'ProjectBudgetError';
    this.status = status;
  }
}

export function isProjectBudgetLocked(projectId) {
  const filePath = path.join(process.cwd(), '.planning_data', `project_budget_lock_${projectId}.json`);
  try {
    if (!fs.existsSync(filePath)) return false;
    const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return config.isLocked === true;
  } catch (error) {
    console.error('Error checking project budget lock status:', error);
    throw new ProjectBudgetError('Unable to verify project budget lock status.', 500);
  }
}

export async function lockProjectBudget(tx, projectId) {
  await tx.$queryRaw`SELECT "id" FROM "Project" WHERE "id" = ${projectId} FOR UPDATE`;
}

async function resolveBudgetProject(tx, { projectMasterId, projectName }) {
  let name = String(projectName || '').trim();
  if (projectMasterId) {
    const master = await tx.projectMaster.findUnique({
      where: { id: projectMasterId },
      select: { name: true },
    });
    if (master) name = master.name;
  }

  if (!name) {
    throw new ProjectBudgetError('Select a project with an allocated WBS budget.', 400);
  }

  const projects = await tx.project.findMany({
    where: { name },
    select: { id: true },
    take: 2,
  });
  if (projects.length === 0) {
    throw new ProjectBudgetError(`No WBS budget is defined for project "${name}".`);
  }
  if (projects.length > 1) {
    throw new ProjectBudgetError(`Multiple WBS projects are named "${name}". Resolve the duplicate project names before ordering.`);
  }

  const projectMasters = await tx.projectMaster.findMany({
    where: { name },
    select: { id: true },
  });

  return {
    projectId: projects[0].id,
    projectName: name,
    projectMasterIds: projectMasters.map(project => project.id),
  };
}

export async function getProjectOrderCommitments(tx, projectId) {
  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });
  if (!project) {
    throw new ProjectBudgetError('Project not found for WBS budget validation.', 404);
  }

  const projectMasters = await tx.projectMaster.findMany({
    where: { name: project.name },
    select: { id: true },
  });
  const purchaseOrderFilters = [];
  if (projectMasters.length) {
    purchaseOrderFilters.push({ projectId: { in: projectMasters.map(master => master.id) } });
  }
  purchaseOrderFilters.push({ projectId: null, projectName: project.name });

  const [purchaseOrders, workOrders] = await Promise.all([
    tx.purchaseOrder.aggregate({
      where: {
        status: { not: 'CANCELLED' },
        OR: purchaseOrderFilters,
      },
      _sum: { totalAmount: true },
    }),
    projectMasters.length
      ? tx.workOrder.aggregate({
        where: {
          projectId: { in: projectMasters.map(master => master.id) },
          status: { notIn: ['Cancelled', 'Rejected'] },
        },
        _sum: { contractValue: true },
      })
      : Promise.resolve({ _sum: { contractValue: 0 } }),
  ]);

  return (Number(purchaseOrders._sum.totalAmount) || 0) + (Number(workOrders._sum.contractValue) || 0);
}

export async function getProjectExpendedAmount(tx, projectId) {
  const project = await tx.project.findUnique({ where: { id: projectId }, select: { name: true } });
  if (!project) return 0;

  const projectMasters = await tx.projectMaster.findMany({
    where: { name: project.name },
    select: { id: true },
  });
  const projectMasterIds = projectMasters.map(master => master.id);
  const poFilters = [];
  if (projectMasterIds.length) poFilters.push({ projectId: { in: projectMasterIds } });
  poFilters.push({ projectId: null, projectName: project.name });

  const [projectRaBills, workOrderRaBills, purchaseOrders] = await Promise.all([
    projectMasterIds.length
      ? tx.projectRABill.aggregate({
        where: { projectId: { in: projectMasterIds } },
        _sum: { currentBill: true },
      })
      : Promise.resolve({ _sum: { currentBill: 0 } }),
    projectMasterIds.length
      ? tx.workOrderRABill.aggregate({
        where: { projectId: { in: projectMasterIds } },
        _sum: { currentBill: true },
      })
      : Promise.resolve({ _sum: { currentBill: 0 } }),
    tx.purchaseOrder.findMany({
      where: { OR: poFilters },
      select: { poNumber: true },
    }),
  ]);
  const poNumbers = purchaseOrders.map(order => order.poNumber);
  const purchaseBills = poNumbers.length
    ? await tx.vendorBill.aggregate({
      where: { poNo: { in: poNumbers } },
      _sum: { grossAmount: true },
    })
    : { _sum: { grossAmount: 0 } };

  return (Number(projectRaBills._sum.currentBill) || 0)
    + (Number(workOrderRaBills._sum.currentBill) || 0)
    + (Number(purchaseBills._sum.grossAmount) || 0);
}

export async function assertProjectOrderWithinAllocatedBudget(tx, {
  projectMasterId,
  projectName,
  amount,
  excludePurchaseOrderId,
  excludeWorkOrderId,
}) {
  const orderAmount = Number(amount);
  if (!Number.isFinite(orderAmount) || orderAmount < 0) {
    throw new ProjectBudgetError('Order amount must be a non-negative number.', 400);
  }

  const project = await resolveBudgetProject(tx, { projectMasterId, projectName });
  await lockProjectBudget(tx, project.projectId);

  const [projectBudgetRow, committedAmount] = await Promise.all([
    tx.projectWbsTask.findFirst({
      where: { projectId: project.projectId, wbsGroupId: null, wbsTaskId: null },
      select: { approvedAmount: true, directAllocatedAmount: true },
    }),
    getProjectOrderCommitments(tx, project.projectId),
  ]);

  const releasedBudgetAmount = Number(projectBudgetRow?.directAllocatedAmount) || 0;
  const approvedAmount = Number(projectBudgetRow?.approvedAmount) || 0;
  let availableAmount = Math.min(releasedBudgetAmount, approvedAmount) - committedAmount;

  if (excludePurchaseOrderId || excludeWorkOrderId) {
    const existing = excludePurchaseOrderId
      ? await tx.purchaseOrder.findUnique({
        where: { id: excludePurchaseOrderId },
        select: { totalAmount: true, projectId: true, projectName: true },
      })
      : await tx.workOrder.findUnique({
        where: { id: excludeWorkOrderId },
        select: { contractValue: true, projectId: true },
      });
    const belongsToProject = existing && (excludePurchaseOrderId
      ? (existing.projectId
        ? project.projectMasterIds.includes(existing.projectId)
        : existing.projectName === project.projectName)
      : project.projectMasterIds.includes(existing.projectId));
    if (belongsToProject) {
      const priorAmount = Number(existing.totalAmount ?? existing.contractValue) || 0;
      availableAmount += priorAmount;
    }
  }
  availableAmount = Math.max(0, availableAmount);

  if (orderAmount > availableAmount + 0.005) {
    throw new ProjectBudgetError(
      `Order amount ₹${orderAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} exceeds the remaining released budget of ₹${availableAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}.`
    );
  }

  return { project, releasedBudgetAmount, committedAmount, availableAmount };
}
