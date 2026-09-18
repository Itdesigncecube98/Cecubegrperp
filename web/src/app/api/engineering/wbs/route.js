export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    let where = {};
    if (projectId) {
      where.projectId = projectId;
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
      const { projectId, groupId, name, volOfWorkMaterial, volOfWorkLabour, description, reraStage, materialRate, labourRate } = body;

      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Task name is required' }, { status: 400 });
      }
      if (!groupId) {
        return NextResponse.json({ error: 'Parent group ID is required for task' }, { status: 400 });
      }

      // If projectId is not provided directly, get it from the group
      let finalProjectId = projectId;
      if (!finalProjectId) {
        const group = await prisma.wbsGroup.findUnique({ where: { id: groupId } });
        if (!group) {
          return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }
        finalProjectId = group.projectId;
      }

      const task = await prisma.wbsTask.create({
        data: {
          projectId: finalProjectId,
          groupId,
          name: name.trim(),
          volOfWorkMaterial: parseFloat(volOfWorkMaterial) || 0,
          materialRate: parseFloat(materialRate) || 0,
          materialAmount: (parseFloat(volOfWorkMaterial) || 0) * (parseFloat(materialRate) || 0),
          volOfWorkLabour: parseFloat(volOfWorkLabour) || 0,
          labourRate: parseFloat(labourRate) || 0,
          labourAmount: (parseFloat(volOfWorkLabour) || 0) * (parseFloat(labourRate) || 0),
          totalAmount: ((parseFloat(volOfWorkMaterial) || 0) * (parseFloat(materialRate) || 0)) + ((parseFloat(volOfWorkLabour) || 0) * (parseFloat(labourRate) || 0)),
          description: description ? description.trim() : null,
          reraStage: reraStage ? reraStage.trim() : null
        }
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

    const group = await prisma.wbsGroup.create({
      data: {
        projectId,
        name: name.trim(),
        reraStage: reraStage ? reraStage.trim() : null,
        rate: rate ? parseFloat(rate) : 0.0,
        budgetAmount: budgetAmount ? parseFloat(budgetAmount) : 0.0
      },
      include: {
        tasks: true
      }
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating WBS item:', error);
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
      const { name, volOfWorkMaterial, volOfWorkLabour, description, reraStage, groupId, materialRate, labourRate } = body;
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
      if (groupId !== undefined) updateData.groupId = groupId;

      // Ensure amounts are calculated correctly on update
      if (vMat !== undefined || rMat !== undefined || vLab !== undefined || rLab !== undefined) {
         // fetch current task to calculate properly if missing fields
         const currentTask = await prisma.wbsTask.findUnique({ where: { id } });
         const finalVMat = vMat !== undefined ? vMat : (currentTask.volOfWorkMaterial || 0);
         const finalRMat = rMat !== undefined ? rMat : (currentTask.materialRate || 0);
         const finalVLab = vLab !== undefined ? vLab : (currentTask.volOfWorkLabour || 0);
         const finalRLab = rLab !== undefined ? rLab : (currentTask.labourRate || 0);
         
         updateData.materialAmount = finalVMat * finalRMat;
         updateData.labourAmount = finalVLab * finalRLab;
         updateData.totalAmount = updateData.materialAmount + updateData.labourAmount;
      }

      const task = await prisma.wbsTask.update({
        where: { id },
        data: updateData
      });
      return NextResponse.json(task);
    }

    // Update Group
    const { name, reraStage, rate, budgetAmount } = body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (reraStage !== undefined) updateData.reraStage = reraStage ? reraStage.trim() : null;
    if (rate !== undefined) updateData.rate = rate ? parseFloat(rate) : 0.0;
    if (budgetAmount !== undefined) updateData.budgetAmount = budgetAmount ? parseFloat(budgetAmount) : 0.0;

    const group = await prisma.wbsGroup.update({
      where: { id },
      data: updateData,
      include: { tasks: true }
    });
    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating WBS item:', error);
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
      await prisma.wbsTask.delete({
        where: { id }
      });
      return NextResponse.json({ success: true, message: 'Task deleted successfully' });
    }

    // Default: try deleting group (or task if group fails)
    try {
      await prisma.wbsGroup.delete({
        where: { id }
      });
      return NextResponse.json({ success: true, message: 'Group deleted successfully' });
    } catch (grpErr) {
      // If not a group, try deleting as task
      await prisma.wbsTask.delete({
        where: { id }
      });
      return NextResponse.json({ success: true, message: 'Task deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting WBS item:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete WBS item' }, { status: 500 });
  }
}
