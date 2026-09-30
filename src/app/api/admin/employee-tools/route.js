import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { employeeToolCode } from '@/lib/employeeToolCatalog';

/**
 * GET /api/admin/employee-tools?employeeId=xxx&projectId=yyy
 *   → returns all AdminTool records with granted flag for that employee+project
 * GET /api/admin/employee-tools?employeeId=xxx&allProjects=true
 *   → returns granted tools grouped by project for the employee
 *
 * POST /api/admin/employee-tools
 *   body: { employeeId, projectId, toolIds: string[] }
 *   → replaces the access grants for this employee+project combo
 */

export async function GET(req) {
  try {
    const session = readAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Please sign in to view tool permissions.' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const projectId  = searchParams.get('projectId');
    const module     = searchParams.get('module');

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }
    if (session.type === 'employee' && session.id !== employeeId) {
      return NextResponse.json({ error: 'You can only view your own tool permissions.' }, { status: 403 });
    }

    const where = module ? { module } : {};

    if (!projectId && searchParams.get('allProjects') === 'true') {
      const grants = await prisma.employeeProjectToolAccess.findMany({
        where: { employeeId, granted: true, tool: module ? { is: { module } } : undefined },
        select: { projectId: true, tool: { select: { code: true, module: true, name: true } } },
      });
      return NextResponse.json(grants
        .filter(grant => grant.tool)
        .map(grant => ({
          projectId: grant.projectId,
          code: grant.tool.code || employeeToolCode(grant.tool.module, grant.tool.name),
          isGranted: true,
        })));
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required unless allProjects=true' }, { status: 400 });
    }

    const [tools, grants] = await Promise.all([
      prisma.adminTool.findMany({
        where,
        orderBy: [{ module: 'asc' }, { name: 'asc' }],
      }),
      prisma.employeeProjectToolAccess.findMany({
        where: { employeeId, projectId },
        select: { toolId: true, granted: true },
      }),
    ]);

    const grantedSet = new Set(grants.filter(g => g.granted).map(g => g.toolId));

    const result = tools.map(t => ({
      ...t,
      isGranted: grantedSet.has(t.id),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = readAuthSession(req);
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: 'Administrator access is required to change tool permissions.' }, { status: session ? 403 : 401 });
    }
    const body = await req.json();
    const { employeeId, projectId, toolIds } = body;

    if (!employeeId || !projectId || !Array.isArray(toolIds)) {
      return NextResponse.json({ error: 'employeeId, projectId and toolIds[] are required' }, { status: 400 });
    }

    // Remove all existing grants for this employee+project
    await prisma.employeeProjectToolAccess.deleteMany({
      where: { employeeId, projectId },
    });

    // Re-insert granted ones
    if (toolIds.length > 0) {
      await prisma.employeeProjectToolAccess.createMany({
        data: toolIds.map(toolId => ({ employeeId, projectId, toolId, granted: true })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ saved: toolIds.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
