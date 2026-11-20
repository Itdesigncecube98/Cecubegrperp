function amount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function saveAllocationHistory(db, row, nextAllocated, nextUnallocated, allocationScope) {
  const changes = {};
  const previousAllocated = amount(row.allocatedAmount);
  const previousUnallocated = amount(row.unallocatedAmount);
  if (Math.abs(previousAllocated - nextAllocated) > 0.005) {
    changes.allocatedAmount = { old: previousAllocated, new: nextAllocated };
  }
  if (Math.abs(previousUnallocated - nextUnallocated) > 0.005) {
    changes.unallocatedAmount = { old: previousUnallocated, new: nextUnallocated };
  }
  if (Object.keys(changes).length === 0) return;
  if (allocationScope && changes.allocatedAmount) changes.allocationScope = allocationScope;
  await db.projectWbsBudgetHistory.create({
    data: { projectWbsTaskId: row.id, changes },
  });
}

export async function recalculateProjectWbsBudgetTotals(db, projectId, allocationScope = null) {
  const projectRow = await db.projectWbsTask.findFirst({
    where: { projectId, wbsGroupId: null, wbsTaskId: null },
  });
  if (!projectRow) throw new Error(`Project budget row not found for project ${projectId}`);

  const [groupRows, taskRows] = await Promise.all([
    db.projectWbsTask.findMany({
      where: { projectId, wbsGroupId: { not: null }, wbsTaskId: null },
      select: {
        id: true,
        wbsGroupId: true,
        approvedBuiltUpArea: true,
        approvedAmount: true,
        allocatedAmount: true,
        directAllocatedAmount: true,
        allocatedEstimateAmount: true,
        unallocatedAmount: true,
        estimateAmount: true,
        expendedAmount: true,
      },
    }),
    db.projectWbsTask.findMany({
      where: { projectId, wbsTaskId: { not: null } },
      select: {
        id: true,
        wbsGroupId: true,
        approvedBuiltUpArea: true,
        approvedAmount: true,
        allocatedAmount: true,
        directAllocatedAmount: true,
        unallocatedAmount: true,
      },
    }),
  ]);

  const tasksByGroup = new Map();
  for (const task of taskRows) {
    const siblings = tasksByGroup.get(task.wbsGroupId) || [];
    siblings.push(task);
    tasksByGroup.set(task.wbsGroupId, siblings);

    const allocatedAmount = amount(task.directAllocatedAmount);
    const unallocatedAmount = Math.max(0, amount(task.approvedAmount) - allocatedAmount);
    const area = amount(task.approvedBuiltUpArea) || 1;
    await db.projectWbsTask.update({
      where: { id: task.id },
      data: {
        allocatedAmount,
        allocatedRate: allocatedAmount / area,
        unallocatedAmount,
        unallocatedRate: unallocatedAmount / area,
      },
    });
    await saveAllocationHistory(db, task, allocatedAmount, unallocatedAmount, allocationScope);
  }

  const updatedGroups = [];
  for (const group of groupRows) {
    // WBS group budgets are the allocation source. Child rows remain detail
    // rows; they do not create a second allocation that can double-count here.
    const allocatedAmount = amount(group.approvedAmount);
    const unallocatedAmount = 0;
    const area = amount(group.approvedBuiltUpArea) || 1;
    await db.projectWbsTask.update({
      where: { id: group.id },
      data: {
        allocatedAmount,
        allocatedRate: allocatedAmount / area,
        unallocatedAmount,
        unallocatedRate: unallocatedAmount / area,
      },
    });
    await saveAllocationHistory(db, group, allocatedAmount, unallocatedAmount, allocationScope);
    updatedGroups.push({ ...group, allocatedAmount, unallocatedAmount });
  }

  const amountFields = [
    'approvedAmount',
    'allocatedEstimateAmount',
    'estimateAmount',
    'expendedAmount',
  ];
  const area = amount(projectRow.approvedBuiltUpArea) || 1;
  const totals = {};
  for (const field of amountFields) {
    const total = updatedGroups.reduce((sum, row) => sum + amount(row[field]), 0);
    if (field !== 'approvedAmount') totals[field] = total;
    totals[field.replace('Amount', 'Rate')] = (field === 'approvedAmount' ? amount(projectRow.approvedAmount) : total) / area;
  }
  totals.allocatedAmount = updatedGroups.reduce((sum, group) => sum + group.allocatedAmount, 0);
  totals.allocatedRate = totals.allocatedAmount / area;
  totals.unallocatedAmount = amount(projectRow.approvedAmount) - totals.allocatedAmount;
  totals.unallocatedRate = totals.unallocatedAmount / area;

  await db.projectWbsTask.update({
    where: { id: projectRow.id },
    data: totals,
  });
  await saveAllocationHistory(db, projectRow, totals.allocatedAmount, totals.unallocatedAmount, allocationScope);
  return { ...projectRow, ...totals };
}
