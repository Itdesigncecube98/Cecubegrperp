export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.site_task_status');

function readSiteTaskFile(projectId) {
  const filePath = path.join(STORAGE_DIR, `project_${projectId}.json`);
  if (!fs.existsSync(filePath)) return { groups: [] };
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return { groups: [] }; }
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

function mapTask(t) {
  const completedQty = Number(t.cumulativeQty ?? t.completedQty ?? 0);
  const rate = Number(t.rate || 0);
  const cumulativeAmount = completedQty * rate;
  const plannedQty = Number(t.plannedQty ?? t.quantity ?? 0);
  const percentComplete = plannedQty > 0 ? Math.min(100, Math.round((completedQty / plannedQty) * 100)) : 0;
  let verificationStatus;
  if (t.status === 'Completed' || t.status === 'Closed') verificationStatus = 'Quality Approved';
  else if (t.status === 'Started') verificationStatus = 'Site Incharge Signed';
  else verificationStatus = t.verificationStatus || 'Pending Verification';
  return {
    id: t.id,
    description: t.name || t.taskName || t.materialName || '',
    groupName: t.groupName,
    subgroupName: t.subgroupName,
    qty: completedQty,
    unit: t.unit || 'Job',
    rate,
    amount: cumulativeAmount,
    percentComplete,
    verificationStatus,
    mbRef: t.mbRef || '',
  };
}

// GET /api/contracting/ra-bills/pending?workOrderId=... OR ?projectName=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const workOrderId = searchParams.get('workOrderId');
    const projectName = searchParams.get('projectName');

    let resolvedProjectName = projectName;
    let workOrder = null;

    if (workOrderId) {
      workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: { project: { select: { id: true, name: true } } },
      });
      if (!workOrder) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
      resolvedProjectName = workOrder.project?.name;
    }

    if (!resolvedProjectName) {
      return NextResponse.json({ tasks: [], approvedTasks: [], totalApprovedAmount: 0, message: 'No project name available' });
    }

    // We MUST resolve the legacy Project by name because siteTaskMaster saves
    // files using the legacy Project model's ID, NOT ProjectMaster.id!
    const legacyProjects = await prisma.project.findMany({
      where: { name: resolvedProjectName },
      select: { id: true, name: true },
    });

    if (legacyProjects.length === 0) {
      return NextResponse.json({
        tasks: [], approvedTasks: [], totalApprovedAmount: 0,
        message: `No site data found for project "${resolvedProjectName}"`,
      });
    }

    let allTasks = [];
    let usedLegacyIds = [];
    for (const lp of legacyProjects) {
      const data = readSiteTaskFile(lp.id);
      const tasks = flattenTasks(data.groups || []);
      if (tasks.length > 0) {
        allTasks.push(...tasks);
        usedLegacyIds.push(lp.id);
      }
    }

    if (allTasks.length === 0) {
      return NextResponse.json({
        tasks: [], approvedTasks: [], totalApprovedAmount: 0,
        message: `No site task status file (or no tasks) found for legacy project ids: ${legacyProjects.map(p => p.id).join(', ')}.`,
        workOrderNo: workOrder?.woNo,
        contractorName: workOrder?.contractorName,
        projectName: resolvedProjectName,
        legacyProjectId: legacyProjects[0].id,
      });
    }

    // Filter to this work order: match by workOrderId/woNo field if present,
    // OR by the work order number appearing in the task's group/subgroup
    // name (this is how the WBS/site-task screen actually tags tasks, per
    // "Work Order 26-27/397" appearing as the group name).
    let workOrderTasks = allTasks;
    let woMatchStrategy = 'all-project-tasks';
    if (workOrder?.woNo) {
      const woTag = String(workOrder.woNo).toLowerCase();
      const byWO = allTasks.filter(t => {
        const directMatch = t.workOrderId === workOrderId || t.workOrderId === workOrder.woNo;
        const groupMatch = String(t.groupName || '').toLowerCase().includes(woTag);
        const subgroupMatch = String(t.subgroupName || '').toLowerCase().includes(woTag);
        return directMatch || groupMatch || subgroupMatch;
      });
      if (byWO.length > 0) {
        workOrderTasks = byWO;
        woMatchStrategy = 'matched-by-work-order';
      }
    }

    // Include all tasks that have ANY completed qty (not just approved)
    const tasksWithProgress = workOrderTasks.filter(t => Number(t.cumulativeQty ?? t.completedQty ?? 0) > 0);
    const tasks = (tasksWithProgress.length > 0 ? tasksWithProgress : workOrderTasks).map(mapTask);

    const approvedTasks = tasks.filter(t => t.verificationStatus === 'Quality Approved');
    const allCompletedTasks = tasks.filter(t => t.qty > 0);
    const totalApprovedAmount = approvedTasks.reduce((sum, t) => sum + t.amount, 0);
    const totalAllAmount = allCompletedTasks.reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      tasks,
      approvedTasks,
      allCompletedTasks,
      totalApprovedAmount,
      totalAllAmount,
      workOrderNo: workOrder?.woNo,
      contractorName: workOrder?.contractorName,
      projectName: resolvedProjectName,
      legacyProjectId: legacyProjects[0].id,
      ...(tasks.length === 0
        ? { message: `Project and site data found, but no tasks matched work order "${workOrder?.woNo}".` }
        : {}),
      debug: { woMatchStrategy, totalTasksInFile: allTasks.length },
    });
  } catch (error) {
    console.error('Error fetching pending RA bill tasks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
