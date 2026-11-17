export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { getEmployeeGrantedLegacyProjectIds } from '@/lib/projectAccess';

export async function GET(request) {
  try {
    const session = readAuthSession(request);
    if (!session) return NextResponse.json({ error: 'Please sign in to view WBS tasks.' }, { status: 401 });

    const projectId = new URL(request.url).searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'Project id is required.' }, { status: 400 });

    if (session.type === 'employee') {
      const projectIds = await getEmployeeGrantedLegacyProjectIds(prisma, session.id);
      if (!projectIds.includes(projectId)) {
        return NextResponse.json({ error: 'You do not have access to this project.' }, { status: 403 });
      }
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, library: true, wbsGroups: {
        orderBy: { createdAt: 'asc' },
        select: { name: true, tasks: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, volOfWorkLabour: true, labourRate: true, materials: true, labours: true },
        } },
      } },
    });
    if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

    const [library, projectMaster] = await Promise.all([
      prisma.library.findUnique({ where: { name: project.library }, select: { id: true } }),
      prisma.projectMaster.findFirst({
        where: { OR: [{ projectId: `PROJECT-${project.id}` }, { name: project.name }] },
        select: { id: true, projectId: true },
      }),
    ]);

    const libraryTasks = library ? await prisma.taskLibraryItem.findMany({
      where: {
        libraryId: library.id,
        ...(projectMaster ? { OR: [
          { projectId: projectMaster.id },
          { projectId: projectMaster.projectId },
          { projectId: project.id },
          { projectId: null },
        ] } : { OR: [{ projectId: project.id }, { projectId: null }] }),
      },
      select: { name: true, projectId: true, labours: { select: { id: true, name: true, unit: true, quantity: true, rate: true, specification: true, components: true } } },
    }) : [];
    const laboursByTask = new Map();
    for (const task of libraryTasks) {
      const key = task.name.trim().toLowerCase();
      const priority = task.projectId === projectMaster?.id ? 0
        : task.projectId === projectMaster?.projectId ? 1
          : task.projectId === project.id ? 2 : 3;
      const current = laboursByTask.get(key);
      if (!current || priority < current.priority) {
        laboursByTask.set(key, { priority, labours: task.labours });
      } else if (priority === current.priority) {
        laboursByTask.set(key, { priority, labours: [...current.labours, ...task.labours] });
      }
    }

    const tasks = project.wbsGroups.flatMap(group => group.tasks.map(task => ({
      id: task.id,
      name: task.name,
      groupName: group.name,
      volOfWorkLabour: task.volOfWorkLabour,
      labourRate: task.labourRate,
      materials: Array.isArray(task.materials) ? task.materials : [],
      labours: Array.isArray(task.labours) && task.labours.length
        ? task.labours
        : laboursByTask.get(task.name.trim().toLowerCase())?.labours || [],
    })));

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to load employee requisition WBS tasks:', error);
    return NextResponse.json({ error: 'Unable to load WBS tasks for this project.' }, { status: 500 });
  }
}
