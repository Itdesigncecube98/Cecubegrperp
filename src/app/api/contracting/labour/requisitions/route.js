export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { getEmployeeGrantedLegacyProjectIds } from '@/lib/projectAccess';

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
      const session = readAuthSession(request);
      if (!session) return NextResponse.json({ error: 'Please sign in to submit a labour requisition.' }, { status: 401 });
      const data = await request.json();
      const { projectId, workOrderId, requiredDate } = data;
      const requests = Array.isArray(data.items) ? data.items : [data];

      if (!projectId || requests.length === 0 || requests.some(item =>
        !item || !item.category || !String(item.designation || '').trim() || Number(item.quantity) <= 0
      )) {
        return NextResponse.json({ error: 'projectId and at least one complete labour item are required' }, { status: 400 });
      }

      if (session.type === 'employee') {
        const assignedProjectIds = await getEmployeeGrantedLegacyProjectIds(prisma, session.id);
        if (!assignedProjectIds.includes(projectId)) {
          return NextResponse.json({ error: 'You do not have access to this project.' }, { status: 403 });
        }
      }
  
      // The contracting UI uses the legacy Project model; requisitions use ProjectMaster.
      const project = await resolveProjectMaster(projectId);
      if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

      let employee = null;
      if (session.type === 'employee') {
        employee = await prisma.employee.findUnique({ where: { id: String(session.id) }, select: { name: true, empId: true } });
      }
      const reqPrefix = 'LREQ';
      const created = await prisma.$transaction(async transaction => {
        let sequence = await transaction.labourRequisition.count() + 1;
        const requisitions = [];
        for (const item of requests) {
          const selectedTask = item.wbsTaskId
            ? await transaction.wbsTask.findFirst({ where: { id: item.wbsTaskId, projectId }, select: { name: true } })
            : null;
          if (item.wbsTaskId && !selectedTask) throw new Error('The selected WBS task is not part of this project.');

          let reqNo = `${reqPrefix}-${String(sequence).padStart(3, '0')}`;
          while (await transaction.labourRequisition.findUnique({ where: { reqNo } })) {
            sequence += 1;
            reqNo = `${reqPrefix}-${String(sequence).padStart(3, '0')}`;
          }
          requisitions.push(await transaction.labourRequisition.create({
            data: {
              reqNo,
              projectId: project.id,
              workOrderId: workOrderId || null,
              date: new Date(),
              requiredDate: requiredDate ? new Date(requiredDate) : null,
              category: item.category,
              designation: item.designation,
              quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
              unit: item.unit || 'Day',
              rate: parseFloat(item.rate) || 0,
              duration: parseInt(item.duration, 10) || 1,
              purpose: [selectedTask ? `WBS Task: ${selectedTask.name}` : '', item.purpose].filter(Boolean).join('\n') || null,
              remarks: [
                session.type === 'employee'
                  ? `Requested by: ${employee?.name || 'Employee'}${employee?.empId ? ` (${employee.empId})` : ''}`
                  : '',
                item.remarks || data.remarks || '',
              ].filter(Boolean).join('\n') || null,
              status: 'Pending',
            },
            include: { project: { select: { id: true, name: true } } },
          }));
          sequence += 1;
        }
        return requisitions;
      });

      return NextResponse.json(Array.isArray(data.items) ? created : created[0], { status: 201 });
  } catch (error) {
    console.error('Error creating labour requisition:', error);
      if (error.message === 'The selected WBS task is not part of this project.') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
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
