export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { employeeHasProjectModuleTool } from '@/lib/projectAccess';

export async function GET(req) {
  try {
    const session = readAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Please sign in to view WBS tasks.' }, { status: 401 });

    const projectId = new URL(req.url).searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'Project id is required.' }, { status: 400 });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true }
    });
    if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

    if (session.type === 'employee') {
      const canCreate = await employeeHasProjectModuleTool(
        prisma,
        session.id,
        project.id,
        'Purchase',
        'Purchase Indent Create'
      );
      if (!canCreate) {
        return NextResponse.json({ error: 'You do not have Purchase Indent Create access for this project.' }, { status: 403 });
      }
    }

    const groups = await prisma.wbsGroup.findMany({
      where: { projectId: project.id },
      include: {
        tasks: {
          select: { id: true, name: true, materials: true },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const tasks = groups.flatMap(group => group.tasks.map(task => ({
      id: task.id,
      name: task.name,
      groupName: group.name,
      materials: Array.isArray(task.materials) ? task.materials : []
    })));

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching WBS tasks for purchase indent:', error);
    return NextResponse.json({ error: 'Failed to fetch WBS tasks.' }, { status: 500 });
  }
}
