import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/employee-tools?employeeId=xxx&projectId=yyy
 *   → returns all AdminTool records with granted flag for that employee+project
 *
 * POST /api/admin/employee-tools
 *   body: { employeeId, projectId, toolIds: string[] }
 *   → replaces the access grants for this employee+project combo
 */

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const projectId  = searchParams.get('projectId');
    const module     = searchParams.get('module');

    if (!employeeId || !projectId) {
      return NextResponse.json({ error: 'employeeId and projectId are required' }, { status: 400 });
    }

    const where = module ? { module } : {};

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
