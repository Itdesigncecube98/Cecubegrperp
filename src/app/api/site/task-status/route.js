export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { addTaskMasterTask } from '@/lib/siteTaskMaster';

const STORAGE_DIR = path.join(process.cwd(), '.site_task_status');
const STATUS_OPTIONS = ['Tentative', 'Started', 'Hold', 'Completed', 'Closed'];

function getPath(projectId) {
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
  return path.join(STORAGE_DIR, `project_${projectId}.json`);
}

function readData(projectId) {
  const filePath = getPath(projectId);
  if (!fs.existsSync(filePath)) return { groups: [] };
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return { groups: [] }; }
}

function writeData(projectId, data) {
  fs.writeFileSync(getPath(projectId), JSON.stringify(data, null, 2), 'utf8');
}

function clean(value) {
  return String(value || '').trim();
}

function onlyWorkOrderTasks(groups) {
  return (groups || []).map(group => ({
    ...group,
    tasks: (group.tasks || []).filter(task => task.source === 'Work Order' || task.workOrderId),
    subgroups: onlyWorkOrderTasks(group.subgroups).filter(subgroup => subgroup.tasks.length || subgroup.subgroups.length)
  })).filter(group => group.tasks.length || group.subgroups.length);
}

function pushStatusHistory(task, status, statusDate, description) {
  const nextStatus = STATUS_OPTIONS.includes(status) ? status : 'Tentative';
  const changedAt = statusDate || new Date().toISOString();
  const currentHistory = Array.isArray(task.history) ? task.history : [];
  const lastEntry = currentHistory[currentHistory.length - 1];
  if (lastEntry && lastEntry.status === nextStatus && lastEntry.changedAt === changedAt) {
    return currentHistory;
  }
  const updatedHistory = [...currentHistory, { status: nextStatus, changedAt, description: clean(description ?? task.description) }];
  task.history = updatedHistory.slice(-20);
  task.statusDates = { ...(task.statusDates || {}), [nextStatus]: changedAt };
  return task.history;
}

function applyTaskDetails(task, body) {
  task.description = String(body.description || '').trim();
  task.statusDates = { ...(task.statusDates || {}) };
  for (const status of STATUS_OPTIONS) {
    const field = `${status.toLowerCase()}Date`;
    if (body[field] !== undefined) {
      const value = clean(body[field]);
      if (value) task.statusDates[status] = value;
      else delete task.statusDates[status];
    }
  }
  task.tentativeDate = task.statusDates.Tentative || '';
  task.startedDate = task.statusDates.Started || '';
  task.holdDate = task.statusDates.Hold || '';
  task.completedDate = task.statusDates.Completed || '';
  task.closedDate = task.statusDates.Closed || '';
}

function findSubgroup(groups, subgroupId) {
  for (const group of groups) {
    for (const subgroup of group.subgroups || []) {
      if (subgroup.id === subgroupId) return subgroup;
      const nested = findSubgroup([subgroup], subgroupId);
      if (nested) return nested;
    }
  }
  return null;
}

function findGroup(groups, groupId) {
  return groups.find(group => group.id === groupId) || null;
}

function findParent(groups, parentType, parentId) {
  if (parentType === 'group') return findGroup(groups, parentId);
  return findSubgroup(groups, parentId);
}

function findTask(groups, taskId) {
  for (const group of groups) {
    const direct = (group.tasks || []).find(task => task.id === taskId);
    if (direct) return direct;
    const nested = findTask(group.subgroups || [], taskId);
    if (nested) return nested;
  }
  return null;
}

export async function GET(request) {
  const projectId = new URL(request.url).searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
  if (project?.name) {
    const workOrders = await prisma.workOrder.findMany({ where: { project: { name: project.name } }, select: { woNo: true, contractorName: true, scope: true } });
    workOrders.forEach(order => {
      let scope = {};
      try { scope = order.scope ? JSON.parse(order.scope) : {}; } catch { scope = {}; }
      (Array.isArray(scope.items) ? scope.items : []).forEach(item => addTaskMasterTask(projectId, {
        groupName: `Work Order ${order.woNo}`,
        subgroupName: order.contractorName || 'Work Order Tasks',
        taskName: item.description,
        description: `Work order ${order.woNo}`,
        source: 'Work Order',
        quantity: item.qty,
        unit: item.unit || 'Job',
        rate: item.rate,
        workOrderId: order.woNo,
        contractorName: order.contractorName
      }));
    });
  }
  return NextResponse.json({ groups: onlyWorkOrderTasks(readData(projectId).groups) });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { projectId, action } = body;
    if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    const data = readData(projectId);

    if (action === 'ADD_GROUP') {
      const name = clean(body.name);
      if (!name) return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
      const group = { id: `group-${Date.now()}`, name, subgroups: [], tasks: [] };
      data.groups.push(group);
      writeData(projectId, data);
      return NextResponse.json({ group });
    }

    if (action === 'ADD_SUBGROUP') {
      const name = clean(body.name);
      const parent = findParent(data.groups, body.parentType || 'group', body.parentId || body.groupId);
      if (!parent) return NextResponse.json({ error: 'Parent group or subgroup not found' }, { status: 404 });
      if (!name) return NextResponse.json({ error: 'Subgroup name is required' }, { status: 400 });
      const subgroup = { id: `subgroup-${Date.now()}`, name, tasks: [], subgroups: [] };
      parent.subgroups = parent.subgroups || [];
      parent.subgroups.push(subgroup);
      writeData(projectId, data);
      return NextResponse.json({ subgroup });
    }

    if (action === 'ADD_TASK') {
      const name = clean(body.name);
      const parent = findParent(data.groups, body.parentType || 'subgroup', body.parentId || body.subgroupId);
      if (!parent) return NextResponse.json({ error: 'Parent group or subgroup not found' }, { status: 404 });
      if (!name) return NextResponse.json({ error: 'Task name is required' }, { status: 400 });
      const initialStatus = STATUS_OPTIONS.includes(body.status) ? body.status : 'Tentative';
      const createdAt = new Date().toISOString();
      const task = {
        id: `task-${Date.now()}`,
        name,
        description: clean(body.description),
        status: initialStatus,
        updatedAt: createdAt,
        statusDates: {},
        history: [{ status: initialStatus, changedAt: createdAt, description: clean(body.description) }],
      };
      applyTaskDetails(task, body);
      if (!task.statusDates[initialStatus]) task.statusDates[initialStatus] = createdAt;
      task[`${initialStatus.toLowerCase()}Date`] = task.statusDates[initialStatus];
      parent.tasks = parent.tasks || [];
      parent.tasks.push(task);
      writeData(projectId, data);
      return NextResponse.json({ task });
    }

    if (action === 'UPDATE_GROUP') {
      const groupId = body.groupId || body.id;
      const group = findGroup(data.groups, groupId);
      const name = clean(body.name);
      if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      if (!name) return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
      group.name = name;
      group.updatedAt = new Date().toISOString();
      writeData(projectId, data);
      return NextResponse.json({ group });
    }

    if (action === 'UPDATE_SUBGROUP') {
      const subgroupId = body.subgroupId || body.id;
      const subgroup = findSubgroup(data.groups, subgroupId);
      const name = clean(body.name);
      if (!subgroup) return NextResponse.json({ error: 'Subgroup not found' }, { status: 404 });
      if (!name) return NextResponse.json({ error: 'Subgroup name is required' }, { status: 400 });
      subgroup.name = name;
      subgroup.updatedAt = new Date().toISOString();
      writeData(projectId, data);
      return NextResponse.json({ subgroup });
    }

    if (action === 'UPDATE_STATUS') {
      if (!STATUS_OPTIONS.includes(body.status)) return NextResponse.json({ error: 'Invalid task status' }, { status: 400 });
      const task = findTask(data.groups, body.taskId);
      if (task) {
        const nextStatus = body.status;
        task.status = nextStatus;
        task.updatedAt = new Date().toISOString();
        pushStatusHistory(task, nextStatus, body.statusDate, body.description);
        writeData(projectId, data);
        return NextResponse.json({ task });
      }
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (action === 'UPDATE_TASK') {
      const task = findTask(data.groups, body.taskId);
      const name = clean(body.name);
      if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      if (!name) return NextResponse.json({ error: 'Task name is required' }, { status: 400 });
      task.name = name;
      applyTaskDetails(task, body);
      if (STATUS_OPTIONS.includes(body.status) && body.status !== task.status) {
        task.status = body.status;
        pushStatusHistory(task, body.status, body.statusDate || task.statusDates?.[body.status], body.description);
      } else if (Array.isArray(task.history) && task.history.length > 0) {
        task.history[task.history.length - 1].description = task.description || '';
      }
      task.updatedAt = new Date().toISOString();
      if (!Array.isArray(task.history) || task.history.length === 0) {
        task.history = [{ status: task.status, changedAt: task.updatedAt, description: task.description || '' }];
      }
      writeData(projectId, data);
      return NextResponse.json({ task });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to save site task status' }, { status: 500 });
  }
}
