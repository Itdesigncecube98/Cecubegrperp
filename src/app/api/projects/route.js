export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { readAuthSession } from '../../../lib/authSession';
import { employeeHasAnyTool, employeeHasProjectTool, getEmployeeGrantedLegacyProjectIds } from '../../../lib/projectAccess';

export async function GET(req) {
  try {
    const session = readAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Please sign in to view projects.' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const visibleProjectIds = session.type === 'employee'
      ? await getEmployeeGrantedLegacyProjectIds(prisma, session.id)
      : null;
    
    if (id) {
      if (visibleProjectIds && !visibleProjectIds.includes(id)) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      if (session.type === 'employee') {
        const canView = await employeeHasProjectTool(prisma, session.id, id, 'Project View');
        const canEdit = await employeeHasProjectTool(prisma, session.id, id, 'Project Edit');
        if (!canView && !canEdit) return NextResponse.json({ error: 'You do not have Project View access for this project.' }, { status: 403 });
      }
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      return NextResponse.json(project);
    }
    
    const projects = await prisma.project.findMany({
      where: visibleProjectIds ? { id: { in: visibleProjectIds } } : {},
      orderBy: { createdAt: 'desc' },
    });
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
    const data = await req.json();
    if (session.type === 'employee' && !await employeeHasAnyTool(prisma, session.id, 'Engineering', 'New Project')) {
      return NextResponse.json({ error: 'You do not have New Project access.' }, { status: 403 });
    }
    const project = await prisma.project.create({ data });
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = readAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Please sign in to edit projects.' }, { status: 401 });
    const data = await req.json();
    const { id, ...updateData } = data;
    if (session.type === 'employee' && !await employeeHasProjectTool(prisma, session.id, id, 'Project Edit')) {
      return NextResponse.json({ error: 'You do not have Project Edit access for this project.' }, { status: 403 });
    }
    const project = await prisma.project.update({ where: { id }, data: updateData });
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = readAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Please sign in again to delete projects.' }, { status: 401 });
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Project id is required.' }, { status: 400 });

    if (session.type === 'employee' && !await employeeHasProjectTool(prisma, session.id, id, 'Project Delete')) {
      return NextResponse.json({ error: 'You do not have Project Delete access for this project.' }, { status: 403 });
    }

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
