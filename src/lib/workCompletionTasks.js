import fs from 'node:fs';
import path from 'node:path';

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
    verificationStatus: getVerificationStatus(task),
    statusTimeline: Array.isArray(task.statusTimeline) ? task.statusTimeline : [],
    mbRef: task.mbRef || '',
  };
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
