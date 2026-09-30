export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';

export async function GET(req) {
  try {
    const forEnquiry = new URL(req.url).searchParams.get('forEnquiry') === 'true';
    const session = forEnquiry ? readAuthSession(req) : null;
    if (forEnquiry && !session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    const [projects, projectMasters] = await Promise.all([
      prisma.project.findMany({
        select: { id: true, name: true, company: true, state: true },
        orderBy: { name: 'asc' },
      }),
      prisma.projectMaster.findMany({
        select: { id: true, name: true, clientName: true, location: true, projectType: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const optionsByName = new Map();
    for (const project of projects) {
      if (!project.name) continue;
      optionsByName.set(project.name.trim().toLowerCase(), {
        id: project.id,
        permissionProjectId: project.id,
        name: project.name,
        company: project.company,
        location: project.state,
      });
    }
    for (const project of projectMasters) {
      if (!project.name) continue;
      const key = project.name.trim().toLowerCase();
      const existing = optionsByName.get(key);
      optionsByName.set(key, {
        id: existing?.id || project.id,
        permissionProjectId: existing?.permissionProjectId || null,
        name: project.name,
        company: project.clientName || existing?.company || '',
        location: project.location || existing?.location || '',
        projectType: project.projectType,
      });
    }

    let options = [...optionsByName.values()];
    if (forEnquiry && session.type === 'employee') {
      const grants = await prisma.employeeProjectToolAccess.findMany({
        where: { employeeId: String(session.id), granted: true, tool: { is: { module: 'Marketing', name: 'Project Enquiry Create' } } },
        select: { projectId: true }, distinct: ['projectId'],
      });
      const permitted = new Set(grants.map(grant => grant.projectId));
      options = options.filter(project => project.permissionProjectId && permitted.has(project.permissionProjectId));
    }
    return NextResponse.json(options.sort((a, b) => a.name.localeCompare(b.name)));
  } catch (error) {
    console.error('Failed to load marketing project options:', error);
    return NextResponse.json({ error: 'Failed to load project options.' }, { status: 500 });
  }
}
