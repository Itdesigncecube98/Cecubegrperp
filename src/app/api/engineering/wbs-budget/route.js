export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { employeeHasProjectModuleTool } from '@/lib/projectAccess';
import { getProjectExpendedAmount, getProjectOrderCommitments, isProjectBudgetLocked, lockProjectBudget, ProjectBudgetError } from '@/lib/projectAllocatedBudget';
import { calculateWbsTaskAmounts, sumWbsTaskBudgets } from '@/lib/wbsTaskBudget';
import { recalculateProjectWbsBudgetTotals } from '@/lib/projectWbsBudgetTotals';

async function syncProjectsWithTasks(projectId = null) {
  const projects = await prisma.project.findMany({
    where: projectId ? { id: projectId } : {},
    select: { id: true },
    orderBy: { createdAt: 'desc' }
  });

  for (const project of projects) {
    await prisma.$transaction(async tx => {
      await lockProjectBudget(tx, project.id);
      const currentProject = await tx.project.findUnique({
        where: { id: project.id },
        include: { wbsGroups: { include: { tasks: true } } }
      });
      if (!currentProject) return;

      const builtUp = 1;
      const validTaskIds = new Set();
      let projectRow = await tx.projectWbsTask.findFirst({
        where: { projectId: currentProject.id, wbsGroupId: null, wbsTaskId: null }
      });
      if (!projectRow) {
        projectRow = await tx.projectWbsTask.create({
          data: {
            projectId: currentProject.id,
            taskName: currentProject.name,
            approvedBuiltUpArea: builtUp,
          }
        });
      } else if (projectRow.taskName !== currentProject.name) {
        projectRow = await tx.projectWbsTask.update({
          where: { id: projectRow.id },
          data: { taskName: currentProject.name }
        });
      }
      validTaskIds.add(projectRow.id);
      const isProjectLocked = isProjectBudgetLocked(currentProject.id) || projectRow.isLocked;

      for (const group of currentProject.wbsGroups || []) {
        const configuredRate = Number(group.rate) || 0;
        const taskBudget = sumWbsTaskBudgets(group.tasks || []);
        const definedGroupBudget = Number(group.budgetAmount) || configuredRate || taskBudget;
        let groupRow = await tx.projectWbsTask.findFirst({
          where: { projectId: currentProject.id, wbsGroupId: group.id, wbsTaskId: null }
        });
        const groupBudgetLocked = isProjectLocked || groupRow?.isLocked;
        const groupBudget = groupBudgetLocked && groupRow
          ? Number(groupRow.approvedAmount) || 0
          : definedGroupBudget;
        const groupRate = groupBudgetLocked && groupRow
          ? Number(groupRow.approvedRate) || groupBudget
          : configuredRate || groupBudget / builtUp;

        if (!groupRow) {
          groupRow = await tx.projectWbsTask.create({
            data: {
              projectId: currentProject.id,
              taskName: group.name,
              wbsGroupId: group.id,
              approvedBuiltUpArea: builtUp,
              approvedRate: groupRate,
              approvedAmount: groupBudget,
              allocatedRate: groupBudget,
              allocatedAmount: groupBudget,
              unallocatedRate: 0,
              unallocatedAmount: 0,
            }
          });
          if (groupBudget > 0) {
            await tx.projectWbsBudgetHistory.create({
              data: {
                projectWbsTaskId: groupRow.id,
                changes: {
                  approvedAmount: { old: 0, new: groupBudget },
                  allocatedAmount: { old: 0, new: groupBudget },
                  unallocatedAmount: { old: 0, new: 0 },
                },
              },
            });
          }
        } else {
          const updateData = {};
          const changes = {};
          if (groupRow.taskName !== group.name) updateData.taskName = group.name;
          if (Math.abs((Number(groupRow.approvedRate) || 0) - groupRate) > 0.01) updateData.approvedRate = groupRate;
          if (Math.abs((Number(groupRow.approvedAmount) || 0) - groupBudget) > 0.01) {
            updateData.approvedAmount = groupBudget;
            changes.approvedAmount = { old: groupRow.approvedAmount, new: groupBudget };
          }
          if (Math.abs((Number(groupRow.allocatedAmount) || 0) - groupBudget) > 0.01) {
            updateData.allocatedAmount = groupBudget;
            updateData.allocatedRate = groupBudget / builtUp;
            changes.allocatedAmount = { old: groupRow.allocatedAmount, new: groupBudget };
          }
          if ((Number(groupRow.unallocatedAmount) || 0) > 0.01) {
            updateData.unallocatedAmount = 0;
            updateData.unallocatedRate = 0;
            changes.unallocatedAmount = { old: groupRow.unallocatedAmount, new: 0 };
          }
          if (Object.keys(updateData).length > 0) {
            groupRow = await tx.projectWbsTask.update({ where: { id: groupRow.id }, data: updateData });
          }
          if (Object.keys(changes).length > 0) {
            await tx.projectWbsBudgetHistory.create({
              data: { projectWbsTaskId: groupRow.id, changes }
            });
          }
        }
        validTaskIds.add(groupRow.id);

        for (const wbsTask of group.tasks) {
          const expectedTaskName = `↳ ${wbsTask.name}`;
          let taskRow = await tx.projectWbsTask.findFirst({
            where: { projectId: currentProject.id, wbsTaskId: wbsTask.id }
          });
          if (!taskRow) {
            taskRow = await tx.projectWbsTask.findFirst({
              where: {
                projectId: currentProject.id,
                taskName: expectedTaskName,
                wbsTaskId: null,
                wbsGroupId: null,
              }
            });
            if (taskRow) {
              taskRow = await tx.projectWbsTask.update({
                where: { id: taskRow.id },
                data: { wbsTaskId: wbsTask.id, wbsGroupId: group.id }
              });
            }
          }
          if (!taskRow) {
            const taskAmounts = calculateWbsTaskAmounts(wbsTask);
            taskRow = await tx.projectWbsTask.create({
              data: {
                projectId: currentProject.id,
                taskName: expectedTaskName,
                wbsTaskId: wbsTask.id,
                wbsGroupId: group.id,
                approvedBuiltUpArea: builtUp,
                approvedRate: taskAmounts.totalAmount,
                approvedAmount: taskAmounts.totalAmount,
              }
            });
            if (taskAmounts.totalAmount > 0) {
              await tx.projectWbsBudgetHistory.create({
                data: {
                  projectWbsTaskId: taskRow.id,
                  changes: { approvedAmount: { old: 0, new: taskAmounts.totalAmount } },
                },
              });
            }
          } else if (taskRow.taskName !== expectedTaskName || taskRow.wbsGroupId !== group.id) {
            taskRow = await tx.projectWbsTask.update({
              where: { id: taskRow.id },
              data: { taskName: expectedTaskName, wbsGroupId: group.id }
            });
          }
          const taskAmounts = calculateWbsTaskAmounts(wbsTask);
          if (!isProjectLocked && !groupRow?.isLocked && !taskRow.isLocked
            && Math.abs((Number(taskRow.approvedAmount) || 0) - taskAmounts.totalAmount) > 0.01) {
            const previousAmount = Number(taskRow.approvedAmount) || 0;
            taskRow = await tx.projectWbsTask.update({
              where: { id: taskRow.id },
              data: { approvedAmount: taskAmounts.totalAmount, approvedRate: taskAmounts.totalAmount },
            });
            await tx.projectWbsBudgetHistory.create({
              data: {
                projectWbsTaskId: taskRow.id,
                changes: { approvedAmount: { old: previousAmount, new: taskAmounts.totalAmount } },
              },
            });
          }
          validTaskIds.add(taskRow.id);
        }
      }

      const existingRows = await tx.projectWbsTask.findMany({
        where: { projectId: currentProject.id },
        select: { id: true }
      });
      for (const row of existingRows) {
        if (!validTaskIds.has(row.id)) {
          await tx.projectWbsTask.delete({ where: { id: row.id } });
        }
      }
      await recalculateProjectWbsBudgetTotals(tx, currentProject.id);
    });
  }
}

export async function GET(req) {
  try {
    const session = readAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const sync = searchParams.get('sync');

    // Keep WBS group budgets current while limiting employee sync to granted projects.
    if (sync === 'true') {
      if (session.type === 'admin') {
        await syncProjectsWithTasks(projectId && projectId !== 'ALL' ? projectId : null);
      } else {
        const [grants, employeeWideBudgetGrant] = await Promise.all([prisma.employeeProjectToolAccess.findMany({
          where: {
            employeeId: session.id,
            granted: true,
            projectId: { not: '__EMPLOYEE_WIDE__' },
            tool: { is: { module: 'Engineering', name: { in: ['WBS Budget / Estimate Allocation', 'WBS Budget Lock', 'WBS Budget Release'] } } },
          },
          select: { projectId: true },
          distinct: ['projectId'],
        }), prisma.employeeProjectToolAccess.findFirst({
          where: {
            employeeId: session.id,
            granted: true,
            projectId: '__EMPLOYEE_WIDE__',
            tool: { is: { module: 'Engineering', name: { in: ['WBS Budget Lock', 'WBS Budget Release'] } } },
          },
          select: { id: true },
        })]);
        const grantedProjectIds = grants.map(grant => grant.projectId);
        const projectIdsToSync = projectId && projectId !== 'ALL'
          ? (employeeWideBudgetGrant || grantedProjectIds.includes(projectId) ? [projectId] : [])
          : employeeWideBudgetGrant ? null : grantedProjectIds;
        if (projectId && projectId !== 'ALL' && projectIdsToSync.length === 0) {
          return NextResponse.json({ error: 'No WBS Budget access for this project.' }, { status: 403 });
        }
        if (projectIdsToSync === null) await syncProjectsWithTasks();
        else await Promise.all(projectIdsToSync.map(id => syncProjectsWithTasks(id)));
      }
    }

    let where = {};
    if (projectId && projectId !== 'ALL') {
      if (session.type === 'employee') {
        const [canView, canLock, canRelease] = await Promise.all([
          employeeHasProjectModuleTool(prisma, session.id, projectId, 'Engineering', 'WBS Budget / Estimate Allocation'),
          employeeHasProjectModuleTool(prisma, session.id, projectId, 'Engineering', 'WBS Budget Lock'),
          employeeHasProjectModuleTool(prisma, session.id, projectId, 'Engineering', 'WBS Budget Release'),
        ]);
        if (!canView && !canLock && !canRelease) return NextResponse.json({ error: 'No WBS Budget access for this project.' }, { status: 403 });
      }
      where.projectId = projectId;
    } else if (session.type === 'employee') {
      const [grants, employeeWideBudgetGrant] = await Promise.all([prisma.employeeProjectToolAccess.findMany({
        where: {
          employeeId: session.id,
          granted: true,
          projectId: { not: '__EMPLOYEE_WIDE__' },
          tool: { is: { module: 'Engineering', name: { in: ['WBS Budget / Estimate Allocation', 'WBS Budget Lock', 'WBS Budget Release'] } } },
        },
        select: { projectId: true },
        distinct: ['projectId'],
      }), prisma.employeeProjectToolAccess.findFirst({
        where: {
          employeeId: session.id,
          granted: true,
          projectId: '__EMPLOYEE_WIDE__',
          tool: { is: { module: 'Engineering', name: { in: ['WBS Budget Lock', 'WBS Budget Release'] } } },
        },
        select: { id: true },
      })]);
      if (!employeeWideBudgetGrant) {
        const projectIds = grants.map(grant => grant.projectId);
        if (!projectIds.length) return NextResponse.json({ tasks: [], isProjectLocked: false });
        where.projectId = { in: projectIds };
      }
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
            status: true
          }
        },
        budgetHistories: {
          select: { id: true, changes: true, createdAt: true },
          orderBy: { createdAt: 'asc' }
        },
      }
    });

    const projectIds = [...new Set(tasks.map(task => task.projectId))];
    const projectAmounts = new Map(await Promise.all(projectIds.map(async id => {
      const [allocatedEstimateAmount, expendedAmount, budgetLockActive] = await Promise.all([
        getProjectOrderCommitments(prisma, id),
        getProjectExpendedAmount(prisma, id),
        Promise.resolve(isProjectBudgetLocked(id)),
      ]);
      return [id, { allocatedEstimateAmount, expendedAmount, budgetLockActive }];
    })));
    tasks = tasks.map(task => {
      const isProjectRow = !task.wbsGroupId && !task.wbsTaskId;
      const amounts = projectAmounts.get(task.projectId) || {};
      const allocatedEstimateAmount = isProjectRow ? (amounts.allocatedEstimateAmount || 0) : 0;
      const releasedBudgetAmount = isProjectRow ? (Number(task.directAllocatedAmount) || 0) : 0;
      return {
        ...task,
        allocatedEstimateAmount,
        releasedBudgetAmount,
        budgetLockActive: Boolean(amounts.budgetLockActive),
        unallocatedEstimateAmount: isProjectRow
          ? releasedBudgetAmount - allocatedEstimateAmount
          : 0,
        expendedAmount: isProjectRow ? (amounts.expendedAmount || 0) : task.expendedAmount,
      };
    });

    // If specific project was requested but has no task yet, sync it
    if (session.type === 'admin' && tasks.length === 0 && projectId && projectId !== 'ALL') {
      await syncProjectsWithTasks(projectId);
      tasks = await prisma.projectWbsTask.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              company: true,
              status: true
            }
          }
        }
      });
      const [allocatedEstimateAmount, expendedAmount] = await Promise.all([
        getProjectOrderCommitments(prisma, projectId),
        getProjectExpendedAmount(prisma, projectId),
      ]);
      tasks = tasks.map(task => {
        const isProjectRow = !task.wbsGroupId && !task.wbsTaskId;
        return {
          ...task,
          allocatedEstimateAmount: isProjectRow ? allocatedEstimateAmount : 0,
          releasedBudgetAmount: isProjectRow ? (Number(task.directAllocatedAmount) || 0) : 0,
          unallocatedEstimateAmount: isProjectRow
            ? (Number(task.directAllocatedAmount) || 0) - allocatedEstimateAmount
            : 0,
          expendedAmount: isProjectRow ? expendedAmount : task.expendedAmount,
        };
      });
    }

    const isProjectLocked = projectId && projectId !== 'ALL'
      ? isProjectBudgetLocked(projectId) || tasks.some(task =>
        task.projectId === projectId && !task.wbsGroupId && !task.wbsTaskId && task.isLocked
      )
      : false;

    return NextResponse.json({ tasks, isProjectLocked });
  } catch (error) {
    console.error('Error fetching WBS budget tasks:', error);
    if (error instanceof ProjectBudgetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = readAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await req.json();

    // Special action to trigger sync from frontend
    if (data.action === 'sync') {
      if (session.type !== 'admin') return NextResponse.json({ error: 'Only admins can sync WBS budgets.' }, { status: 403 });
      await syncProjectsWithTasks();
      const allTasks = await prisma.projectWbsTask.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          project: {
            select: { id: true, name: true, company: true, status: true }
          }
        }
      });
      return NextResponse.json(allTasks);
    }

    return NextResponse.json({ error: 'Budgets can only be created from Define WBS groups.' }, { status: 400 });
  } catch (error) {
    console.error('Error creating WBS task:', error);
    if (error instanceof ProjectBudgetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = readAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await req.json();
    const { id, project, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const existingTask = await prisma.projectWbsTask.findUnique({ where: { id } });
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (session.type === 'employee') {
      const changesLock = updateData.isLocked !== undefined;
      const changesRelease = updateData.releaseAmount !== undefined;
      const changesBudget = Object.keys(updateData).some(field => field !== 'isLocked' && field !== 'releaseAmount');
      const [canLock, canRelease, canEdit] = await Promise.all([
        updateData.isLocked !== undefined
          ? employeeHasProjectModuleTool(prisma, session.id, existingTask.projectId, 'Engineering', 'WBS Budget Lock')
          : Promise.resolve(true),
        changesRelease
          ? employeeHasProjectModuleTool(prisma, session.id, existingTask.projectId, 'Engineering', 'WBS Budget Release')
          : Promise.resolve(true),
        changesBudget
          ? employeeHasProjectModuleTool(prisma, session.id, existingTask.projectId, 'Engineering', 'WBS Budget / Estimate Allocation')
          : Promise.resolve(true),
      ]);
      if ((changesLock && !canLock) || (changesRelease && !canRelease) || (changesBudget && !canEdit)) {
        return NextResponse.json({ error: 'You do not have the required WBS Budget permission for this project.' }, { status: 403 });
      }
    }

    const isProjectRow = !existingTask.wbsGroupId && !existingTask.wbsTaskId;
    const isGroupRow = Boolean(existingTask.wbsGroupId && !existingTask.wbsTaskId);
    const budgetFields = Object.keys(updateData).filter(field => field !== 'isLocked');
    const editableFields = isProjectRow
      ? new Set(['approvedAmount', 'releaseAmount', 'budgetHeadCategory', 'remark', 'isLocked'])
      : isGroupRow
        ? new Set(['budgetHeadCategory', 'remark', 'isLocked'])
        : new Set(['isLocked']);
    const unsupportedFields = Object.keys(updateData).filter(field => !editableFields.has(field));
    if (unsupportedFields.length) {
      return NextResponse.json({ error: `These WBS budget fields are calculated from Define WBS or PO/WO totals: ${unsupportedFields.join(', ')}.` }, { status: 400 });
    }

    if (budgetFields.length > 0) {
      const projectRow = await prisma.projectWbsTask.findFirst({
        where: { projectId: existingTask.projectId, wbsGroupId: null, wbsTaskId: null },
        select: { isLocked: true }
      });
      if (existingTask.isLocked || projectRow?.isLocked || isProjectBudgetLocked(existingTask.projectId)) {
        return NextResponse.json({ error: 'Group/Project budget is locked. Modifications disallowed to prevent discrepancies.' }, { status: 403 });
      }
    }

    const sanitizedData = { ...updateData };
    for (const field of ['approvedAmount']) {
      if (sanitizedData[field] !== undefined) {
        sanitizedData[field] = Number(sanitizedData[field]);
        if (!Number.isFinite(sanitizedData[field]) || sanitizedData[field] < 0) {
          return NextResponse.json({ error: 'Approved budget must be a non-negative number.' }, { status: 400 });
        }
      }
    }
    if (sanitizedData.releaseAmount !== undefined) {
      sanitizedData.releaseAmount = Number(sanitizedData.releaseAmount);
      if (!isProjectRow || !Number.isFinite(sanitizedData.releaseAmount) || sanitizedData.releaseAmount <= 0) {
        return NextResponse.json({ error: 'Enter a positive release amount on the project budget row.' }, { status: 400 });
      }
      if (Object.keys(sanitizedData).some(field => field !== 'releaseAmount')) {
        return NextResponse.json({ error: 'Release budget must be submitted as a separate action.' }, { status: 400 });
      }
    }

    const updatedTask = await prisma.$transaction(async tx => {
      if (budgetFields.length > 0) await lockProjectBudget(tx, existingTask.projectId);
      const currentTask = await tx.projectWbsTask.findUnique({ where: { id } });
      if (!currentTask) throw new ProjectBudgetError('Task not found.', 404);

      const amountToSave = { ...sanitizedData };
      if (sanitizedData.releaseAmount !== undefined) {
        const previousReleased = Number(currentTask.directAllocatedAmount) || 0;
        const releasedBudgetAmount = previousReleased + sanitizedData.releaseAmount;
        const approvedAmount = Number(currentTask.approvedAmount) || 0;
        if (releasedBudgetAmount > approvedAmount + 0.005) {
          throw new ProjectBudgetError('Total released budget cannot exceed the approved budget.', 409);
        }
        const committedAmount = await getProjectOrderCommitments(tx, currentTask.projectId);
        if (releasedBudgetAmount + 0.005 < committedAmount) {
          throw new ProjectBudgetError('Released budget cannot be lower than existing PO/WO commitments.', 409);
        }
        const savedTask = await tx.projectWbsTask.update({
          where: { id },
          data: { directAllocatedAmount: releasedBudgetAmount },
        });
        await tx.projectWbsBudgetHistory.create({
          data: {
            projectWbsTaskId: id,
            changes: {
              releaseBudget: {
                old: previousReleased,
                increment: sanitizedData.releaseAmount,
                new: releasedBudgetAmount,
              },
            },
          },
        });
        return savedTask;
      }
      if (sanitizedData.approvedAmount !== undefined) {
        const [groupTotals, committedAmount, expendedAmount] = await Promise.all([
          tx.projectWbsTask.aggregate({
            where: { projectId: currentTask.projectId, wbsGroupId: { not: null }, wbsTaskId: null },
            _sum: { allocatedAmount: true },
          }),
          getProjectOrderCommitments(tx, currentTask.projectId),
          getProjectExpendedAmount(tx, currentTask.projectId),
        ]);
        const allocatedAmount = Number(groupTotals._sum.allocatedAmount) || 0;
        const releasedBudgetAmount = Number(currentTask.directAllocatedAmount) || 0;
        const minimumApprovedAmount = Math.max(allocatedAmount, releasedBudgetAmount, committedAmount, expendedAmount);
        if (sanitizedData.approvedAmount + 0.005 < minimumApprovedAmount) {
          throw new ProjectBudgetError('Approved budget cannot be lower than the WBS allocation, PO/WO commitments, or billed expenditure.', 409);
        }
      }

      const changes = {};
      for (const field of ['approvedAmount', 'budgetHeadCategory', 'remark']) {
        if (amountToSave[field] !== undefined && Math.abs((Number(currentTask[field]) || 0) - amountToSave[field]) > 0.005) {
          changes[field] = { old: currentTask[field], new: amountToSave[field] };
        }
      }

      const savedTask = await tx.projectWbsTask.update({
        where: { id },
        data: amountToSave,
        include: {
          project: {
            select: { id: true, name: true, company: true, status: true }
          }
        }
      });

      if (Object.keys(changes).length > 0) {
        await tx.projectWbsBudgetHistory.create({
          data: {
            projectWbsTaskId: id,
            changes
          }
        });
      }

      if (isProjectRow && sanitizedData.approvedAmount !== undefined) {
        await recalculateProjectWbsBudgetTotals(tx, existingTask.projectId);
      }

      return isProjectRow
        ? tx.projectWbsTask.findUnique({ where: { id } })
        : savedTask;
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating WBS task:', error);
    if (error instanceof ProjectBudgetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const row = await prisma.projectWbsTask.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json({ error: 'Budget row not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'WBS budget rows are managed by Define WBS and cannot be deleted here.' }, { status: 405 });
  } catch (error) {
    console.error('Error deleting WBS task:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
