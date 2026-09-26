export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function resolveProjectMaster(projectId) {
  let projectMaster = await prisma.projectMaster.findUnique({ where: { id: projectId }, select: { id: true, name: true } });
  if (projectMaster || !projectId) return projectMaster;

  const wbsProject = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, company: true, state: true }
  });
  if (!wbsProject) return null;

  projectMaster = await prisma.projectMaster.findFirst({ where: { name: wbsProject.name }, select: { id: true, name: true } });
  if (projectMaster) return projectMaster;

  return prisma.projectMaster.create({
    data: {
      projectId: `PROJECT-${wbsProject.id}`,
      name: wbsProject.name,
      clientName: wbsProject.company || null,
      location: wbsProject.state || null,
      projectType: 'EPC',
      status: 'Active'
    },
    select: { id: true, name: true }
  });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const id = searchParams.get('id');
    const projectMaster = projectId && !id ? await resolveProjectMaster(projectId) : null;
    const where = id ? { id } : projectId ? { projectId: projectMaster?.id || projectId } : {};
    
    const requisitions = await prisma.siteMaterialRequisition.findMany({
      where,
      include: { project: true, activity: true, purchaseIndent: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(requisitions);
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    return NextResponse.json({ error: 'Failed to fetch requisitions' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const projectMaster = await resolveProjectMaster(body.projectId);
    if (!projectMaster) {
      return NextResponse.json({ error: 'Selected project is not linked to an engineering Project Master record.' }, { status: 400 });
    }
    const materialItems = Array.isArray(body.items) && body.items.length > 0
      ? body.items
      : [{ materialName: body.materialName || body.itemDescription, unit: body.unit, quantityReq: body.quantityReq ?? body.quantity, poRate: body.poRate }];
    let requisitions;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        requisitions = await prisma.$transaction(async transaction => {
          const validItems = materialItems.filter(item => item.materialName || item.itemDescription);
          const wbsTask = body.taskName && body.projectId
            ? await transaction.wbsTask.findFirst({ where: { projectId: projectMaster.id, name: body.taskName }, select: { volOfWorkMaterial: true } })
            : null;
          if (wbsTask) {
            const previous = await transaction.siteMaterialRequisition.findMany({
              where: { projectId: projectMaster.id, taskName: body.taskName },
              select: { materialName: true, quantityReq: true }
            });
            for (const item of validItems) {
              const materialName = item.materialName || item.itemDescription;
              const alreadyRequested = previous
                .filter(requisition => requisition.materialName === materialName)
                .reduce((sum, requisition) => sum + Number(requisition.quantityReq || 0), 0);
              const requestedNow = Number(item.quantityReq ?? item.quantity) || 0;
              if (alreadyRequested + requestedNow > Number(wbsTask.volOfWorkMaterial || 0)) {
                throw new Error(`${materialName} exceeds the remaining WBS quantity. Remaining: ${Math.max(0, Number(wbsTask.volOfWorkMaterial || 0) - alreadyRequested)}.`);
              }
            }
          }
          const maximum = await transaction.siteMaterialRequisition.aggregate({ _max: { serialNo: true } });
          const created = [];
          let nextSerial = (maximum._max.serialNo || 0) + 1;
          for (const item of validItems) {
            const materialName = item.materialName || item.itemDescription;
            if (!materialName) continue;
            created.push(await transaction.siteMaterialRequisition.create({
              data: {
                projectId: projectMaster.id,
                purchaseIndentId: null,
                serialNo: nextSerial,
                reqNo: `MRQ-${new Date().getFullYear()}-${String(nextSerial).padStart(4, '0')}`,
                taskName: body.taskName || null,
                activityId: body.activityId || null,
                materialName,
                itemDescription: item.itemDescription || materialName,
                reqDate: body.reqDate ? new Date(body.reqDate) : new Date(),
                quantityReq: parseFloat(item.quantityReq ?? item.quantity) || 0,
                unit: item.unit || 'Nos',
                poRate: parseFloat(item.poRate) || 0,
                requiredByDate: body.requiredByDate ? new Date(body.requiredByDate) : null,
                status: 'Pending',
                requestedById: body.requestedById || null
              },
              include: { project: true, activity: true, purchaseIndent: true }
            }));
            nextSerial += 1;
          }
          return created;
        });
        break;
      } catch (error) {
        if (error?.code !== 'P2002' || !error?.meta?.target?.includes('reqNo') || attempt === 2) throw error;
      }
    }
    return NextResponse.json(requisitions, { status: 201 });
  } catch (error) {
    console.error('Error creating requisition:', error);
    if (error?.message?.includes('exceeds the remaining WBS quantity')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create requisition' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'Requisition id is required' }, { status: 400 });
    const projectMaster = await resolveProjectMaster(body.projectId);
    if (!projectMaster) return NextResponse.json({ error: 'Selected project is not linked to an engineering Project Master record.' }, { status: 400 });
    const materialName = body.materialName || body.itemDescription;
    const existing = await prisma.siteMaterialRequisition.findUnique({ where: { id: body.id }, include: { purchaseIndent: true } });
    if (!existing) return NextResponse.json({ error: 'Material requisition not found' }, { status: 404 });
    const nextStatus = body.status || 'Pending';
    const requisition = await prisma.$transaction(async transaction => {
      let purchaseIndentId = existing.purchaseIndentId;
      if (nextStatus === 'Approved' && !purchaseIndentId) {
        const purchaseCount = await transaction.purchaseIndent.count();
        const purchaseIndent = await transaction.purchaseIndent.create({
          data: {
            prNo: `PR-${new Date().getFullYear()}-${String(purchaseCount + 1).padStart(4, '0')}`,
            project: projectMaster.name,
            requiredDate: body.requiredByDate ? new Date(body.requiredByDate) : existing.requiredByDate,
            purpose: `Material requisition for ${body.taskName || existing.taskName || 'site work'}`,
            status: 'Pending Approval',
            requestedById: body.requestedById || existing.requestedById || null,
            items: { create: [{
              item: materialName,
              specification: body.taskName || existing.taskName || null,
              unit: body.unit || existing.unit || 'Nos',
              quantity: parseFloat(body.quantityReq ?? body.quantity ?? existing.quantityReq) || 0,
              requiredDate: body.requiredByDate ? new Date(body.requiredByDate) : existing.requiredByDate
            }] }
          }
        });
        purchaseIndentId = purchaseIndent.id;
      }
      return transaction.siteMaterialRequisition.update({
        where: { id: body.id },
        data: {
          purchaseIndentId,
        projectId: projectMaster.id,
        taskName: body.taskName || null,
        activityId: body.activityId || null,
        materialName,
        itemDescription: body.itemDescription || materialName,
        reqDate: body.reqDate ? new Date(body.reqDate) : undefined,
        quantityReq: parseFloat(body.quantityReq ?? body.quantity) || 0,
        unit: body.unit || 'Nos',
        poRate: parseFloat(body.poRate) || 0,
        requiredByDate: body.requiredByDate ? new Date(body.requiredByDate) : null,
          status: nextStatus
        },
        include: { project: true, activity: true, purchaseIndent: true }
      });
    });
    return NextResponse.json(requisition);
  } catch (error) {
    console.error('Error updating requisition:', error);
    return NextResponse.json({ error: error.message || 'Failed to update requisition' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Requisition id is required' }, { status: 400 });
    await prisma.siteMaterialRequisition.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting requisition:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete requisition' }, { status: 500 });
  }
}
