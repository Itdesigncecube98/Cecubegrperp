export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { employeeHasProjectModuleTool } from '@/lib/projectAccess';
import { getProjectOrderCommitments, isProjectBudgetLocked, lockProjectBudget, ProjectBudgetError } from '@/lib/projectAllocatedBudget';
import { calculateWbsTaskAmounts, sumWbsTaskBudgets } from '@/lib/wbsTaskBudget';

async function canAccessProject(request, projectId, toolName) {
  const session = readAuthSession(request);
  if (!session) return false;
  if (session.type === 'admin') return true;
  return employeeHasProjectModuleTool(prisma, session.id, projectId, 'Engineering', toolName);
}

async function assertProjectBudgetEditable(tx, projectId, groupId = null) {
  if (isProjectBudgetLocked(projectId)) {
    throw new ProjectBudgetError('Project budget is locked. Approved WBS budgets cannot be changed.', 409);
  }
  const rows = await tx.projectWbsTask.findMany({
    where: groupId
      ? {
          projectId,
          OR: [
            { wbsGroupId: null, wbsTaskId: null },
            { wbsGroupId: groupId, wbsTaskId: null },
          ],
        }
      : { projectId, wbsGroupId: null, wbsTaskId: null },
    select: { isLocked: true, wbsGroupId: true },
  });
  if (rows.some(row => row.isLocked)) {
    throw new ProjectBudgetError('Project or WBS group budget is locked. Approved budgets cannot be changed.', 409);
  }
}

async function updateProjectBudgetTotals(tx, projectId, projectRow) {
  const groupRows = await tx.projectWbsTask.findMany({
    where: { projectId, wbsGroupId: { not: null }, wbsTaskId: null },
    select: { approvedAmount: true, estimateAmount: true, allocatedEstimateAmount: true, expendedAmount: true },
  });
  const area = Number(projectRow.approvedBuiltUpArea) || 1;
  const allocatedAmount = groupRows.reduce((sum, row) => sum + (Number(row.approvedAmount) || 0), 0);
  const estimateAmount = groupRows.reduce((sum, row) => sum + (Number(row.estimateAmount) || 0), 0);
  const allocatedEstimateAmount = groupRows.reduce((sum, row) => sum + (Number(row.allocatedEstimateAmount) || 0), 0);
  const expendedAmount = groupRows.reduce((sum, row) => sum + (Number(row.expendedAmount) || 0), 0);
  const totals = {
    allocatedAmount,
    allocatedRate: allocatedAmount / area,
    unallocatedAmount: (Number(projectRow.approvedAmount) || 0) - allocatedAmount,
    unallocatedRate: ((Number(projectRow.approvedAmount) || 0) - allocatedAmount) / area,
    allocatedEstimateAmount,
    allocatedEstimateRate: allocatedEstimateAmount / area,
    estimateAmount,
    estimateRate: estimateAmount / area,
    expendedAmount,
    expendedRate: expendedAmount / area,
  };
  await tx.projectWbsTask.update({ where: { id: projectRow.id }, data: totals });
}

async function syncGroupBudgetRow(tx, { projectId, groupId, groupName, groupTotalBudget }) {
  const project = await tx.project.findUnique({ where: { id: projectId }, select: { name: true } });
  if (!project) throw new ProjectBudgetError('Project not found for WBS budget sync.', 404);

  let projectRow = await tx.projectWbsTask.findFirst({
    where: { projectId, wbsGroupId: null, wbsTaskId: null },
  });
  if (!projectRow) {
    projectRow = await tx.projectWbsTask.create({
      data: { projectId, taskName: project.name, approvedBuiltUpArea: 1 },
    });
  }

  const wbsTasks = await tx.wbsTask.findMany({
    where: { groupId },
    select: { materials: true, labours: true, volOfWorkMaterial: true, volOfWorkLabour: true, materialRate: true, labourRate: true },
  });
  const effectiveGroupBudget = Number(groupTotalBudget) || sumWbsTaskBudgets(wbsTasks);
  const budgetRow = await tx.projectWbsTask.findFirst({
    where: { projectId, wbsGroupId: groupId, wbsTaskId: null },
  });
  const groups = await tx.wbsGroup.findMany({
    where: { projectId },
    select: { id: true, budgetAmount: true, rate: true },
  });
  const nextWbsAllocation = groups.reduce((sum, group) => sum + (
    group.id === groupId
      ? effectiveGroupBudget
      : (Number(group.budgetAmount) || Number(group.rate) || 0)
  ), 0);
  const currentAllocation = await tx.projectWbsTask.aggregate({
    where: { projectId, wbsGroupId: { not: null }, wbsTaskId: null },
    _sum: { allocatedAmount: true },
  });
  const currentWbsAllocation = Number(currentAllocation._sum.allocatedAmount) || 0;
  const approvedProjectBudget = Number(projectRow.approvedAmount) || 0;
  const allocationIsBeingIncreased = nextWbsAllocation > currentWbsAllocation + 0.005;
  if (allocationIsBeingIncreased && approvedProjectBudget > 0 && nextWbsAllocation > approvedProjectBudget + 0.005) {
    throw new ProjectBudgetError('The WBS allocation cannot exceed the approved project budget.');
  }
  const committedAmount = await getProjectOrderCommitments(tx, projectId);
  if (nextWbsAllocation + 0.005 < committedAmount && nextWbsAllocation + 0.005 < currentWbsAllocation) {
    throw new ProjectBudgetError('The WBS allocation cannot be reduced below its existing PO and work order commitments.');
  }

  const allocatedAmount = effectiveGroupBudget;
  const unallocatedAmount = 0;
  const budgetData = {
    taskName: groupName,
    approvedRate: effectiveGroupBudget,
    approvedAmount: effectiveGroupBudget,
    allocatedRate: allocatedAmount,
    allocatedAmount,
    unallocatedRate: unallocatedAmount,
    unallocatedAmount,
  };
  let savedBudgetRow;
  if (budgetRow) {
    savedBudgetRow = await tx.projectWbsTask.update({ where: { id: budgetRow.id }, data: budgetData });
  } else {
    savedBudgetRow = await tx.projectWbsTask.create({
      data: {
        projectId,
        wbsGroupId: groupId,
        approvedBuiltUpArea: 1,
        allocatedRate: 0,
        allocatedAmount: 0,
        expendedRate: 0,
        expendedAmount: 0,
        ...budgetData,
      },
    });
  }

  const changes = {};
  if (Math.abs((Number(budgetRow?.approvedAmount) || 0) - effectiveGroupBudget) > 0.005) {
    changes.approvedAmount = { old: Number(budgetRow?.approvedAmount) || 0, new: effectiveGroupBudget };
  }
  if (Math.abs((Number(budgetRow?.allocatedAmount) || 0) - allocatedAmount) > 0.005) {
    changes.allocatedAmount = { old: Number(budgetRow?.allocatedAmount) || 0, new: allocatedAmount };
  }
  if (Math.abs((Number(budgetRow?.unallocatedAmount) || 0) - unallocatedAmount) > 0.005) {
    changes.unallocatedAmount = { old: Number(budgetRow?.unallocatedAmount) || 0, new: unallocatedAmount };
  }
  if (Object.keys(changes).length > 0) {
    await tx.projectWbsBudgetHistory.create({
      data: {
        projectWbsTaskId: savedBudgetRow.id,
        changes,
      },
    });
  }
  await updateProjectBudgetTotals(tx, projectId, projectRow);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    let where = {};
    if (projectId) {
      if (!await canAccessProject(req, projectId, 'Define WBS')) {
        return NextResponse.json({ error: 'You do not have Define WBS access for this project.' }, { status: 403 });
      }
      where.projectId = projectId;
    } else {
      const session = readAuthSession(req);
      if (!session || session.type !== 'admin') {
        return NextResponse.json({ error: 'Select a project with Define WBS access.' }, { status: 403 });
      }
    }

    const groups = await prisma.wbsGroup.findMany({
      where,
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const response = NextResponse.json(groups);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  } catch (error) {
    console.error('Error fetching WBS groups & tasks:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch WBS data' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { type } = body;

    // 1. Create Task
    if (type === 'task' || body.groupId) {
      const { projectId, groupId, name, volOfWorkMaterial, volOfWorkLabour, description, reraStage, materialRate, labourRate, materials, labours } = body;

      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Task name is required' }, { status: 400 });
      }
      if (!groupId) {
        return NextResponse.json({ error: 'Parent group ID is required for task' }, { status: 400 });
      }

      const parentGroup = await prisma.wbsGroup.findUnique({
        where: { id: groupId },
        select: { projectId: true, name: true, rate: true, budgetAmount: true },
      });
      if (!parentGroup) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      if (projectId && projectId !== parentGroup.projectId) return NextResponse.json({ error: 'Task project must match its parent group.' }, { status: 400 });
      const targetProjectId = parentGroup.projectId;
      if (!await canAccessProject(req, targetProjectId, 'WBS Add Task')) {
        return NextResponse.json({ error: 'You do not have Add Task access for this project.' }, { status: 403 });
      }

      const finalProjectId = parentGroup.projectId;
      const taskValues = {
        volOfWorkMaterial: Number(volOfWorkMaterial) || 0,
        volOfWorkLabour: Number(volOfWorkLabour) || 0,
        materialRate: Number(materialRate) || 0,
        labourRate: Number(labourRate) || 0,
        materials: Array.isArray(materials) ? materials : [],
        labours: Array.isArray(labours) ? labours : [],
      };
      const taskAmounts = calculateWbsTaskAmounts(taskValues);
      const task = await prisma.$transaction(async tx => {
        await lockProjectBudget(tx, finalProjectId);
        await assertProjectBudgetEditable(tx, finalProjectId, groupId);
        const createdTask = await tx.wbsTask.create({
          data: {
            projectId: finalProjectId,
            groupId,
            name: name.trim(),
            ...taskValues,
            ...taskAmounts,
            description: description ? description.trim() : null,
            reraStage: reraStage ? reraStage.trim() : null,
          }
        });
        await syncGroupBudgetRow(tx, {
          projectId: finalProjectId,
          groupId,
          groupName: parentGroup.name,
          groupTotalBudget: Number(parentGroup.budgetAmount) || Number(parentGroup.rate) || 0,
        });
        return createdTask;
      });

      return NextResponse.json(task, { status: 201 });
    }

    // 2. Create Group
    const { projectId, name, reraStage, rate, budgetAmount } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    if (!await canAccessProject(req, projectId, 'WBS Add Group')) {
      return NextResponse.json({ error: 'You do not have Add Group access for this project.' }, { status: 403 });
    }
    const groupTotalBudget = Number(budgetAmount ?? rate ?? 0);
    if (!Number.isFinite(groupTotalBudget) || groupTotalBudget < 0) {
      return NextResponse.json({ error: 'WBS group budget must be a non-negative number.' }, { status: 400 });
    }

    const group = await prisma.$transaction(async tx => {
      await lockProjectBudget(tx, projectId);
      await assertProjectBudgetEditable(tx, projectId);
      const createdGroup = await tx.wbsGroup.create({
        data: {
          projectId,
          name: name.trim(),
          reraStage: reraStage ? reraStage.trim() : null,
          rate: groupTotalBudget,
          budgetAmount: groupTotalBudget
        },
        include: { tasks: true }
      });
      await syncGroupBudgetRow(tx, {
        projectId,
        groupId: createdGroup.id,
        groupName: createdGroup.name,
        groupTotalBudget,
      });
      return createdGroup;
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating WBS item:', error);
    if (error instanceof ProjectBudgetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error?.message || 'Failed to create WBS item' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, type } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    if (type === 'task') {
      const existingTask = await prisma.wbsTask.findUnique({ where: { id }, select: { projectId: true, groupId: true } });
      if (!existingTask || !await canAccessProject(req, existingTask.projectId, 'WBS Edit Task')) {
        return NextResponse.json({ error: 'You do not have Edit Task access for this project.' }, { status: existingTask ? 403 : 404 });
      }
      const { name, volOfWorkMaterial, volOfWorkLabour, description, reraStage, groupId, materialRate, labourRate, materials, labours } = body;
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      
      const vMat = volOfWorkMaterial !== undefined ? parseFloat(volOfWorkMaterial) || 0 : undefined;
      const rMat = materialRate !== undefined ? parseFloat(materialRate) || 0 : undefined;
      const vLab = volOfWorkLabour !== undefined ? parseFloat(volOfWorkLabour) || 0 : undefined;
      const rLab = labourRate !== undefined ? parseFloat(labourRate) || 0 : undefined;
      
      if (vMat !== undefined) updateData.volOfWorkMaterial = vMat;
      if (rMat !== undefined) updateData.materialRate = rMat;
      if (vLab !== undefined) updateData.volOfWorkLabour = vLab;
      if (rLab !== undefined) updateData.labourRate = rLab;
      
      if (description !== undefined) updateData.description = description ? description.trim() : null;
      if (reraStage !== undefined) updateData.reraStage = reraStage ? reraStage.trim() : null;
      const destinationGroupId = groupId ?? existingTask.groupId;
      if (groupId !== undefined) updateData.group = { connect: { id: groupId } };
      if (materials !== undefined) updateData.materials = Array.isArray(materials) ? materials : [];
      if (labours !== undefined) updateData.labours = Array.isArray(labours) ? labours : [];

      if (destinationGroupId !== existingTask.groupId || groupId !== undefined) {
        const destinationGroup = await prisma.wbsGroup.findUnique({ where: { id: destinationGroupId }, select: { projectId: true } });
        if (!destinationGroup || destinationGroup.projectId !== existingTask.projectId) {
          return NextResponse.json({ error: 'Task must remain in a group from the same project.' }, { status: 400 });
        }
      }

      const task = await prisma.$transaction(async tx => {
        await lockProjectBudget(tx, existingTask.projectId);
        await assertProjectBudgetEditable(tx, existingTask.projectId, existingTask.groupId);
        if (destinationGroupId !== existingTask.groupId) {
          await assertProjectBudgetEditable(tx, existingTask.projectId, destinationGroupId);
        }
        const currentTask = await tx.wbsTask.findUnique({ where: { id } });
        if (!currentTask) throw new ProjectBudgetError('WBS task not found.', 404);
        const taskAmounts = calculateWbsTaskAmounts({
          ...currentTask,
          ...updateData,
          groupId: destinationGroupId,
        });
        const updatedTask = await tx.wbsTask.update({
          where: { id },
          data: { ...updateData, ...taskAmounts },
        });
        const affectedGroupIds = [...new Set([currentTask.groupId, destinationGroupId])];
        for (const affectedGroupId of affectedGroupIds) {
          const affectedGroup = await tx.wbsGroup.findUnique({
            where: { id: affectedGroupId },
            select: { projectId: true, name: true, rate: true, budgetAmount: true },
          });
          if (affectedGroup) {
            await syncGroupBudgetRow(tx, {
              projectId: affectedGroup.projectId,
              groupId: affectedGroupId,
              groupName: affectedGroup.name,
              groupTotalBudget: Number(affectedGroup.budgetAmount) || Number(affectedGroup.rate) || 0,
            });
          }
        }
        return updatedTask;
      });
      return NextResponse.json(task);
    }

    // Update Group
    const existingGroup = await prisma.wbsGroup.findUnique({
      where: { id },
      select: { projectId: true, name: true, rate: true, budgetAmount: true },
    });
    if (!existingGroup || !await canAccessProject(req, existingGroup.projectId, 'WBS Edit Group')) {
      return NextResponse.json({ error: 'You do not have Edit Group access for this project.' }, { status: existingGroup ? 403 : 404 });
    }
    const { name, reraStage, rate, budgetAmount } = body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (reraStage !== undefined) updateData.reraStage = reraStage ? reraStage.trim() : null;
    const rawGroupBudget = budgetAmount ?? rate;
    const groupTotalBudget = rawGroupBudget === undefined ? undefined : Number(rawGroupBudget);
    if (groupTotalBudget !== undefined && (!Number.isFinite(groupTotalBudget) || groupTotalBudget < 0)) {
      return NextResponse.json({ error: 'WBS group budget must be a non-negative number.' }, { status: 400 });
    }
    if (groupTotalBudget !== undefined) {
      updateData.rate = groupTotalBudget;
      updateData.budgetAmount = groupTotalBudget;
    }

    const group = await prisma.$transaction(async tx => {
      await lockProjectBudget(tx, existingGroup.projectId);
      await assertProjectBudgetEditable(tx, existingGroup.projectId, id);
      const updatedGroup = await tx.wbsGroup.update({
        where: { id },
        data: updateData,
        include: { tasks: true }
      });
      const storedGroupBudget = Number(existingGroup.budgetAmount) || Number(existingGroup.rate) || 0;
      const nextGroupBudget = groupTotalBudget === undefined ? storedGroupBudget : groupTotalBudget;
      await syncGroupBudgetRow(tx, {
        projectId: existingGroup.projectId,
        groupId: id,
        groupName: updatedGroup.name,
        groupTotalBudget: nextGroupBudget,
      });
      return updatedGroup;
    });
    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating WBS item:', error);
    if (error instanceof ProjectBudgetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error?.message || 'Failed to update WBS item' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    let id = null;
    let type = null;

    try {
      const body = await req.json();
      id = body?.id;
      type = body?.type;
    } catch (e) {
      // not JSON body
    }

    if (!id) {
      const { searchParams } = new URL(req.url);
      id = searchParams.get('id');
      type = searchParams.get('type');
    }

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    if (type === 'task') {
      const existingTask = await prisma.wbsTask.findUnique({ where: { id }, select: { projectId: true, groupId: true } });
      if (!existingTask || !await canAccessProject(req, existingTask.projectId, 'WBS Delete Task')) {
        return NextResponse.json({ error: 'You do not have Delete Task access for this project.' }, { status: existingTask ? 403 : 404 });
      }
      await prisma.$transaction(async tx => {
        await lockProjectBudget(tx, existingTask.projectId);
        await assertProjectBudgetEditable(tx, existingTask.projectId, existingTask.groupId);
        const group = await tx.wbsGroup.findUnique({
          where: { id: existingTask.groupId },
          select: { projectId: true, name: true, rate: true, budgetAmount: true },
        });
        await tx.wbsTask.delete({ where: { id } });
        if (group) {
          await syncGroupBudgetRow(tx, {
            projectId: group.projectId,
            groupId: existingTask.groupId,
            groupName: group.name,
            groupTotalBudget: Number(group.budgetAmount) || Number(group.rate) || 0,
          });
        }
      });
      return NextResponse.json({ success: true, message: 'Task deleted successfully' });
    }

    const existingGroup = await prisma.wbsGroup.findUnique({ where: { id }, select: { projectId: true } });
    if (!existingGroup || !await canAccessProject(req, existingGroup.projectId, 'WBS Delete Group')) {
      return NextResponse.json({ error: 'You do not have Delete Group access for this project.' }, { status: existingGroup ? 403 : 404 });
    }
    await prisma.$transaction(async tx => {
      await lockProjectBudget(tx, existingGroup.projectId);
      await assertProjectBudgetEditable(tx, existingGroup.projectId, id);
      const budgetRow = await tx.projectWbsTask.findFirst({
        where: { projectId: existingGroup.projectId, wbsGroupId: id, wbsTaskId: null },
        select: { allocatedAmount: true, expendedAmount: true }
      });
      if ((Number(budgetRow?.expendedAmount) || 0) > 0) {
        throw new ProjectBudgetError('A WBS group with expended budget cannot be deleted.', 409);
      }
      const projectAllocation = await tx.projectWbsTask.aggregate({
        where: { projectId: existingGroup.projectId, wbsGroupId: { not: null }, wbsTaskId: null },
        _sum: { allocatedAmount: true },
      });
      const remainingAllocation = Math.max(0, (Number(projectAllocation._sum.allocatedAmount) || 0) - (Number(budgetRow?.allocatedAmount) || 0));
      const committedAmount = await getProjectOrderCommitments(tx, existingGroup.projectId);
      if (remainingAllocation + 0.005 < committedAmount) {
        throw new ProjectBudgetError('The remaining WBS allocation cannot cover existing PO and work order commitments.', 409);
      }
      await tx.wbsGroup.delete({ where: { id } });
      await tx.projectWbsTask.deleteMany({ where: { projectId: existingGroup.projectId, wbsGroupId: id } });
      const projectRow = await tx.projectWbsTask.findFirst({
        where: { projectId: existingGroup.projectId, wbsGroupId: null, wbsTaskId: null },
      });
      if (projectRow) await updateProjectBudgetTotals(tx, existingGroup.projectId, projectRow);
    });
    return NextResponse.json({ success: true, message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting WBS item:', error);
    if (error instanceof ProjectBudgetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error?.message || 'Failed to delete WBS item' }, { status: 500 });
  }
}
