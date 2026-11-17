import fs from 'node:fs';
import path from 'node:path';
import { parseRABillRemarks } from '@/lib/raBillMetadata';

const STORAGE_DIR = path.join(process.cwd(), '.site_task_status');
const VERIFICATION_STATUSES = new Set([
  'Pending Verification',
  'Ready for Inspection',
  'Site Incharge Signed',
  'Quality Approved',
  'Approved',
  'Rejected',
]);

function readSiteTaskFile(projectId) {
  const filePath = path.join(STORAGE_DIR, `project_${projectId}.json`);
  if (!fs.existsSync(filePath)) return { groups: [] };
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function flattenTasks(groups, parentGroupName = '') {
  const tasks = [];
  (groups || []).forEach(group => {
    const groupName = parentGroupName || group.name || '';
    (group.tasks || []).forEach(task => {
      tasks.push({ ...task, groupName, subgroupName: parentGroupName ? group.name : '' });
    });
    (group.subgroups || []).forEach(subgroup => {
      (subgroup.tasks || []).forEach(task => {
        tasks.push({ ...task, groupName, subgroupName: subgroup.name || '' });
      });
      if (subgroup.subgroups?.length > 0) {
        tasks.push(...flattenTasks(subgroup.subgroups, subgroup.name || groupName));
      }
    });
  });
  return tasks;
}

function getVerificationStatus(task) {
  if (VERIFICATION_STATUSES.has(task.verificationStatus)) return task.verificationStatus;
  if (VERIFICATION_STATUSES.has(task.status)) return task.status;
  if (task.status === 'Completed' || task.status === 'Closed') return 'Quality Approved';
  if (task.status === 'Started') return 'Site Incharge Signed';
  return 'Pending Verification';
}

function mapTask(task) {
  const qty = Number(task.cumulativeQty ?? task.completedQty ?? 0);
  const rate = Number(task.rate || 0);
  const plannedQty = Number(task.plannedQty ?? task.quantity ?? 0);
  const percentComplete = plannedQty > 0 ? Math.min(100, Math.round((qty / plannedQty) * 100)) : 0;
  const originTaskId = task.originTaskId || task.id;
  const completionTaskId = task.billingTaskId
    || `${task.workOrderId || 'work-order'}:${task.sourceId || originTaskId}`;
  return {
    id: task.id,
    description: task.name || task.taskName || task.materialName || '',
    groupName: task.groupName,
    subgroupName: task.subgroupName,
    qty,
    unit: task.unit || 'Job',
    rate,
    amount: qty * rate,
    percentComplete,
    plannedQty,
    workOrderId: task.workOrderId || null,
    sourceId: task.sourceId || null,
    originTaskId,
    completionTaskId,
    wccSequence: Number(task.wccSequence) || 1,
    verificationStatus: getVerificationStatus(task),
    statusTimeline: Array.isArray(task.statusTimeline) ? task.statusTimeline : [],
    mbRef: task.mbRef || '',
  };
}

function addQuantity(totals, key, quantity) {
  if (!key || !Number.isFinite(quantity) || quantity <= 0) return;
  totals.set(key, (totals.get(key) || 0) + quantity);
}

export async function getWorkOrderBillUsage(prisma, { workOrderId, tasks = [], excludeBillId } = {}) {
  const billedByTaskId = new Map();
  const billedByWccTaskId = new Map();
  if (!workOrderId) return { billedByTaskId, billedByWccTaskId };

  const bills = await prisma.workOrderRABill.findMany({
    where: {
      workOrderId,
      status: { not: 'Rejected' },
      ...(excludeBillId ? { id: { not: excludeBillId } } : {}),
    },
    select: { remarks: true },
  });
  const taskByKey = new Map();
  (tasks || []).forEach(task => {
    const key = task.completionTaskId
      || task.billingTaskId
      || `${task.workOrderId || 'work-order'}:${task.sourceId || task.originTaskId || task.id}`;
    const entry = taskByKey.get(key) || { plannedQty: 0, tasks: [] };
    entry.plannedQty += Number(task.plannedQty || 0);
    entry.tasks.push(task);
    taskByKey.set(key, entry);
  });

  bills.forEach(bill => {
    const { taskLines } = parseRABillRemarks(bill.remarks);
    (Array.isArray(taskLines) ? taskLines : []).forEach(line => {
      const quantity = Number(line.qty);
      if (!Number.isFinite(quantity) || quantity <= 0) return;
      const explicitKey = line.completionTaskId || line.billingTaskId;
      if (explicitKey) {
        const key = String(explicitKey);
        addQuantity(billedByTaskId, key, quantity);
        if (Array.isArray(line.wccAllocations) && line.wccAllocations.length) {
          line.wccAllocations.forEach(allocation => {
            addQuantity(billedByWccTaskId, String(allocation.wccTaskId || ''), Number(allocation.qty));
          });
        } else {
          allocateBilledQuantityToWccTasks(billedByWccTaskId, taskByKey.get(key), quantity);
        }
        return;
      }

      const description = String(line.description || '').trim().toLowerCase();
      if (!description) return;
      const lineRate = line.rate !== undefined && String(line.rate).trim() !== ''
        ? Number(line.rate)
        : NaN;
      const matchingKeys = [...taskByKey.entries()]
        .filter(([, entry]) => entry.tasks.some(task => (
          String(task.description || '').trim().toLowerCase() === description
          && (!Number.isFinite(lineRate) || Math.abs(Number(task.rate || 0) - lineRate) < 0.0001)
        )))
        .sort((left, right) => (
          Math.min(...left[1].tasks.map(task => Number(task.wccSequence) || 1))
          - Math.min(...right[1].tasks.map(task => Number(task.wccSequence) || 1))
        ));

      let unassigned = quantity;
      matchingKeys.forEach(([key, entry]) => {
        if (unassigned <= 0) return;
        const capacity = Math.max(0, entry.plannedQty - (billedByTaskId.get(key) || 0));
        const allocated = Math.min(unassigned, capacity);
        addQuantity(billedByTaskId, key, allocated);
        allocateBilledQuantityToWccTasks(billedByWccTaskId, entry, allocated);
        unassigned -= allocated;
      });
      if (unassigned > 0 && matchingKeys.length) {
        addQuantity(billedByTaskId, matchingKeys[0][0], unassigned);
        allocateBilledQuantityToWccTasks(billedByWccTaskId, matchingKeys[0][1], unassigned);
      }
    });
  });

  return { billedByTaskId, billedByWccTaskId };
}

function allocateBilledQuantityToWccTasks(billedByWccTaskId, entry, quantity) {
  if (!entry || quantity <= 0) return;
  let unassigned = quantity;
  const orderedTasks = [...entry.tasks].sort((left, right) => (
    (Number(left.wccSequence) || 1) - (Number(right.wccSequence) || 1)
  ));
  orderedTasks.forEach(task => {
    if (unassigned <= 0) return;
    const taskId = String(task.id || '');
    if (!taskId) return;
    const capacity = Math.max(0, Number(task.plannedQty || 0) - (billedByWccTaskId.get(taskId) || 0));
    const allocated = Math.min(unassigned, capacity);
    addQuantity(billedByWccTaskId, taskId, allocated);
    unassigned -= allocated;
  });
  if (unassigned > 0 && orderedTasks[0]?.id) {
    addQuantity(billedByWccTaskId, String(orderedTasks[0].id), unassigned);
  }
}

export async function getPendingWorkOrderCompletionData(prisma, options = {}) {
  const completionData = await getWorkOrderCompletionData(prisma, options);
  const tasks = completionData.tasks || [];
  const { billedByWccTaskId } = await getWorkOrderBillUsage(prisma, {
    workOrderId: options.workOrderId,
    tasks,
    excludeBillId: options.excludeBillId,
  });
  const groupedTasks = new Map();

  tasks.forEach(task => {
    const key = task.completionTaskId;
    if (!key) return;
    const entry = groupedTasks.get(key) || {
      ...task,
      qty: 0,
      plannedQty: 0,
      amount: 0,
      approvedQty: 0,
      completionTaskIds: [],
      wccTasks: [],
    };
    entry.plannedQty += Number(task.plannedQty || 0);
    entry.completionTaskIds.push(task.id);
    const approvedQty = task.verificationStatus === 'Approved' ? Number(task.qty || 0) : 0;
    entry.approvedQty += approvedQty;
    entry.wccTasks.push({ ...task, approvedQty });
    groupedTasks.set(key, entry);
  });

  const pendingTasks = [...groupedTasks.entries()].map(([key, task]) => {
    const wccAllocations = task.wccTasks
      .map(wccTask => ({
        wccTaskId: wccTask.id,
        qty: Math.max(0, Math.round((wccTask.approvedQty - (billedByWccTaskId.get(wccTask.id) || 0)) * 10000) / 10000),
      }))
      .filter(allocation => allocation.qty > 0);
    const qty = wccAllocations.reduce((sum, allocation) => sum + allocation.qty, 0);
    const result = { ...task };
    delete result.approvedQty;
    delete result.wccTasks;
    delete result.completionTaskIds;
    return {
      ...result,
      id: key,
      completionTaskId: key,
      wccAllocations,
      qty,
      amount: qty * Number(task.rate || 0),
      percentComplete: task.plannedQty > 0
        ? Math.min(100, Math.round((task.approvedQty / task.plannedQty) * 100))
        : 0,
      verificationStatus: task.approvedQty > 0 ? 'Approved' : task.verificationStatus,
    };
  });
  const approvedTasks = pendingTasks.filter(task => task.verificationStatus === 'Approved' && task.qty > 0);

  return {
    ...completionData,
    tasks: pendingTasks,
    approvedTasks,
    allCompletedTasks: pendingTasks.filter(task => task.qty > 0),
    totalApprovedAmount: approvedTasks.reduce((sum, task) => sum + task.amount, 0),
    totalAllAmount: pendingTasks.reduce((sum, task) => sum + task.amount, 0),
  };
}

export function normalizeRABillTaskLines(taskLines, availableTasks, { requireLinked = true } = {}) {
  if (!Array.isArray(taskLines)) return { error: 'RA Bill task lines are required.' };
  const taskById = new Map((availableTasks || []).map(task => [task.completionTaskId, task]));
  const quantitiesById = new Map();
  const remainingByWccTaskId = new Map();
  (availableTasks || []).forEach(task => {
    (task.wccAllocations || []).forEach(allocation => {
      remainingByWccTaskId.set(allocation.wccTaskId, Number(allocation.qty || 0));
    });
  });
  let hasLinkedTask = false;
  const normalizedTaskLines = [];

  for (const line of taskLines) {
    if (!line || typeof line !== 'object') return { error: 'An RA Bill task line is invalid.' };
    let task = null;
    const explicitKey = line.completionTaskId || line.billingTaskId;
    if (explicitKey) {
      task = taskById.get(String(explicitKey));
      if (!task) return { error: 'A selected Work Completion quantity is no longer available for billing.' };
    } else {
      const description = String(line.description || '').trim().toLowerCase();
      const hasRate = line.rate !== undefined && String(line.rate).trim() !== '';
      const rate = Number(line.rate);
      const matches = (availableTasks || []).filter(candidate => (
        String(candidate.description || '').trim().toLowerCase() === description
        && (!hasRate || Math.abs(Number(candidate.rate || 0) - rate) < 0.0001)
      ));
      if (matches.length === 1) task = matches[0];
    }

    if (!task) {
      normalizedTaskLines.push(line);
      continue;
    }
    const quantity = Number(line.qty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: `Enter a positive quantity for "${task.description}".` };
    }
    hasLinkedTask = true;
    const key = task.completionTaskId;
    const total = (quantitiesById.get(key) || 0) + quantity;
    if (total - Number(task.qty || 0) > 0.0001) {
      return { error: `The RA Bill quantity for "${task.description}" exceeds the approved unbilled quantity (${task.qty} ${task.unit}).` };
    }
    quantitiesById.set(key, total);
    let remainingQty = quantity;
    const wccAllocations = [];
    for (const allocation of task.wccAllocations || []) {
      if (remainingQty <= 0) break;
      const availableQty = remainingByWccTaskId.get(allocation.wccTaskId) || 0;
      const allocatedQty = Math.min(remainingQty, availableQty);
      if (allocatedQty > 0) {
        wccAllocations.push({ wccTaskId: allocation.wccTaskId, qty: allocatedQty });
        remainingByWccTaskId.set(allocation.wccTaskId, availableQty - allocatedQty);
        remainingQty -= allocatedQty;
      }
    }
    if (remainingQty > 0.0001) {
      return { error: `The RA Bill quantity for "${task.description}" could not be allocated to its WCC records.` };
    }
    normalizedTaskLines.push({ ...line, completionTaskId: key, wccAllocations });
  }

  if (requireLinked && !hasLinkedTask) {
    return { error: 'At least one approved, unbilled Work Completion quantity must be included in the RA Bill.' };
  }
  return { taskLines: normalizedTaskLines };
}

export async function getWorkOrderCompletionData(prisma, { projectName, workOrderId, workOrderNo }) {
  if (!projectName) {
    return { tasks: [], legacyProjectId: null, message: 'No project name available' };
  }

  const legacyProjects = await prisma.project.findMany({
    where: { name: projectName },
    select: { id: true, name: true },
  });
  if (legacyProjects.length === 0) {
    return { tasks: [], legacyProjectId: null, message: `No site data found for project "${projectName}"` };
  }

  const allTasks = legacyProjects.flatMap(project => {
    const data = readSiteTaskFile(project.id);
    return flattenTasks(data.groups || []);
  });
  if (allTasks.length === 0) {
    return {
      tasks: [],
      legacyProjectId: legacyProjects[0].id,
      message: `No site task status file (or no tasks) found for legacy project ids: ${legacyProjects.map(project => project.id).join(', ')}.`,
    };
  }

  let workOrderTasks = allTasks;
  let woMatchStrategy = 'all-project-tasks';
  if (workOrderId || workOrderNo) {
    const woTag = String(workOrderNo || '').toLowerCase();
    workOrderTasks = allTasks.filter(task => (
      (workOrderId && task.workOrderId === workOrderId) ||
      (workOrderNo && task.workOrderId === workOrderNo) ||
      (woTag && String(task.groupName || '').toLowerCase().includes(woTag)) ||
      (woTag && String(task.subgroupName || '').toLowerCase().includes(woTag))
    ));
    woMatchStrategy = workOrderTasks.length ? 'matched-by-work-order' : 'no-work-order-match';
  }

  const tasksWithProgress = workOrderTasks.filter(task => Number(task.cumulativeQty ?? task.completedQty ?? 0) > 0);
  const tasks = (tasksWithProgress.length ? tasksWithProgress : workOrderTasks).map(mapTask);
  const approvedTasks = tasks.filter(task => task.verificationStatus === 'Approved' && task.qty > 0);
  const allCompletedTasks = tasks.filter(task => task.qty > 0);

  return {
    tasks,
    approvedTasks,
    allCompletedTasks,
    totalApprovedAmount: approvedTasks.reduce((sum, task) => sum + task.amount, 0),
    totalAllAmount: allCompletedTasks.reduce((sum, task) => sum + task.amount, 0),
    legacyProjectId: legacyProjects[0].id,
    woMatchStrategy,
    totalTasksInFile: allTasks.length,
    ...(!tasks.length
      ? { message: `No tasks matched work order "${workOrderNo || ''}".` }
      : {}),
  };
}
