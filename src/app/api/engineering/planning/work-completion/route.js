export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addTaskMasterTask, updateTaskMasterTask } from '@/lib/siteTaskMaster';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.planning_data');

function getWorkCompletionStoragePath(projectId) {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  return path.join(STORAGE_DIR, `completion_${projectId}.json`);
}

function getSiteTaskStatusPath(projectId) {
  const directory = path.join(process.cwd(), '.site_task_status');
  return path.join(directory, `project_${projectId}.json`);
}

function mapSiteTasks(groups, parentNames = []) {
  const rows = [];
  (groups || []).forEach((group, groupIndex) => {
    const hierarchy = [...parentNames, group.name].filter(Boolean);
    (group.tasks || []).forEach((task, taskIndex) => {
      const plannedQty = Number(task.plannedQty ?? task.quantity ?? 0);
      const completedQty = Number(task.completedQty ?? task.progressQty ?? 0);
      rows.push({
        id: task.id,
        wbsCode: task.wbsCode || `${groupIndex + 1}.${taskIndex + 1}`,
        taskName: task.name,
        groupName: hierarchy[0] || 'Site Tasks',
        subgroupName: hierarchy.slice(1).join(' / ') || group.name,
        materialName: task.materialName || task.name,
        specification: task.description || '',
        plannedQty,
        unit: task.unit || 'Job',
        previousQty: completedQty,
        completedQty,
        cumulativeQty: Number(task.cumulativeQty ?? completedQty),
        workPercent: Number(task.workPercent ?? (plannedQty > 0 ? (completedQty / plannedQty) * 100 : 0)),
        balanceQty: Math.max(0, plannedQty - completedQty),
        percentComplete: plannedQty > 0 ? Math.min(100, Math.round((completedQty / plannedQty) * 100)) : 0,
        targetDate: task.requiredDate || '',
        actualDate: task.completedDate || '',
        verificationStatus: task.status === 'Completed' || task.status === 'Closed' ? 'Quality Approved' : task.status === 'Started' ? 'Site Incharge Signed' : 'Pending Verification',
        mbRef: task.mbRef || '',
        siteRemarks: task.description || '',
        logs: Array.isArray(task.logs) ? task.logs : [],
        rate: Number(task.rate || 0),
        cumulativeAmount: Number(task.cumulativeQty ?? completedQty) * Number(task.rate || 0),
        balanceAmount: Math.max(0, plannedQty - Number(task.cumulativeQty ?? completedQty)) * Number(task.rate || 0),
        workOrderId: task.workOrderId || null,
        contractorName: task.contractorName || ''
      });
    });
    rows.push(...mapSiteTasks(group.subgroups, hierarchy));
  });
  return rows;
}

function onlyWorkOrderGroups(groups) {
  return (groups || []).map(group => ({
    ...group,
    tasks: (group.tasks || []).filter(task => task.source === 'Work Order' || task.workOrderId),
    subgroups: onlyWorkOrderGroups(group.subgroups).filter(subgroup => subgroup.tasks.length || subgroup.subgroups.length)
  })).filter(group => group.tasks.length || group.subgroups.length);
}

async function getDefaultWorkCompletionTasks(project, groups) {
  let matGroups = [];
  try {
    matGroups = await prisma.materialLibraryGroup.findMany({
      where: { parentId: null },
      include: {
        materials: true,
        subgroups: {
          include: { materials: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  } catch (err) {
    console.warn('Could not fetch material library groups for work completion', err);
  }

  if (matGroups && matGroups.length > 0) {
    const list = [];
    matGroups.forEach((grp, gIdx) => {
      const subList = grp.subgroups || [];
      subList.forEach((sub, sIdx) => {
        const matList = sub.materials || [];
        matList.forEach((mat, mIdx) => {
          const plannedQty = (mIdx === 0 ? 150 : (mIdx === 1 ? 80 : 45));
          const completedQty = mIdx === 0 ? 150 : (mIdx === 1 ? 52 : 12);
          const balanceQty = Math.max(0, plannedQty - completedQty);
          const percent = Math.min(100, Math.round((completedQty / plannedQty) * 100));

          list.push({
            id: `wc-${mat.id}`,
            wbsCode: `${gIdx + 1}.${sIdx + 1}.${mIdx + 1}`,
            taskName: `${mat.name} Installation`,
            groupName: grp.name,
            subgroupName: sub.name,
            materialName: mat.name,
            specification: mat.specification || 'Standard engineering specification',
            stage: 'Electrical Fittings',
            plannedQty,
            unit: mat.unit || 'Coil',
            previousQty: Math.round(completedQty * 0.7),
            completedQty,
            balanceQty,
            percentComplete: percent,
            targetDate: '2026-09-25',
            actualDate: percent >= 100 ? '2026-09-04' : '',
            verificationStatus: percent >= 100 ? 'Quality Approved' : (percent >= 50 ? 'Site Incharge Signed' : 'Pending Verification'),
            mbRef: `MB-0${gIdx + 1}/P-${10 + sIdx + mIdx}`,
            siteRemarks: `Material ${mat.name} laid as per site plan specifications`,
            logs: [
              {
                id: `log-${Date.now()}-${mIdx}`,
                date: '2026-09-04',
                shift: 'Day',
                qty: Math.round(completedQty * 0.3),
                engineer: 'Aditya Yadav',
                remark: 'Site installation inspected and verified'
              }
            ]
          });
        });
      });
    });

    if (list.length > 0) return list;
  }

  // Default tasks if no WBS tasks exist yet
  return [
    {
      id: 'wc-1',
      wbsCode: '1.1.1',
      taskName: 'Copper Wire 1.5mm Installation',
      groupName: 'CeCube Electrical Materials',
      subgroupName: 'Wires & Cables',
      materialName: 'Copper Wire 1.5mm',
      specification: 'ISI marked flame retardant multi-strand copper',
      stage: 'Electrical Fittings',
      plannedQty: 120,
      unit: 'Coil',
      previousQty: 90,
      completedQty: 120,
      balanceQty: 0,
      percentComplete: 100,
      targetDate: '2026-08-28',
      actualDate: '2026-08-27',
      verificationStatus: 'Quality Approved',
      mbRef: 'MB-01/P-12',
      siteRemarks: '100% Circuit wiring complete and continuity test passed',
      logs: [
        { id: 'l1', date: '2026-08-27', shift: 'Day', qty: 30, engineer: 'Aditya Yadav', remark: 'Final loop checks passed' }
      ]
    },
    {
      id: 'wc-2',
      wbsCode: '1.1.2',
      taskName: 'Copper Wire 2.5mm Installation',
      groupName: 'CeCube Electrical Materials',
      subgroupName: 'Wires & Cables',
      materialName: 'Copper Wire 2.5mm',
      specification: 'ISI marked flame retardant multi-strand copper',
      stage: 'Electrical Fittings',
      plannedQty: 80,
      unit: 'Coil',
      previousQty: 40,
      completedQty: 62,
      balanceQty: 18,
      percentComplete: 77.5,
      targetDate: '2026-09-15',
      actualDate: '',
      verificationStatus: 'Site Incharge Signed',
      mbRef: 'MB-01/P-16',
      siteRemarks: 'Power circuit wiring in progress in block B',
      logs: [
        { id: 'l2', date: '2026-09-06', shift: 'Day', qty: 22, engineer: 'Site Lead', remark: 'Block B corridor wiring' }
      ]
    },
    {
      id: 'wc-3',
      wbsCode: '2.1.1',
      taskName: 'Engine Oil 15W40 Top-up & Flushes',
      groupName: 'DG Repair Work',
      subgroupName: 'Lubricants & Consumables',
      materialName: 'Engine Oil 15W40',
      specification: 'API CI-4 heavy duty diesel engine oil',
      stage: 'Handover / Completion',
      plannedQty: 200,
      unit: 'Litre',
      previousQty: 80,
      completedQty: 140,
      balanceQty: 60,
      percentComplete: 70.0,
      targetDate: '2026-09-20',
      actualDate: '',
      verificationStatus: 'Pending Verification',
      mbRef: 'MB-02/P-05',
      siteRemarks: 'DG sets 1 & 2 serviced with new filter cartridges',
      logs: [
        { id: 'l3', date: '2026-09-07', shift: 'Day', qty: 60, engineer: 'Mechanical Lead', remark: 'Oil change and pressure check' }
      ]
    }
  ];
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
    if (project?.name) {
      const workOrders = await prisma.workOrder.findMany({
        where: { project: { name: project.name } },
        select: { woNo: true, contractorName: true, scope: true }
      });
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

    const siteTaskPath = getSiteTaskStatusPath(projectId);
    if (fs.existsSync(siteTaskPath)) {
      try {
        const siteTaskData = JSON.parse(fs.readFileSync(siteTaskPath, 'utf8'));
        return NextResponse.json({ tasks: mapSiteTasks(onlyWorkOrderGroups(siteTaskData.groups)), source: 'site-task-status' });
      } catch (error) {
        console.warn('Could not read Site Task Status data, continuing with saved work completion data', error);
      }
    }

    return NextResponse.json({ tasks: [], source: 'site-task-status' });

  } catch (error) {
    console.error('Error in GET work completion:', error);
    return NextResponse.json({ error: error.message || 'Failed to load work completion tasks' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { projectId, action, tasks, taskUpdate } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (taskUpdate?.id) {
      const updatedTask = updateTaskMasterTask(projectId, taskUpdate);
      if (!updatedTask) return NextResponse.json({ error: 'Task not found in Site Task Master' }, { status: 404 });
      return NextResponse.json({ success: true, updatedTask });
    }

    const filePath = getWorkCompletionStoragePath(projectId);

    // Full replacement
    if (action === 'SAVE_ALL' && Array.isArray(tasks)) {
      fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf8');
      return NextResponse.json({ success: true, count: tasks.length });
    }

    // Single task update or log entry
    let currentTasks = [];
    if (fs.existsSync(filePath)) {
      try {
        currentTasks = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        currentTasks = [];
      }
    }

    if (currentTasks.length === 0) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      const groups = await prisma.wbsGroup.findMany({
        where: { projectId },
        include: { tasks: true }
      });
      currentTasks = getDefaultWorkCompletionTasks(project, groups);
    }

    if (taskUpdate && taskUpdate.id) {
      const idx = currentTasks.findIndex(t => t.id === taskUpdate.id);
      if (idx !== -1) {
        currentTasks[idx] = { ...currentTasks[idx], ...taskUpdate };
      } else {
        currentTasks.push(taskUpdate);
      }
      fs.writeFileSync(filePath, JSON.stringify(currentTasks, null, 2), 'utf8');
      return NextResponse.json({ success: true, updatedTask: currentTasks[idx] });
    }

    return NextResponse.json({ error: 'Unsupported action or missing taskUpdate' }, { status: 400 });
  } catch (error) {
    console.error('Error saving work completion:', error);
    return NextResponse.json({ error: error.message || 'Failed to update work completion' }, { status: 500 });
  }
}
