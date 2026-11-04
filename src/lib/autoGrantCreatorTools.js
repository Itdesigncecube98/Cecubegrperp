import { employeeToolCode } from '@/lib/employeeToolCatalog';
import { readAuthSession } from '@/lib/authSession';

async function resolveLegacyProjectId(prisma, projectId, projectName) {
  if (projectId) {
    const legacyProject = await prisma.project.findUnique({ where: { id: String(projectId) }, select: { id: true } });
    if (legacyProject) return legacyProject.id;

    const master = await prisma.projectMaster.findUnique({ where: { id: String(projectId) }, select: { id: true, name: true, projectId: true } });
    const linkedLegacyId = master?.projectId?.startsWith('PROJECT-') ? master.projectId.slice('PROJECT-'.length) : null;
    if (linkedLegacyId) {
      const linkedProject = await prisma.project.findUnique({ where: { id: linkedLegacyId }, select: { id: true } });
      if (linkedProject) return linkedProject.id;
    }
    projectName ||= master?.name;
  }

  if (!projectName) return null;
  const matchingProject = await prisma.project.findFirst({ where: { name: projectName }, select: { id: true } });
  return matchingProject?.id || null;
}

/**
 * Add the creator's non-approval tools to their Employee Access project grants.
 * Existing rows (including an admin's explicit revoke) are never overwritten.
 */
export async function autoGrantCreatorProjectTools(prisma, request, {
  requestedEmployeeId,
  projectId,
  projectName,
  module,
  toolNames,
}) {
  const session = readAuthSession(request);
  const employeeId = session?.type === 'employee'
    ? session.id
    : session?.type === 'admin' && requestedEmployeeId
      ? String(requestedEmployeeId)
      : null;
  if (!employeeId || !module || !Array.isArray(toolNames) || toolNames.length === 0) return 0;

  const [employee, resolvedProjectId] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } }),
    resolveLegacyProjectId(prisma, projectId, projectName),
  ]);
  if (!employee || !resolvedProjectId) return 0;

  const tools = await Promise.all(toolNames.map(name => prisma.adminTool.upsert({
    where: { module_name: { module, name } },
    update: {},
    create: { module, name, code: employeeToolCode(module, name) },
    select: { id: true },
  })));

  const result = await prisma.employeeProjectToolAccess.createMany({
    data: tools.map(tool => ({ employeeId, projectId: resolvedProjectId, toolId: tool.id, granted: true })),
    skipDuplicates: true,
  });
  return result.count;
}
