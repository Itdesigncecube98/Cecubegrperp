import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id          = searchParams.get('id');
    const projectId   = searchParams.get('projectId');
    const workOrderId = searchParams.get('workOrderId');
    const employeeId  = searchParams.get('employeeId');
    const status      = searchParams.get('status');
    const date        = searchParams.get('date');
    const startDate   = searchParams.get('startDate');
    const endDate     = searchParams.get('endDate');

    if (id) {
      const visit = await prisma.siteVisit.findUnique({
        where: { id: parseInt(id) },
        include: {
          project:   { select: { id: true, projectCode: true, name: true } },
          workOrder: { select: { id: true, woNumber: true, title: true } },
          employee:  { select: { id: true, name: true, designation: true, phone: true } }
        }
      });
      if (!visit) return NextResponse.json({ error: 'Site visit not found' }, { status: 404 });
      return NextResponse.json(visit);
    }

    const where = {};
    if (projectId)   where.projectId   = parseInt(projectId);
    if (workOrderId) where.workOrderId = parseInt(workOrderId);
    if (employeeId)  where.employeeId  = employeeId;
    if (status)      where.status      = status;
    if (date)        where.visitDate   = date;
    if (startDate || endDate) {
      where.visitDate = {};
      if (startDate) where.visitDate.gte = startDate;
      if (endDate)   where.visitDate.lte = endDate;
    }

    const visits = await prisma.siteVisit.findMany({
      where,
      orderBy: { visitDate: 'desc' },
      include: {
        project:   { select: { id: true, projectCode: true, name: true } },
        workOrder: { select: { id: true, woNumber: true, title: true } },
        employee:  { select: { id: true, name: true, designation: true } }
      }
    });

    return NextResponse.json(visits);
  } catch (error) {
    console.error('GET /api/engg/site-visits:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      projectId, workOrderId, employeeId, visitDate,
      checkInTime, checkOutTime, latitude, longitude,
      address, purpose, observations, nextAction,
      status, photoUrls, clientSignedBy
    } = data;

    if (!projectId || !employeeId || !visitDate) {
      return NextResponse.json(
        { error: 'projectId, employeeId, and visitDate are required' },
        { status: 400 }
      );
    }

    const visit = await prisma.siteVisit.create({
      data: {
        projectId:     parseInt(projectId),
        workOrderId:   workOrderId  ? parseInt(workOrderId) : null,
        employeeId,
        visitDate,
        checkInTime:   checkInTime  || null,
        checkOutTime:  checkOutTime || null,
        latitude:      latitude     ? parseFloat(latitude) : null,
        longitude:     longitude    ? parseFloat(longitude) : null,
        address:       address      || null,
        purpose:       purpose      || null,
        observations:  observations || null,
        nextAction:    nextAction   || null,
        status:        status       || 'PLANNED',
        photoUrls:     photoUrls    ? JSON.stringify(photoUrls) : null,
        clientSignedBy: clientSignedBy || null
      },
      include: {
        project:   { select: { id: true, projectCode: true, name: true } },
        workOrder: { select: { id: true, woNumber: true, title: true } },
        employee:  { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    console.error('POST /api/engg/site-visits:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) return NextResponse.json({ error: 'Site visit id is required' }, { status: 400 });

    if (updates.projectId   !== undefined) updates.projectId   = parseInt(updates.projectId);
    if (updates.workOrderId !== undefined) updates.workOrderId = updates.workOrderId ? parseInt(updates.workOrderId) : null;
    if (updates.latitude    !== undefined) updates.latitude    = updates.latitude ? parseFloat(updates.latitude) : null;
    if (updates.longitude   !== undefined) updates.longitude   = updates.longitude ? parseFloat(updates.longitude) : null;
    if (updates.photoUrls   !== undefined && Array.isArray(updates.photoUrls)) {
      updates.photoUrls = JSON.stringify(updates.photoUrls);
    }

    // Check-in shorthand
    if (updates.action === 'CHECK_IN') {
      const now = new Date();
      updates.checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      updates.status = 'IN_PROGRESS';
      delete updates.action;
    }

    // Check-out shorthand
    if (updates.action === 'CHECK_OUT') {
      const now = new Date();
      updates.checkOutTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      updates.status = 'COMPLETED';
      delete updates.action;
    }

    delete updates.action;

    const visit = await prisma.siteVisit.update({
      where: { id: parseInt(id) },
      data: updates,
      include: {
        project:   { select: { id: true, projectCode: true, name: true } },
        workOrder: { select: { id: true, woNumber: true, title: true } },
        employee:  { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(visit);
  } catch (error) {
    console.error('PUT /api/engg/site-visits:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Site visit not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Site visit id is required' }, { status: 400 });

    await prisma.siteVisit.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/engg/site-visits:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Site visit not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
