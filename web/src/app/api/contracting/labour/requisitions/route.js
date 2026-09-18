export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/contracting/labour/requisitions
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const workOrderId = searchParams.get('workOrderId');
    const status = searchParams.get('status');
    
    const where = {};
    if (projectId) where.projectId = projectId;
    if (workOrderId) where.workOrderId = workOrderId;
    if (status) where.status = status;

    const requisitions = await prisma.labourRequisition.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, projectId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(requisitions);
  } catch (error) {
    console.error('Error fetching labour requisitions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/contracting/labour/requisitions
export async function POST(request) {
  try {
    const data = await request.json();
    const { projectId, workOrderId, category, designation, quantity, unit, duration, purpose, requiredDate } = data;

    if (!projectId || !category || !designation || !quantity) {
      return NextResponse.json({ error: 'projectId, category, designation, and quantity are required' }, { status: 400 });
    }

    // Verify project exists
    const project = await prisma.projectMaster.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // Generate requisition number
    const count = await prisma.labourRequisition.count({ where: { projectId } });
    const reqNo = `LREQ-${project.projectId || projectId.substring(0,4).toUpperCase()}-${String(count + 1).padStart(3, '0')}`;

    const newReq = await prisma.labourRequisition.create({
      data: {
        reqNo,
        projectId,
        workOrderId: workOrderId || null,
        date: new Date(),
        requiredDate: requiredDate ? new Date(requiredDate) : null,
        category,
        designation,
        quantity: parseInt(quantity) || 1,
        unit: unit || 'Day',
        duration: parseInt(duration) || 1,
        purpose: purpose || null,
        status: 'Pending',
      },
      include: {
        project: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(newReq, { status: 201 });
  } catch (error) {
    console.error('Error creating labour requisition:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/contracting/labour/requisitions
export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, status, remarks } = data;
    
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const VALID_STATUSES = ['Pending', 'Approved', 'Fulfilled', 'Cancelled'];
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;

    const updated = await prisma.labourRequisition.update({
      where: { id },
      data: updateData,
      include: { project: { select: { id: true, name: true } } }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating labour requisition:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
