export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { employeeHasAnyTool, employeeHasProjectTool, getEmployeeGrantedLegacyProjectIds } from '@/lib/projectAccess';

export async function GET(req) {
  try {
    const session = readAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Please sign in to view projects.' }, { status: 401 });
    const assignedIds = session.type === 'employee'
      ? await getEmployeeGrantedLegacyProjectIds(prisma, session.id)
      : null;
    const legacyProjects = await prisma.project.findMany({
      where: assignedIds ? { id: { in: assignedIds } } : {},
      select: { id: true, name: true, company: true, state: true },
      orderBy: { createdAt: 'desc' }
    });

    for (const legacyProject of legacyProjects) {
      if (!legacyProject.name) continue;
      const existing = await prisma.projectMaster.findFirst({ where: { name: legacyProject.name } });
      if (!existing) {
        await prisma.projectMaster.create({
          data: {
            projectId: `PROJECT-${legacyProject.id}`,
            name: legacyProject.name,
            clientName: legacyProject.company || null,
            location: legacyProject.state || null,
            projectType: 'EPC',
            status: 'Active'
          }
        });
      }
    }

    let where = {};
    if (assignedIds) {
      const assignedProjects = await prisma.project.findMany({
        where: { id: { in: assignedIds } },
        select: { id: true, name: true },
      });
      const assignedNames = assignedProjects.map(project => project.name).filter(Boolean);
      where = { OR: [
        { projectId: { in: assignedIds.map(id => `PROJECT-${id}`) } },
        { name: { in: assignedNames } },
      ] };
    }
    const projects = await prisma.projectMaster.findMany({ where, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = readAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Please sign in to create projects.' }, { status: 401 });
    const body = await req.json();
    if (session.type === 'employee' && !await employeeHasAnyTool(prisma, session.id, 'Engineering', 'New Project')) {
      return NextResponse.json({ error: 'You do not have New Project access.' }, { status: 403 });
    }
    
    // Convert dates to DateTime if provided
    let startDate = null;
    let completionDate = null;
    
    if (body.startDate) {
      startDate = new Date(body.startDate);
    }
    if (body.endDate) {
      completionDate = new Date(body.endDate);
    }
    
    const project = await prisma.projectMaster.create({
      data: {
        projectId: body.projectId || `PRJ-${Date.now()}`,
        name: body.name,
        clientName: body.clientName || null,
        location: body.location || null,
        contractValue: body.contractValue ? parseFloat(body.contractValue) : 0,
        projectType: body.projectType || 'EPC',
        startDate: startDate,
        completionDate: completionDate,
        status: body.status || 'Active',
      }
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: error.message || 'Failed to create project' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = readAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Please sign in to edit projects.' }, { status: 401 });
    const body = await req.json();
    const { id, ...data } = body;
    if (session.type === 'employee') {
      const projectMaster = await prisma.projectMaster.findUnique({ where: { id }, select: { name: true, projectId: true } });
      const linkedId = projectMaster?.projectId?.startsWith('PROJECT-') ? projectMaster.projectId.slice('PROJECT-'.length) : null;
      const legacyProject = linkedId
        ? await prisma.project.findUnique({ where: { id: linkedId }, select: { id: true } })
        : projectMaster?.name ? await prisma.project.findFirst({ where: { name: projectMaster.name }, select: { id: true } }) : null;
      if (!legacyProject || !await employeeHasProjectTool(prisma, session.id, legacyProject.id, 'Project Edit')) {
        return NextResponse.json({ error: 'You do not have Project Edit access for this project.' }, { status: 403 });
      }
    }
    
    // Convert dates if provided
    const updateData = { ...data };
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    if (data.endDate) {
      updateData.completionDate = new Date(data.endDate);
    }
    if (data.contractValue) {
      updateData.contractValue = parseFloat(data.contractValue);
    }
    
    const project = await prisma.projectMaster.update({
      where: { id },
      data: updateData
    });
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}
