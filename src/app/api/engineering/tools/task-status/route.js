export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.planning_data');

function getTaskStatusStoragePath(projectId) {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  return path.join(STORAGE_DIR, `task_status_${projectId}.json`);
}

async function getDefaultTasksForProject(projectId, libraryId) {
  // Fetch tasks directly from Task Library
  let taskGroups = [];
  try {
    taskGroups = await prisma.taskLibraryGroup.findMany({
      where: libraryId ? { libraryId } : undefined,
      include: {
        tasks: {
          where: { OR: [{ projectId }, { projectId: null }] },
          include: {
            materials: true,
            labours: true
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  } catch (err) {
    console.warn('Error fetching task library groups for task status', err);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  if (taskGroups && taskGroups.length > 0) {
    const list = [];
    const statuses = ['Started', 'Confirm', 'Normal', 'Tentative', 'Completed', 'Closed'];

    taskGroups.forEach((grp, gIdx) => {
      const taskList = grp.tasks || [];
      taskList.forEach((taskItem, tIdx) => {
        const currentStatus = statuses[(gIdx + tIdx) % statuses.length];
        const unit = taskItem.unit || 'Nos';
        const qty = taskItem.quantity !== undefined ? taskItem.quantity : 1;

        list.push({
          id: `ts-${taskItem.id}`,
          taskLibraryId: taskItem.id,
          wbsCode: `${gIdx + 1}.${tIdx + 1}`,
          group: grp.name,
          subgroup: taskItem.description ? (taskItem.description.length > 35 ? taskItem.description.slice(0, 35) + '...' : taskItem.description) : 'General Execution',
          subgroup2: taskItem.materials?.[0]?.name ? `${taskItem.materials[0].name}` : 'Standard Specification',
          taskName: `${taskItem.name}${qty ? ` - ${qty} ${unit}` : ''}`,
          unit,
          quantity: qty,
          status: currentStatus,
          changeDate: todayStr,
          remarks: `Task linked from Task Library [${grp.name}]`,
          history: [
            {
              id: `h-init-${taskItem.id}`,
              status: currentStatus,
              date: todayStr,
              remarks: `Synced from Task Library (${grp.name})`,
              changedBy: 'Aditya Yadav'
            }
          ]
        });
      });
    });

    if (list.length > 0) return list;
  }

  // Fallback defaults
  return [
    {
      id: 'ts-1',
      wbsCode: '1.1.1',
      group: 'CeCube Electrical Materials',
      subgroup: 'Wires & Cables',
      subgroup2: 'Building Wires 1.5mm',
      taskName: 'Copper Wire 1.5mm Point Wiring',
      status: 'Started',
      changeDate: todayStr,
      remarks: 'Corridor conduit wiring commenced in block A',
      history: [
        { id: 'h1', status: 'Confirm', date: '2026-09-01', remarks: 'Drawings approved', changedBy: 'Site Engineer' },
        { id: 'h2', status: 'Started', date: todayStr, remarks: 'Corridor conduit wiring commenced', changedBy: 'Aditya Yadav' }
      ]
    },
    {
      id: 'ts-2',
      wbsCode: '1.1.2',
      group: 'CeCube Electrical Materials',
      subgroup: 'Wires & Cables',
      subgroup2: 'Power Circuit Wires 2.5mm',
      taskName: 'Copper Wire 2.5mm Power Point Wiring',
      status: 'Confirm',
      changeDate: '2026-09-05',
      remarks: 'Material delivery verified on site, work confirmed',
      history: [
        { id: 'h3', status: 'Normal', date: '2026-08-28', remarks: 'Baseline scheduled', changedBy: 'Planning Lead' },
        { id: 'h4', status: 'Confirm', date: '2026-09-05', remarks: 'Material delivery verified on site', changedBy: 'Harmesh Kumar' }
      ]
    },
    {
      id: 'ts-3',
      wbsCode: '2.1.1',
      group: 'DG Repair Work',
      subgroup: 'Lubricants & Consumables',
      subgroup2: 'Engine Oils 15W40',
      taskName: 'Engine Oil 15W40 Flushing & Refill',
      status: 'Completed',
      changeDate: '2026-09-07',
      remarks: 'DG set test run successful for 4 hours',
      history: [
        { id: 'h5', status: 'Started', date: '2026-09-06', remarks: 'Flushing started', changedBy: 'Mechanical Lead' },
        { id: 'h6', status: 'Completed', date: '2026-09-07', remarks: 'DG set test run successful for 4 hours', changedBy: 'QC Inspector' }
      ]
    },
    {
      id: 'ts-4',
      wbsCode: '3.1.1',
      group: 'cable',
      subgroup: 'HT Transmission Cables',
      subgroup2: 'Armoured 11kV Cables',
      taskName: 'HT XLPE Cable 11kV Trench Laying',
      status: 'Tentative',
      changeDate: '2026-09-04',
      remarks: 'Trench excavation pending ROW clearance from authority',
      history: [
        { id: 'h7', status: 'Tentative', date: '2026-09-04', remarks: 'Pending ROW clearance', changedBy: 'Project Head' }
      ]
    },
    {
      id: 'ts-5',
      wbsCode: '4.1.1',
      group: 'Substation Works',
      subgroup: 'Switchgear & Panels',
      subgroup2: 'Indoor VCB Panel 11kV',
      taskName: 'HT Vacuum Circuit Breaker Final Handover',
      status: 'Closed',
      changeDate: '2026-08-30',
      remarks: 'Official handover certificate signed by client PMC',
      history: [
        { id: 'h8', status: 'Completed', date: '2026-08-25', remarks: 'Testing complete', changedBy: 'Commissioning Engr' },
        { id: 'h9', status: 'Closed', date: '2026-08-30', remarks: 'Official handover certificate signed', changedBy: 'Aditya Yadav' }
      ]
    }
  ];
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const libraryId = searchParams.get('libraryId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const sync = searchParams.get('sync') === 'true';
    const filePath = getTaskStatusStoragePath(projectId);
    if (!sync && fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json({ tasks: parsed, source: 'saved' });
        }
      } catch (e) {
        console.warn('Could not read saved task status file, generating defaults', e);
      }
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const tasks = await getDefaultTasksForProject(projectId, libraryId);
    return NextResponse.json({ tasks, source: 'generated', projectName: project?.name });
  } catch (error) {
    console.error('Error fetching task status:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch task status' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { projectId, libraryId, action, task, taskUpdate, tasks } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const filePath = getTaskStatusStoragePath(projectId);

    // Save all replacement
    if (action === 'SAVE_ALL' && Array.isArray(tasks)) {
      fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf8');
      return NextResponse.json({ success: true, count: tasks.length });
    }

    let currentList = [];
    if (fs.existsSync(filePath)) {
      try {
        currentList = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        currentList = [];
      }
    }

    if (currentList.length === 0) {
      currentList = await getDefaultTasksForProject(projectId, libraryId);
    }

    // Add new task
    if (action === 'ADD_TASK' && task) {
      const newTask = {
        id: `ts-${Date.now()}`,
        wbsCode: task.wbsCode || `${currentList.length + 1}.0`,
        group: task.group || 'General Works',
        subgroup: task.subgroup || 'Standard',
        subgroup2: task.subgroup2 || 'Execution',
        taskName: task.taskName,
        status: task.status || 'Normal',
        changeDate: task.changeDate || new Date().toISOString().split('T')[0],
        remarks: task.remarks || 'Task added manually',
        history: [
          {
            id: `h-${Date.now()}`,
            status: task.status || 'Normal',
            date: task.changeDate || new Date().toISOString().split('T')[0],
            remarks: task.remarks || 'Initial entry',
            changedBy: task.changedBy || 'Aditya Yadav'
          }
        ]
      };

      currentList.unshift(newTask);
      fs.writeFileSync(filePath, JSON.stringify(currentList, null, 2), 'utf8');
      return NextResponse.json({ success: true, task: newTask });
    }

    // Update status of single task
    if (action === 'UPDATE_STATUS' && taskUpdate) {
      const idx = currentList.findIndex(t => t.id === taskUpdate.id);
      if (idx !== -1) {
        const prev = currentList[idx];
        const newHistoryItem = {
          id: `h-${Date.now()}`,
          status: taskUpdate.status,
          date: taskUpdate.changeDate,
          remarks: taskUpdate.remarks || `Status changed to ${taskUpdate.status}`,
          changedBy: taskUpdate.changedBy || 'Aditya Yadav'
        };

        currentList[idx] = {
          ...prev,
          status: taskUpdate.status,
          changeDate: taskUpdate.changeDate,
          remarks: taskUpdate.remarks,
          history: [newHistoryItem, ...(prev.history || [])]
        };

        fs.writeFileSync(filePath, JSON.stringify(currentList, null, 2), 'utf8');
        return NextResponse.json({ success: true, task: currentList[idx] });
      }
    }

    return NextResponse.json({ error: 'Action not supported or missing data' }, { status: 400 });
  } catch (error) {
    console.error('Error saving task status:', error);
    return NextResponse.json({ error: error.message || 'Failed to save task status' }, { status: 500 });
  }
}
