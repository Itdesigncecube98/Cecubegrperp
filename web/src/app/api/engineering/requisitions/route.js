export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const id = searchParams.get('id');
    
    const where = id ? { id } : projectId ? { projectId } : {};
    
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
    const latest = await prisma.siteMaterialRequisition.findFirst({ orderBy: { serialNo: 'desc' }, select: { serialNo: true } });
    const serialNo = (latest?.serialNo || 0) + 1;
    const materialItems = Array.isArray(body.items) && body.items.length > 0
      ? body.items
      : [{ materialName: body.materialName || body.itemDescription, unit: body.unit, quantityReq: body.quantityReq ?? body.quantity, poRate: body.poRate }];
    const requisitions = await prisma.$transaction(async transaction => {
      const project = await transaction.projectMaster.findUnique({ where: { id: body.projectId }, select: { name: true } });
      const purchaseCount = await transaction.purchaseIndent.count();
      const validItems = materialItems.filter(item => item.materialName || item.itemDescription);
      const purchaseIndent = await transaction.purchaseIndent.create({
        data: {
          prNo: `PR-${new Date().getFullYear()}-${String(purchaseCount + 1).padStart(4, '0')}`,
          project: project?.name || '',
          requiredDate: body.requiredByDate ? new Date(body.requiredByDate) : null,
          purpose: `Material requisition for ${body.taskName || 'site work'}`,
          status: 'Pending Approval',
          requestedById: body.requestedById || null,
          items: {
            create: validItems.map(item => ({
              item: item.materialName || item.itemDescription,
              specification: body.taskName || null,
              unit: item.unit || 'Nos',
              quantity: parseFloat(item.quantityReq ?? item.quantity) || 0,
              requiredDate: body.requiredByDate ? new Date(body.requiredByDate) : null
            }))
          }
        }
      });
      const created = [];
      let nextSerial = serialNo;
      for (const item of validItems) {
        const materialName = item.materialName || item.itemDescription;
        if (!materialName) continue;
        created.push(await transaction.siteMaterialRequisition.create({
          data: {
            projectId: body.projectId,
            purchaseIndentId: purchaseIndent.id,
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
    return NextResponse.json(requisitions, { status: 201 });
  } catch (error) {
    console.error('Error creating requisition:', error);
    return NextResponse.json({ error: 'Failed to create requisition' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'Requisition id is required' }, { status: 400 });
    const materialName = body.materialName || body.itemDescription;
    const requisition = await prisma.siteMaterialRequisition.update({
      where: { id: body.id },
      data: {
        projectId: body.projectId,
        taskName: body.taskName || null,
        activityId: body.activityId || null,
        materialName,
        itemDescription: body.itemDescription || materialName,
        reqDate: body.reqDate ? new Date(body.reqDate) : undefined,
        quantityReq: parseFloat(body.quantityReq ?? body.quantity) || 0,
        unit: body.unit || 'Nos',
        poRate: parseFloat(body.poRate) || 0,
        requiredByDate: body.requiredByDate ? new Date(body.requiredByDate) : null,
        status: body.status || 'Pending'
      },
      include: { project: true, activity: true }
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
