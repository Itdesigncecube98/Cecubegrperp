export async function getEmployeeGrantedProjectIds(prisma, employeeId) {
  const grants = await prisma.employeeProjectToolAccess.findMany({
    where: { employeeId: String(employeeId), granted: true },
    select: { projectId: true },
    distinct: ['projectId'],
  });
  return grants.map(grant => grant.projectId);
}

// Access grants normally reference `Project.id` (the project selector does too),
// but older Engineering records can reference a `ProjectMaster` id. Resolve
// both forms so a granted project does not disappear from the legacy project list.
export async function getEmployeeGrantedLegacyProjectIds(prisma, employeeId) {
  const grantedIds = await getEmployeeGrantedProjectIds(prisma, employeeId);
  if (!grantedIds.length) return [];

  const [directProjects, masterProjects] = await Promise.all([
    prisma.project.findMany({
      where: { id: { in: grantedIds } },
      select: { id: true },
    }),
    prisma.projectMaster.findMany({
      where: { OR: [{ id: { in: grantedIds } }, { projectId: { in: grantedIds } }] },
      select: { name: true, projectId: true },
    }),
  ]);

  const resolvedIds = new Set(directProjects.map(project => project.id));
  const linkedIds = masterProjects
    .map(project => project.projectId?.startsWith('PROJECT-') ? project.projectId.slice('PROJECT-'.length) : null)
    .filter(Boolean);
  for (const id of linkedIds) resolvedIds.add(id);

  const names = masterProjects.map(project => project.name).filter(Boolean);
  if (names.length) {
    const matchingProjects = await prisma.project.findMany({
      where: { name: { in: names } },
      select: { id: true },
    });
    for (const project of matchingProjects) resolvedIds.add(project.id);
  }

  return [...resolvedIds];
}

export async function employeeHasProjectTool(prisma, employeeId, projectId, toolName) {
  if (!employeeId || !projectId) return false;
  const grant = await prisma.employeeProjectToolAccess.findFirst({
    where: {
      employeeId: String(employeeId),
      projectId: String(projectId),
      granted: true,
      tool: { is: { module: 'Engineering', name: toolName } },
    },
    select: { id: true },
  });
  return !!grant;
}

export async function employeeHasAnyTool(prisma, employeeId, module, toolName) {
  const grant = await prisma.employeeProjectToolAccess.findFirst({
    where: {
      employeeId: String(employeeId),
      granted: true,
      tool: { is: { module, name: toolName } },
    },
    select: { id: true },
  });
  return !!grant;
}
