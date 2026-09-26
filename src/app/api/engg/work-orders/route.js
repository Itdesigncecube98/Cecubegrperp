import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

async function generateWONumber() {
  const count = await prisma.workOrder.count();
  const num = String(count + 1).padStart(5, '0');
  return `WO-${num}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id           = searchParams.get('id');
    const projectId    = searchParams.get('projectId');
    const assignedToId = searchParams.get('assignedToId');
    const supervisorId = searchParams.get('supervisorId');
    const status       = searchParams.get('status');

    if (id) {
      const wo = await prisma.workOrder.findUnique({
        where: { id: parseInt(id) },
        include: {
          project:    { select: { id: true, projectCode: true, name: true } },
          assignedTo: { select: { id: true, name: true, designation: true } },
          supervisor: { select: { id: true, name: true, designation: true } },
          siteVisits: {
            orderBy: { visitDate: 'desc' },
            include: { employee: { select: { id: true, name: true } } }
          },
          materialRequests: {
            orderBy: { createdAt: 'desc' },
            include: { items: true }
          }
        }
      });
      if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
      return NextResponse.json(wo);
    }

    const where = {};
    if (projectId)    where.projectId    = parseInt(projectId);
    if (assignedToId) where.assignedToId = assignedToId;
    if (status)       where.status       = status;

    // Supervisor sees all WOs where they are supervisor OR for their subordinates
    if (supervisorId && !assignedToId) {
      const supervisor = await prisma.employee.findUnique({
        where: { id: supervisorId },
        select: { subordinates: { select: { id: true } } }
      });
      const subIds = supervisor?.subordinates?.map(s => s.id) ?? [];
      where.OR = [
        { supervisorId: supervisorId },
        { assignedToId: { in: subIds } }
      ];
    }

    const workOrders = await prisma.workOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project:    { select: { id: true, projectCode: true, name: true } },
        assignedTo: { select: { id: true, name: true, designation: true } },
        supervisor: { select: { id: true, name: true, designation: true } },
        _count: {
          select: { siteVisits: true, materialRequests: true }
        }
      }
    });

    return NextResponse.json(workOrders);
  } catch (error) {
    console.error('GET /api/engg/work-orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      projectId, title, description, scope,
      assignedToId, supervisorId, status, priority,
      scheduledDate, dueDate, estimatedHours, remarks, woNumber
    } = data;

    if (!projectId || !title) {
      return NextResponse.json({ error: 'projectId and title are required' }, { status: 400 });
    }

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: parseInt(projectId) } });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const wo = await prisma.workOrder.create({
      data: {
        woNumber:       woNumber      || await generateWONumber(),
        projectId:      parseInt(projectId),
        title,
        description:    description   || null,
        scope:          scope         || null,
        assignedToId:   assignedToId  || null,
        supervisorId:   supervisorId  || null,
        status:         status        || 'OPEN',
        priority:       priority      || 'MEDIUM',
        scheduledDate:  scheduledDate || null,
        dueDate:        dueDate       || null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : 0,
        remarks:        remarks       || null
      },
      include: {
        project:    { select: { id: true, projectCode: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        supervisor: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(wo, { status: 201 });
  } catch (error) {
    console.error('POST /api/engg/work-orders:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Work order number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) return NextResponse.json({ error: 'Work order id is required' }, { status: 400 });

    // Approve action
    if (updates.action === 'APPROVE') {
      const wo = await prisma.workOrder.update({
        where: { id: parseInt(id) },
        data: {
          status:     'APPROVED',
          approvedBy: updates.approvedBy || null,
          approvedAt: new Date()
        }
      });
      return NextResponse.json(wo);
    }

    if (updates.estimatedHours !== undefined) updates.estimatedHours = parseFloat(updates.estimatedHours);
    if (updates.actualHours    !== undefined) updates.actualHours    = parseFloat(updates.actualHours);
    if (updates.projectId      !== undefined) updates.projectId      = parseInt(updates.projectId);

    delete updates.action;

    const wo = await prisma.workOrder.update({
      where: { id: parseInt(id) },
      data: updates,
      include: {
        project:    { select: { id: true, projectCode: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        supervisor: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(wo);
  } catch (error) {
    console.error('PUT /api/engg/work-orders:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Work order id is required' }, { status: 400 });

    await prisma.workOrder.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/engg/work-orders:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
