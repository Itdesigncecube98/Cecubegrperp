export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function resolveProjectMaster(projectId) {
  const existingMaster = await prisma.projectMaster.findUnique({
    where: { id: projectId }
  });
  if (existingMaster) return existingMaster;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  return prisma.projectMaster.upsert({
    where: { projectId: project.id },
    update: { name: project.name },
    create: {
      projectId: project.id,
      name: project.name,
      projectType: 'EPC',
      location: project.state || null,
      status: project.status === 'approved' ? 'Active' : 'Active'
    }
  });
}

// GET /api/contracting/labour/requisitions
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const workOrderId = searchParams.get('workOrderId');
    const status = searchParams.get('status');
    
    const where = {};
    if (projectId) {
      const project = await resolveProjectMaster(projectId);
      if (!project) return NextResponse.json([]);
      where.projectId = project.id;
    }
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
      const { projectId, workOrderId, category, designation, quantity, unit, rate, duration, purpose, requiredDate } = data;
  
      if (!projectId || !category || !designation || !quantity) {
        return NextResponse.json({ error: 'projectId, category, designation, and quantity are required' }, { status: 400 });
      }
  
      // The contracting UI uses the legacy Project model; requisitions use ProjectMaster.
      const project = await resolveProjectMaster(projectId);
      if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  
      // Generate requisition number
      const count = await prisma.labourRequisition.count({ where: { projectId } });
      const reqPrefix = `LREQ-${project.projectId || projectId.substring(0,4).toUpperCase()}`;
      let sequence = count + 1;
      let reqNo = `${reqPrefix}-${String(sequence).padStart(3, '0')}`;
      while (await prisma.labourRequisition.findUnique({ where: { reqNo } })) {
        sequence += 1;
        reqNo = `${reqPrefix}-${String(sequence).padStart(3, '0')}`;
      }
  
      const newReq = await prisma.labourRequisition.create({
        data: {
          reqNo,
          projectId: project.id,
          workOrderId: workOrderId || null,
          date: new Date(),
          requiredDate: requiredDate ? new Date(requiredDate) : null,
          category,
          designation,
          quantity: parseFloat(quantity) || 1,
          unit: unit || 'Day',
          rate: parseFloat(rate) || 0,
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
