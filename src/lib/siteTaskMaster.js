import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.site_task_status');

function getPath(projectId) {
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
  return path.join(STORAGE_DIR, `project_${projectId}.json`);
}

function read(projectId) {
  const filePath = getPath(projectId);
  if (!fs.existsSync(filePath)) return { groups: [] };
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return { groups: [] }; }
}

function write(projectId, data) {
  fs.writeFileSync(getPath(projectId), JSON.stringify(data, null, 2), 'utf8');
}

function findGroup(groups, name) {
  return groups.find(group => group.name === name);
}

function findSubgroup(group, name) {
  return (group.subgroups || []).find(subgroup => subgroup.name === name);
}

export function addTaskMasterTask(projectId, { groupName, subgroupName, taskName, description = '', source, quantity = 0, unit = 'Job', rate = 0, workOrderId = null, contractorName = '', sourceId = null }) {
  if (!projectId || !taskName?.trim()) return null;
  const data = read(projectId);
  const groupLabel = groupName?.trim() || 'Imported Tasks';
  const subgroupLabel = subgroupName?.trim() || 'Imported Tasks';
  let group = findGroup(data.groups, groupLabel);
  if (!group) {
    group = { id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: groupLabel, subgroups: [], tasks: [] };
    data.groups.push(group);
  }
  let subgroup = findSubgroup(group, subgroupLabel);
  if (!subgroup) {
    subgroup = { id: `subgroup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: subgroupLabel, tasks: [], subgroups: [] };
    group.subgroups = group.subgroups || [];
    group.subgroups.push(subgroup);
  }
  const normalizedName = taskName.trim().toLowerCase();
  const tasks = subgroup.tasks || [];
  const existing = sourceId
    ? tasks.find(task => task.sourceId === sourceId)
      || tasks.find(task => !task.sourceId && task.name.trim().toLowerCase() === normalizedName)
    : tasks.find(task => task.name.trim().toLowerCase() === normalizedName);
  if (existing) {
    existing.description = description || existing.description || '';
    existing.source = source || existing.source;
    existing.quantity = Number(quantity) || existing.quantity || 0;
    existing.plannedQty = existing.quantity;
    existing.unit = unit || existing.unit || 'Job';
    existing.rate = Number(rate) || existing.rate || 0;
    existing.workOrderId = workOrderId || existing.workOrderId || null;
    existing.contractorName = contractorName || existing.contractorName || '';
    existing.sourceId = sourceId || existing.sourceId || null;
    existing.originTaskId = existing.originTaskId || existing.id;
    existing.billingTaskId = existing.billingTaskId
      || `${existing.workOrderId || 'work-order'}:${existing.sourceId || existing.originTaskId}`;
    existing.wccSequence = Number(existing.wccSequence) || 1;
    existing.cumulativeQty = Number(existing.cumulativeQty ?? existing.completedQty ?? 0);
    existing.completedQty = existing.cumulativeQty;
    existing.remainingQty = Math.max(0, existing.plannedQty - existing.cumulativeQty);
    existing.workPercent = existing.plannedQty > 0 ? Math.round((existing.cumulativeQty / existing.plannedQty) * 100) : 0;
    write(projectId, data);
    return existing;
  }
  const now = new Date().toISOString();
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const task = {
    id,
    name: taskName.trim(),
    description: description?.trim() || '',
    source: source || 'manual',
    quantity: Number(quantity) || 0,
    plannedQty: Number(quantity) || 0,
    cumulativeQty: 0,
    completedQty: 0,
    remainingQty: Number(quantity) || 0,
    workPercent: 0,
    unit: unit || 'Job',
    rate: Number(rate) || 0,
    workOrderId,
    contractorName,
    sourceId,
    originTaskId: id,
    billingTaskId: `${workOrderId || 'work-order'}:${sourceId || id}`,
    wccSequence: 1,
    status: 'Tentative',
    updatedAt: now,
    history: [{ status: 'Tentative', changedAt: now, description: description?.trim() || '' }]
  };
  subgroup.tasks = subgroup.tasks || [];
  subgroup.tasks.push(task);
  write(projectId, data);
  return task;
}

function findTask(groups, taskId) {
  for (const group of groups || []) {
    const direct = (group.tasks || []).find(task => task.id === taskId);
    if (direct) return direct;
    const nested = findTask(group.subgroups, taskId);
    if (nested) return nested;
  }
  return null;
}

function findTaskCollection(groups, taskId) {
  for (const group of groups || []) {
    if ((group.tasks || []).some(task => task.id === taskId)) return group.tasks;
    const nested = findTaskCollection(group.subgroups, taskId);
    if (nested) return nested;
  }
  return null;
}

function flattenTasks(groups) {
  return (groups || []).flatMap(group => [
    ...(group.tasks || []),
    ...flattenTasks(group.subgroups),
  ]);
}

export function getTaskMasterTask(projectId, taskId) {
  if (!projectId || !taskId) return null;
  const data = read(projectId);
  return findTask(data.groups, taskId);
}

export function updateTaskMasterTask(projectId, taskUpdate) {
  if (!projectId || !taskUpdate?.id) return null;
  const data = read(projectId);
  const task = findTask(data.groups, taskUpdate.id);
  if (!task) return null;
  Object.assign(task, taskUpdate, { updatedAt: new Date().toISOString() });
  write(projectId, data);
  return task;
}

export function createNextWccTaskMasterTask(projectId, taskId, actorName = '') {
  if (!projectId || !taskId) return { error: 'A project and Work Completion task are required.', status: 400 };
  const data = read(projectId);
  const task = findTask(data.groups, taskId);
  const collection = findTaskCollection(data.groups, taskId);
  if (!task || !collection) return { error: 'Task not found in Site Task Master.', status: 404 };
  if (task.nextWccId) return { error: 'A next WCC already exists for this task.', status: 409 };

  const plannedQty = Number(task.plannedQty ?? task.quantity ?? 0);
  const completedQty = Number(task.cumulativeQty ?? task.completedQty ?? 0);
  const remainingQty = Math.max(0, plannedQty - completedQty);
  if (remainingQty <= 0) return { error: 'This task has no remaining quantity for another WCC.', status: 409 };

  const originTaskId = task.originTaskId || task.id;
  const billingTaskId = task.billingTaskId
    || `${task.workOrderId || 'work-order'}:${task.sourceId || originTaskId}`;
  task.originTaskId = originTaskId;
  task.billingTaskId = billingTaskId;
  task.wccSequence = Number(task.wccSequence) || 1;

  const sequence = flattenTasks(data.groups)
    .filter(candidate => (candidate.billingTaskId || `${candidate.workOrderId || 'work-order'}:${candidate.sourceId || candidate.originTaskId || candidate.id}`) === billingTaskId)
    .reduce((latest, candidate) => Math.max(latest, Number(candidate.wccSequence) || 1), 1) + 1;
  const now = new Date().toISOString();
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const nextTask = {
    ...task,
    id,
    originTaskId,
    billingTaskId,
    wccSequence: sequence,
    parentWccId: task.id,
    nextWccId: null,
    quantity: remainingQty,
    plannedQty: remainingQty,
    cumulativeQty: 0,
    completedQty: 0,
    progressQty: 0,
    remainingQty,
    workPercent: 0,
    verificationStatus: 'Pending Verification',
    statusTimeline: [{
      fromStatus: '',
      toStatus: 'Pending Verification',
      changedAt: now,
      actorName,
    }],
    certificateApproved: false,
    certificateApprovedBy: null,
    certificateApprovedAt: null,
    logs: [],
    mbRef: '',
    completedDate: '',
    actualDate: '',
    status: 'Tentative',
    updatedAt: now,
    statusDates: { Tentative: now },
    history: [{ status: 'Tentative', changedAt: now, description: task.description || '' }],
  };
  task.nextWccId = id;
  collection.push(nextTask);
  write(projectId, data);
  return { task: nextTask, parentTask: task };
}
