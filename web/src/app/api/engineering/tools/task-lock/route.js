export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.planning_data');

function getTaskLockStoragePath(projectId) {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  return path.join(STORAGE_DIR, `task_lock_${projectId}.json`);
}

// 8 Task Permissions requested by user:
// 1. editTaskEstimate: Do not allow to edit task estimate
// 2. addTask: Do not allow to add task
// 3. raiseRequisition: Do not allow to raise requisition
// 4. materialIssue: Do not allow material issue
// 5. extraIssue: Do not allow extra issue
// 6. nonEstimatedIssue: Do not allow non estimated issue
// 7. workCompletionEntry: Do not allow work completion entry
// 8. workOrderGeneration: Do not allow work order generation

const DEFAULT_PERMISSIONS = {
  editTaskEstimate: false,
  addTask: false,
  raiseRequisition: false,
  materialIssue: false,
  extraIssue: false,
  nonEstimatedIssue: false,
  workCompletionEntry: false,
  workOrderGeneration: false,
};

async function getDefaultLockTasksForProject(projectId) {
  let taskGroups = [];
  try {
    taskGroups = await prisma.taskLibraryGroup.findMany({
      include: {
        tasks: {
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
    console.warn('Error fetching task library groups for task lock', err);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  if (taskGroups && taskGroups.length > 0) {
    const list = [];
    taskGroups.forEach((grp, gIdx) => {
      const taskList = grp.tasks || [];
      taskList.forEach((taskItem, tIdx) => {
        // Pre-set some realistic lock patterns
        const isCompletedOrOld = (gIdx + tIdx) % 4 === 0;
        const isStrictControlled = (gIdx + tIdx) % 3 === 0;
        const unit = taskItem.unit || 'Nos';
        const qty = taskItem.quantity !== undefined ? taskItem.quantity : 1;

        list.push({
          id: `tl-${taskItem.id}`,
          taskLibraryId: taskItem.id,
          wbsCode: `${gIdx + 1}.${tIdx + 1}`,
          group: grp.name,
          subgroup: taskItem.description ? (taskItem.description.length > 35 ? taskItem.description.slice(0, 35) + '...' : taskItem.description) : 'General Execution',
          subgroup2: taskItem.materials?.[0]?.name ? `${taskItem.materials[0].name}` : 'Standard Specification',
          taskName: `${taskItem.name}${qty ? ` - ${qty} ${unit}` : ''}`,
          permissions: {
            editTaskEstimate: isCompletedOrOld,
            addTask: isCompletedOrOld,
            raiseRequisition: isCompletedOrOld,
            materialIssue: isCompletedOrOld,
            extraIssue: isStrictControlled,
            nonEstimatedIssue: true, // by default non-estimated issues are blocked
            workCompletionEntry: false,
            workOrderGeneration: isCompletedOrOld
          },
          lockDate: todayStr,
          lockedBy: 'Aditya Yadav',
          lockRemarks: isCompletedOrOld ? `Baseline frozen for ${taskItem.name}` : `Standard budget control active (${grp.name})`,
          history: [
            {
              id: `h-${Date.now()}-${tIdx}`,
              date: todayStr,
              action: `Initialized from Task Library [${grp.name}]`,
              user: 'Aditya Yadav'
            }
          ]
        });
      });
    });

    if (list.length > 0) return list;
  }

  // Fallback default tasks
  return [
    {
      id: 'tl-1',
      wbsCode: '1.1.1',
      group: 'CeCube Electrical Materials',
      subgroup: 'Wires & Cables',
      subgroup2: 'Building Wires 1.5mm',
      taskName: 'Copper Wire 1.5mm Point Wiring',
      permissions: {
        editTaskEstimate: true,
        addTask: true,
        raiseRequisition: false,
        materialIssue: false,
        extraIssue: true,
        nonEstimatedIssue: true,
        workCompletionEntry: false,
        workOrderGeneration: false
      },
      lockDate: todayStr,
      lockedBy: 'Aditya Yadav',
      lockRemarks: 'Baseline estimate locked; extra issue blocked without PM approval',
      history: []
    },
    {
      id: 'tl-2',
      wbsCode: '1.1.2',
      group: 'CeCube Electrical Materials',
      subgroup: 'Wires & Cables',
      subgroup2: 'Power Circuit Wires 2.5mm',
      taskName: 'Copper Wire 2.5mm Power Point Wiring',
      permissions: {
        editTaskEstimate: false,
        addTask: false,
        raiseRequisition: false,
        materialIssue: false,
        extraIssue: false,
        nonEstimatedIssue: true,
        workCompletionEntry: false,
        workOrderGeneration: false
      },
      lockDate: todayStr,
      lockedBy: 'Aditya Yadav',
      lockRemarks: 'Active task, non-estimated issue blocked',
      history: []
    },
    {
      id: 'tl-3',
      wbsCode: '2.1.1',
      group: 'DG Repair Work',
      subgroup: 'Lubricants & Consumables',
      subgroup2: 'Engine Oils 15W40',
      taskName: 'Engine Oil 15W40 Flushing & Refill',
      permissions: {
        editTaskEstimate: true,
        addTask: true,
        raiseRequisition: true,
        materialIssue: true,
        extraIssue: true,
        nonEstimatedIssue: true,
        workCompletionEntry: true,
        workOrderGeneration: true
      },
      lockDate: '2026-09-07',
      lockedBy: 'QC Lead',
      lockRemarks: 'Task completed and signed off. All operations fully locked.',
      history: []
    },
    {
      id: 'tl-4',
      wbsCode: '3.1.1',
      group: 'cable',
      subgroup: 'HT Transmission Cables',
      subgroup2: 'Armoured 11kV Cables',
      taskName: 'HT XLPE Cable 11kV Trench Laying',
      permissions: {
        editTaskEstimate: false,
        addTask: false,
        raiseRequisition: true,
        materialIssue: true,
        extraIssue: true,
        nonEstimatedIssue: true,
        workCompletionEntry: true,
        workOrderGeneration: false
      },
      lockDate: '2026-09-05',
      lockedBy: 'Site Engineer',
      lockRemarks: 'Site clearance pending, material requisitions and issues temporarily frozen',
      history: []
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

    const sync = searchParams.get('sync') === 'true';
    const filePath = getTaskLockStoragePath(projectId);
    if (!sync && fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed && Array.isArray(parsed.tasks)) {
          return NextResponse.json(parsed);
        }
      } catch (e) {
        console.warn('Could not read saved task lock file, generating defaults', e);
      }
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const defaultTasks = await getDefaultLockTasksForProject(projectId);

    const initialData = {
      projectId,
      projectName: project?.name || 'Selected Project',
      projectCode: project?.code || '',
      lastUpdated: new Date().toISOString(),
      tasks: defaultTasks
    };

    fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), 'utf8');
    return NextResponse.json(initialData);
  } catch (error) {
    console.error('Error fetching task lock data:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch task lock data' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { projectId, action, taskId, taskIds, permissionKey, isLocked, taskConfig, preset, allTasks } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const filePath = getTaskLockStoragePath(projectId);
    let state = {
      projectId,
      lastUpdated: new Date().toISOString(),
      tasks: []
    };

    if (fs.existsSync(filePath)) {
      try {
        state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        state.tasks = await getDefaultLockTasksForProject(projectId);
      }
    } else {
      state.tasks = await getDefaultLockTasksForProject(projectId);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Single toggle on a specific task permission
    if (action === 'TOGGLE_PERMISSION' && taskId && permissionKey) {
      const idx = state.tasks.findIndex(t => t.id === taskId);
      if (idx !== -1) {
        const prev = state.tasks[idx];
        const newLockState = isLocked !== undefined ? isLocked : !prev.permissions[permissionKey];
        prev.permissions[permissionKey] = newLockState;
        prev.lockDate = todayStr;
        prev.lockedBy = body.updatedBy || 'Aditya Yadav';
        
        if (!prev.history) prev.history = [];
        prev.history.unshift({
          id: `h-${Date.now()}`,
          date: todayStr,
          action: `${newLockState ? 'Locked (Blocked)' : 'Unlocked (Allowed)'} [${permissionKey}]`,
          user: body.updatedBy || 'Aditya Yadav'
        });

        state.lastUpdated = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
        return NextResponse.json({ success: true, task: prev });
      }
    }

    // 2. Column toggle for all tasks (or selected taskIds)
    if (action === 'TOGGLE_COLUMN' && permissionKey) {
      const targetIds = Array.isArray(taskIds) && taskIds.length > 0 ? new Set(taskIds) : null;
      state.tasks.forEach(t => {
        if (!targetIds || targetIds.has(t.id)) {
          t.permissions[permissionKey] = isLocked;
          t.lockDate = todayStr;
          t.lockedBy = body.updatedBy || 'Aditya Yadav';
        }
      });

      state.lastUpdated = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
      return NextResponse.json({ success: true, count: state.tasks.length });
    }

    // 3. Update full config for a single task (modal submission)
    if (action === 'UPDATE_TASK_CONFIG' && taskConfig && taskConfig.id) {
      const idx = state.tasks.findIndex(t => t.id === taskConfig.id);
      if (idx !== -1) {
        const prev = state.tasks[idx];
        state.tasks[idx] = {
          ...prev,
          permissions: {
            ...prev.permissions,
            ...taskConfig.permissions
          },
          lockRemarks: taskConfig.lockRemarks || prev.lockRemarks,
          lockDate: taskConfig.lockDate || todayStr,
          lockedBy: taskConfig.lockedBy || prev.lockedBy || 'Aditya Yadav'
        };

        if (!state.tasks[idx].history) state.tasks[idx].history = [];
        state.tasks[idx].history.unshift({
          id: `h-${Date.now()}`,
          date: taskConfig.lockDate || todayStr,
          action: `Full permissions update applied: ${taskConfig.lockRemarks || 'Custom permission set'}`,
          user: taskConfig.lockedBy || 'Aditya Yadav'
        });

        state.lastUpdated = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
        return NextResponse.json({ success: true, task: state.tasks[idx] });
      }
    }

    // 4. Apply Preset
    if (action === 'APPLY_PRESET' && preset) {
      const targetIds = Array.isArray(taskIds) && taskIds.length > 0 ? new Set(taskIds) : null;

      state.tasks.forEach(t => {
        if (!targetIds || targetIds.has(t.id)) {
          if (preset === 'LOCK_ALL') {
            // Lock all 8 operations
            Object.keys(t.permissions).forEach(k => { t.permissions[k] = true; });
            t.lockRemarks = 'Total freeze lock applied';
          } else if (preset === 'UNLOCK_ALL') {
            // Unlock all operations
            Object.keys(t.permissions).forEach(k => { t.permissions[k] = false; });
            t.lockRemarks = 'All permissions unlocked';
          } else if (preset === 'LOCK_REQUISITIONS') {
            // Requisition & Material Issues lock
            t.permissions.raiseRequisition = true;
            t.permissions.materialIssue = true;
            t.permissions.extraIssue = true;
            t.permissions.nonEstimatedIssue = true;
            t.lockRemarks = 'Requisition and Material Issue operations frozen';
          } else if (preset === 'LOCK_ESTIMATES') {
            // Estimates & Budget lock
            t.permissions.editTaskEstimate = true;
            t.permissions.addTask = true;
            t.lockRemarks = 'Task estimates and task creation locked';
          } else if (preset === 'LOCK_WORK_ENTRY') {
            // Work Completion & Work Order lock
            t.permissions.workCompletionEntry = true;
            t.permissions.workOrderGeneration = true;
            t.lockRemarks = 'Work completion entry and work order generation locked';
          }
          t.lockDate = todayStr;
          t.lockedBy = body.updatedBy || 'Aditya Yadav';
        }
      });

      state.lastUpdated = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
      return NextResponse.json({ success: true, tasks: state.tasks });
    }

    // 5. Save all tasks directly
    if (action === 'SAVE_ALL' && Array.isArray(allTasks)) {
      state.tasks = allTasks;
      state.lastUpdated = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
      return NextResponse.json({ success: true, count: allTasks.length });
    }

    return NextResponse.json({ error: 'Action not supported or invalid payload' }, { status: 400 });
  } catch (error) {
    console.error('Error modifying task lock state:', error);
    return NextResponse.json({ error: error.message || 'Failed to update task lock' }, { status: 500 });
  }
}
