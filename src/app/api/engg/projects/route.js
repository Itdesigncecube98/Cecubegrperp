import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// Helper to generate a unique project code
async function generateProjectCode() {
  const count = await prisma.project.count();
  const num = String(count + 1).padStart(4, '0');
  return `PROJ-${num}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id        = searchParams.get('id');
    const status    = searchParams.get('status');
    const managerId = searchParams.get('managerId');
    const search    = searchParams.get('search');

    if (id) {
      const project = await prisma.project.findUnique({
        where: { id: parseInt(id) },
        include: {
          manager: { select: { id: true, name: true, designation: true } },
          workOrders: {
            orderBy: { createdAt: 'desc' },
            include: {
              assignedTo: { select: { id: true, name: true } }
            }
          },
          siteVisits: {
            orderBy: { visitDate: 'desc' },
            include: {
              employee: { select: { id: true, name: true } }
            }
          },
          materialRequests: {
            orderBy: { createdAt: 'desc' },
            include: { items: true }
          },
          drawings: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true, drawingNumber: true, title: true,
              revision: true, discipline: true, drawingType: true,
              status: true, fileName: true, issuedDate: true, createdAt: true
            }
          },
          budgetItems: true,
          _count: {
            select: {
              workOrders: true,
              siteVisits: true,
              materialRequests: true,
              drawings: true
            }
          }
        }
      });
      if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      return NextResponse.json(project);
    }

    const where = {};
    if (status)    where.status    = status;
    if (managerId) where.managerId = managerId;
    if (search) {
      where.OR = [
        { name:        { contains: search, mode: 'insensitive' } },
        { projectCode: { contains: search, mode: 'insensitive' } },
        { clientName:  { contains: search, mode: 'insensitive' } }
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        manager: { select: { id: true, name: true, designation: true } },
        _count: {
          select: {
            workOrders: true,
            siteVisits: true,
            materialRequests: true
          }
        }
      }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('GET /api/engg/projects:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      name, description, clientName, clientContact, clientEmail,
      siteAddress, status, priority, startDate, endDate,
      budgetAmount, managerId, departmentId, tags, projectCode
    } = data;

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const code = projectCode || await generateProjectCode();

    const project = await prisma.project.create({
      data: {
        projectCode: code,
        name,
        description:   description   || null,
        clientName:    clientName    || null,
        clientContact: clientContact || null,
        clientEmail:   clientEmail   || null,
        siteAddress:   siteAddress   || null,
        status:        status        || 'PLANNING',
        priority:      priority      || 'MEDIUM',
        startDate:     startDate     || null,
        endDate:       endDate       || null,
        budgetAmount:  budgetAmount  ? parseFloat(budgetAmount) : 0,
        managerId:     managerId     || null,
        departmentId:  departmentId  || null,
        tags:          tags          || null
      },
      include: {
        manager: { select: { id: true, name: true, designation: true } }
      }
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('POST /api/engg/projects:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Project code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) return NextResponse.json({ error: 'Project id is required' }, { status: 400 });

    // Convert numeric fields
    if (updates.budgetAmount !== undefined) updates.budgetAmount = parseFloat(updates.budgetAmount);
    if (updates.spentAmount  !== undefined) updates.spentAmount  = parseFloat(updates.spentAmount);

    // Strip any undefined / null keys that shouldn't be touched
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    const project = await prisma.project.update({
      where: { id: parseInt(id) },
      data: cleanUpdates,
      include: {
        manager: { select: { id: true, name: true, designation: true } }
      }
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('PUT /api/engg/projects:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Project id is required' }, { status: 400 });

    await prisma.project.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/engg/projects:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
