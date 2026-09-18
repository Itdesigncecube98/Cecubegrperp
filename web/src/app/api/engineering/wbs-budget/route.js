export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

function isProjectBudgetLocked(projectId) {
  try {
    const STORAGE_DIR = path.join(process.cwd(), '.planning_data');
    const filePath = path.join(STORAGE_DIR, `project_budget_lock_${projectId}.json`);
    if (fs.existsSync(filePath)) {
      const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return config.isLocked === true;
    }
  } catch (err) {
    console.error('Error checking project lock status:', err);
  }
  return false;
}

async function syncProjectsWithTasks() {
  const projects = await prisma.project.findMany({
    include: {
      wbsGroups: {
        include: {
          tasks: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const validTaskIds = new Set();

  for (const p of projects) {
    const builtUp = parseFloat(p.builtUpArea) || 1;

    // 1. ALWAYS ensure the Project Row exists
    let pRow = await prisma.projectWbsTask.findFirst({
      where: { projectId: p.id, wbsGroupId: null, wbsTaskId: null }
    });
    
    if (!pRow) {
      pRow = await prisma.projectWbsTask.create({
        data: {
          projectId: p.id,
          taskName: p.name,
          approvedBuiltUpArea: builtUp,
          approvedRate: 0, approvedAmount: 0, allocatedRate: 0, allocatedAmount: 0,
          allocatedEstimateRate: 0, allocatedEstimateAmount: 0, unallocatedRate: 0, unallocatedAmount: 0,
          estimateRate: 0, estimateAmount: 0, expendedRate: 0, expendedAmount: 0
        }
      });
      validTaskIds.add(pRow.id);
    } else {
      if (pRow.taskName !== p.name) {
        await prisma.projectWbsTask.update({ where: { id: pRow.id }, data: { taskName: p.name } });
      }
      validTaskIds.add(pRow.id);
    }

    if (p.wbsGroups && p.wbsGroups.length > 0) {
      for (const g of p.wbsGroups) {
        // Sync Group Row
        let groupRow = await prisma.projectWbsTask.findFirst({
          where: { projectId: p.id, wbsGroupId: g.id, wbsTaskId: null }
        });
        

        if (!groupRow) {
          const newTask = await prisma.projectWbsTask.create({
            data: {
              projectId: p.id,
              taskName: g.name,
              wbsGroupId: g.id,
              approvedBuiltUpArea: builtUp,
              approvedRate: 0, approvedAmount: 0, allocatedRate: 0, allocatedAmount: 0,
              allocatedEstimateRate: 0, allocatedEstimateAmount: 0, unallocatedRate: 0, unallocatedAmount: 0,
              estimateRate: 0, estimateAmount: 0, expendedRate: 0, expendedAmount: 0
            }
          });
          validTaskIds.add(newTask.id);
        } else {
          if (groupRow.taskName !== g.name) {
            await prisma.projectWbsTask.update({ where: { id: groupRow.id }, data: { taskName: g.name } });
          }
          validTaskIds.add(groupRow.id);
        }

        // Sync Task Rows
        for (const t of g.tasks) {
          const expectedTaskName = `↳ ${t.name}`;
          let taskRow = await prisma.projectWbsTask.findFirst({
            where: { projectId: p.id, wbsTaskId: t.id }
          });

          if (!taskRow) {
            taskRow = await prisma.projectWbsTask.findFirst({
              where: { projectId: p.id, taskName: expectedTaskName, wbsTaskId: null, wbsGroupId: null }
            });
            if (taskRow) {
              taskRow = await prisma.projectWbsTask.update({
                where: { id: taskRow.id },
                data: { wbsTaskId: t.id, wbsGroupId: g.id }
              });
            }
          }

          if (!taskRow) {
            const newTask = await prisma.projectWbsTask.create({
              data: {
                projectId: p.id,
                taskName: expectedTaskName,
                wbsTaskId: t.id,
                wbsGroupId: g.id,
                approvedBuiltUpArea: builtUp,
                approvedRate: 0, approvedAmount: 0, allocatedRate: 0, allocatedAmount: 0,
                allocatedEstimateRate: 0, allocatedEstimateAmount: 0, unallocatedRate: 0, unallocatedAmount: 0,
                estimateRate: 0, estimateAmount: 0, expendedRate: 0, expendedAmount: 0
              }
            });
            validTaskIds.add(newTask.id);
          } else {
            if (taskRow.taskName !== expectedTaskName || taskRow.wbsGroupId !== g.id) {
              await prisma.projectWbsTask.update({ 
                where: { id: taskRow.id }, 
                data: { taskName: expectedTaskName, wbsGroupId: g.id } 
              });
            }
            validTaskIds.add(taskRow.id);
          }
        }
      }
    }
  }

  // Cleanup old tasks
  const allTasks = await prisma.projectWbsTask.findMany();
  for (const t of allTasks) {
    if (!validTaskIds.has(t.id)) {
      await prisma.projectWbsTask.delete({ where: { id: t.id } }).catch(() => {});
    }
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const sync = searchParams.get('sync');

    // Run sync only when explicitly requested
    if (sync === 'true') {
      await syncProjectsWithTasks();
    }

    let where = {};
    if (projectId && projectId !== 'ALL') {
      where.projectId = projectId;
    }

    let tasks = await prisma.projectWbsTask.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            company: true,
            builtUpArea: true,
            status: true
          }
        }
      }
    });

    // If specific project was requested but has no task yet, sync it
    if (tasks.length === 0 && projectId && projectId !== 'ALL') {
      await syncProjectsWithTasks();
      tasks = await prisma.projectWbsTask.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              company: true,
              builtUpArea: true,
              status: true
            }
          }
        }
      });
    }

    const isProjectLocked = projectId && projectId !== 'ALL' ? isProjectBudgetLocked(projectId) : false;

    return NextResponse.json({ tasks, isProjectLocked });
  } catch (error) {
    console.error('Error fetching WBS budget tasks:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();

    // Special action to trigger sync from frontend
    if (data.action === 'sync') {
      await syncProjectsWithTasks();
      const allTasks = await prisma.projectWbsTask.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          project: {
            select: { id: true, name: true, company: true, builtUpArea: true, status: true }
          }
        }
      });
      return NextResponse.json(allTasks);
    }

    if (!data.projectId || !data.taskName) {
      return NextResponse.json({ error: 'Project ID and Task Name are required' }, { status: 400 });
    }

    if (isProjectBudgetLocked(data.projectId)) {
      return NextResponse.json({ error: 'Project budget is locked to prevent discrepancies. Unlock budget in Set Budget Lock tool to add tasks.' }, { status: 403 });
    }

    const task = await prisma.projectWbsTask.create({
      data: {
        projectId: data.projectId,
        taskName: data.taskName,
        approvedBuiltUpArea: Number(data.approvedBuiltUpArea) || 0,
        approvedRate: Number(data.approvedRate) || 0,
        approvedAmount: Number(data.approvedAmount) || 0,
        allocatedRate: Number(data.allocatedRate) || 0,
        allocatedAmount: Number(data.allocatedAmount) || 0,
        allocatedEstimateRate: Number(data.allocatedEstimateRate) || 0,
        allocatedEstimateAmount: Number(data.allocatedEstimateAmount) || 0,
        unallocatedRate: Number(data.unallocatedRate) || 0,
        unallocatedAmount: Number(data.unallocatedAmount) || 0,
        estimateRate: Number(data.estimateRate) || 0,
        estimateAmount: Number(data.estimateAmount) || 0,
        expendedRate: Number(data.expendedRate) || 0,
        expendedAmount: Number(data.expendedAmount) || 0,
        budgetHeadCategory: data.budgetHeadCategory || null,
        remark: data.remark || null,
      }
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error creating WBS task:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const data = await req.json();
    const { id, project, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const existingTask = await prisma.projectWbsTask.findUnique({ where: { id } });
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (Object.keys(updateData).length > 1 || !('isLocked' in updateData)) {
      if (existingTask.isLocked || isProjectBudgetLocked(existingTask.projectId)) {
        return NextResponse.json({ error: 'Task/Project budget is locked. Modifications disallowed to prevent discrepancies.' }, { status: 403 });
      }
    }

    // Process numeric conversions
    const numericFields = [
      'approvedBuiltUpArea', 'approvedRate', 'approvedAmount',
      'allocatedRate', 'allocatedAmount',
      'allocatedEstimateRate', 'allocatedEstimateAmount',
      'unallocatedRate', 'unallocatedAmount',
      'estimateRate', 'estimateAmount',
      'expendedRate', 'expendedAmount'
    ];

    const sanitizedData = { ...updateData };
    for (const field of numericFields) {
      if (sanitizedData[field] !== undefined) {
        sanitizedData[field] = Number(sanitizedData[field]) || 0;
      }
    }

    const changes = {};
    for (const field of numericFields) {
      if (sanitizedData[field] !== undefined && existingTask[field] !== sanitizedData[field]) {
        changes[field] = { old: existingTask[field], new: sanitizedData[field] };
      }
    }

    const updateArgs = {
      where: { id },
      data: sanitizedData,
      include: {
        project: {
          select: { id: true, name: true, company: true, builtUpArea: true, status: true }
        }
      }
    };

    let updatedTask;
    if (Object.keys(changes).length > 0) {
      // Execute as a transaction
      const result = await prisma.$transaction([
        prisma.projectWbsTask.update(updateArgs),
        prisma.projectWbsBudgetHistory.create({
          data: {
            projectWbsTaskId: id,
            changes: changes
          }
        })
      ]);
      updatedTask = result[0];
    } else {
      updatedTask = await prisma.projectWbsTask.update(updateArgs);
    }

    // Automatically record to estimate changes log if estimate was modified
    try {
      const prevEstRate = existingTask.estimateRate || 0;
      const newEstRate = sanitizedData.estimateRate !== undefined ? sanitizedData.estimateRate : prevEstRate;
      const prevEstAmount = existingTask.estimateAmount || 0;
      const newEstAmount = sanitizedData.estimateAmount !== undefined ? sanitizedData.estimateAmount : prevEstAmount;

      if ((newEstRate !== prevEstRate || newEstAmount !== prevEstAmount) && existingTask.projectId) {
        const STORAGE_DIR = path.join(process.cwd(), '.planning_data');
        const estFilePath = path.join(STORAGE_DIR, `estimate_changes_${existingTask.projectId}.json`);
        let estData = { projectId: existingTask.projectId, changes: [] };
        if (fs.existsSync(estFilePath)) {
          try { estData = JSON.parse(fs.readFileSync(estFilePath, 'utf-8')); } catch (_) {}
        }
        if (!Array.isArray(estData.changes)) estData.changes = [];

        const existingRevs = estData.changes.filter(c => c.itemName === existingTask.taskName);
        const nextRevNo = `Rev ${existingRevs.length + 1}`;
        const nowIso = new Date().toISOString();

        const rateDiff = newEstRate - prevEstRate;
        const amtDiff = newEstAmount - prevEstAmount;

        const logEntry = {
          id: `est-chg-${Date.now()}`,
          projectId: existingTask.projectId,
          projectName: updatedTask.project?.name || 'Project',
          company: updatedTask.project?.company || 'Company',
          itemId: existingTask.id,
          itemName: existingTask.taskName,
          itemCategory: 'WBS Task',
          unit: 'Sqm',
          previousRate: prevEstRate,
          newRate: newEstRate,
          rateChange: rateDiff,
          rateChangePct: prevEstRate > 0 ? Number(((rateDiff / prevEstRate) * 100).toFixed(2)) : 0,
          previousAmount: prevEstAmount,
          newAmount: newEstAmount,
          amountChange: amtDiff,
          amountChangePct: prevEstAmount > 0 ? Number(((amtDiff / prevEstAmount) * 100).toFixed(2)) : 0,
          changedAt: nowIso,
          formattedDate: new Date(nowIso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(nowIso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          changedBy: 'WBS Budget Editor',
          reason: sanitizedData.remark || 'Estimate revision updated in WBS Budget',
          revisionNo: nextRevNo,
          status: 'Applied'
        };

        estData.changes.unshift(logEntry);
        estData.lastUpdated = nowIso;
        if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
        fs.writeFileSync(estFilePath, JSON.stringify(estData, null, 2), 'utf-8');
      }
    } catch (logErr) {
      console.warn('Failed to record estimate change audit log:', logErr);
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating WBS task:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    await prisma.projectWbsTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting WBS task:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
