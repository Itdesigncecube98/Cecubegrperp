import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { writeSessionAudit } from '@/lib/serverAudit';
import { employeeToolCode, PROJECT_TOOL_MODULES, EMPLOYEE_WIDE_TOOL_MODULES, EMPLOYEE_WIDE_PROJECT_ID } from '@/lib/employeeToolCatalog';

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

    const where = projectId === EMPLOYEE_WIDE_PROJECT_ID
      ? { module, name: { in: EMPLOYEE_WIDE_TOOL_MODULES[module] || [] } }
      : { ...(module ? { module } : {}) };

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
    const { employeeId, employeeCode, employeeName, projectId, toolIds, module } = body;

    if (!employeeId || !projectId || !Array.isArray(toolIds)) {
      return NextResponse.json({ error: 'employeeId, projectId and toolIds[] are required' }, { status: 400 });
    }

    const employeeWideScope = projectId === EMPLOYEE_WIDE_PROJECT_ID;
    const employeeWideNames = EMPLOYEE_WIDE_TOOL_MODULES[module] || [];
    if (employeeWideScope && (!module || employeeWideNames.length === 0)) {
      return NextResponse.json({ error: 'Employee-wide access is available only for Engineering masters and Marketing.' }, { status: 400 });
    }
    if (!employeeWideScope && module && module !== 'Purchase') {
      return NextResponse.json({ error: 'Only Purchase permissions can be saved module-wise by project.' }, { status: 400 });
    }

    const writeAccessAudit = async ({ moduleName, scope, projectName, libraryName, grantedTools, revokedTools }) => {
      const employee = await prisma.employee.findFirst({
        where: { OR: [{ id: employeeId }, ...(employeeCode ? [{ empId: String(employeeCode) }] : [])] },
        select: { empId: true, name: true },
      });
      const targetEmployeeCode = employee?.empId || (employeeCode ? String(employeeCode) : employeeId);
      await writeSessionAudit(prisma, req, session, {
        module: 'Admin',
        subModule: '/admin-dashboard/employee-tools',
        action: 'UPDATE',
        status: 'SUCCESS',
        entityType: 'Employee Tools',
        entityId: targetEmployeeCode,
        newValues: JSON.stringify({
          employeeCode: targetEmployeeCode,
          employeeId: targetEmployeeCode,
          employeeName: employee?.name || employeeName || null,
          module: moduleName || 'All project modules',
          scope,
          projectName: projectName || null,
          libraryName: libraryName || null,
          grantedTools,
          revokedTools,
        }),
      });
    };

    if (module === 'Purchase' || employeeWideScope) {
      const scopeNames = employeeWideScope ? employeeWideNames : PROJECT_TOOL_MODULES.Purchase;
      const [moduleTools, project] = await Promise.all([
        prisma.adminTool.findMany({ where: { module, name: { in: scopeNames } }, select: { id: true, name: true } }),
        employeeWideScope ? null : prisma.project.findUnique({ where: { id: projectId }, select: { name: true, library: true } }),
      ]);
      const allowedIds = new Set(moduleTools.map(tool => tool.id));
      if (toolIds.some(toolId => !allowedIds.has(toolId))) {
        return NextResponse.json({ error: `Only tools allowed for ${module} ${employeeWideScope ? 'employee-wide' : 'project-wise'} access can be saved.` }, { status: 400 });
      }

      const previousGrants = await prisma.employeeProjectToolAccess.findMany({
        where: {
          employeeId,
          granted: true,
          tool: { is: { module, name: { in: scopeNames } } },
          ...(employeeWideScope ? {} : { projectId }),
        },
        select: { tool: { select: { name: true } } },
      });
      const grantedTools = moduleTools.filter(tool => toolIds.includes(tool.id)).map(tool => tool.name);
      const previousToolNames = [...new Set(previousGrants.map(grant => grant.tool.name))];
      const revokedTools = previousToolNames.filter(name => !grantedTools.includes(name));

      await prisma.$transaction(async tx => {
        if (employeeWideScope) {
          await tx.employeeProjectToolAccess.deleteMany({
            where: {
              employeeId,
              OR: [
                { projectId: EMPLOYEE_WIDE_PROJECT_ID, tool: { is: { module } } },
                { projectId: { not: EMPLOYEE_WIDE_PROJECT_ID }, tool: { is: { module, name: { in: employeeWideNames } } } },
              ],
            },
          });
        } else {
          await tx.employeeProjectToolAccess.deleteMany({
            where: { employeeId, projectId, tool: { is: { module } } },
          });
        }
        if (toolIds.length > 0) {
          await tx.employeeProjectToolAccess.createMany({
            data: toolIds.map(toolId => ({ employeeId, projectId, toolId, granted: true })),
            skipDuplicates: true,
          });
        }
      });
      await writeAccessAudit({
        moduleName: module,
        scope: employeeWideScope ? 'Employee-wide' : 'Project-wide',
        projectName: employeeWideScope ? 'Employee-wide · all projects' : project?.name,
        libraryName: project?.library,
        grantedTools,
        revokedTools,
      });
      return NextResponse.json({ saved: toolIds.length, module, scope: employeeWideScope ? 'employee' : 'project', projectName: employeeWideScope ? 'Employee-wide' : project?.name || null, libraryName: project?.library || null, grantedTools, revokedTools });
    }

    const projectScopedTools = await prisma.adminTool.findMany({
      where: { OR: [
        { module: { notIn: Object.keys(EMPLOYEE_WIDE_TOOL_MODULES) } },
        { module: 'Engineering', name: { notIn: EMPLOYEE_WIDE_TOOL_MODULES.Engineering } },
      ] },
      select: { id: true, name: true },
    });
    const projectScopedIds = new Set(projectScopedTools.map(tool => tool.id));
    if (toolIds.some(toolId => !projectScopedIds.has(toolId))) {
      return NextResponse.json({ error: 'Engineering masters and Marketing permissions must be assigned employee-wide.' }, { status: 400 });
    }

    const [previousGrants, projectTools, project] = await Promise.all([
      prisma.employeeProjectToolAccess.findMany({ where: { employeeId, projectId, granted: true }, select: { tool: { select: { name: true } } } }),
      prisma.adminTool.findMany({ where: { id: { in: toolIds } }, select: { id: true, name: true } }),
      prisma.project.findUnique({ where: { id: projectId }, select: { name: true, library: true } }),
    ]);
    const grantedTools = projectTools.map(tool => tool.name);
    const previousToolNames = [...new Set(previousGrants.map(grant => grant.tool.name))];
    const revokedTools = previousToolNames.filter(name => !grantedTools.includes(name));

    // Replace only project-scoped grants; employee-wide grants stay intact.
    await prisma.employeeProjectToolAccess.deleteMany({ where: { employeeId, projectId } });

    // Re-insert granted ones
    if (toolIds.length > 0) {
      await prisma.employeeProjectToolAccess.createMany({
        data: toolIds.map(toolId => ({ employeeId, projectId, toolId, granted: true })),
        skipDuplicates: true,
      });
    }

    await writeAccessAudit({
      moduleName: null,
      scope: 'Project-wide',
      projectName: project?.name,
      libraryName: project?.library,
      grantedTools,
      revokedTools,
    });

    return NextResponse.json({ saved: toolIds.length, projectName: project?.name || null, libraryName: project?.library || null, grantedTools, revokedTools });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
