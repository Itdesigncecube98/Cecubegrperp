export async function resolveProjectLibraryContext(prisma, projectId, { ensureProjectMaster = false } = {}) {
  if (!projectId) return { legacyProject: null, projectMaster: null, library: null };

  const suppliedId = String(projectId);
  let legacyProject = await prisma.project.findUnique({
    where: { id: suppliedId },
    select: { id: true, name: true, company: true, state: true, library: true },
  });
  let projectMaster = null;

  if (legacyProject) {
    projectMaster = await prisma.projectMaster.findFirst({
      where: { OR: [
        { projectId: `PROJECT-${legacyProject.id}` },
        { projectId: legacyProject.id },
        { name: legacyProject.name },
      ] },
    });
  } else {
    projectMaster = await prisma.projectMaster.findUnique({ where: { id: suppliedId } });
    if (!projectMaster) {
      projectMaster = await prisma.projectMaster.findFirst({ where: { projectId: suppliedId } });
    }
    if (projectMaster) {
      const linkedLegacyId = projectMaster.projectId?.startsWith('PROJECT-')
        ? projectMaster.projectId.slice('PROJECT-'.length)
        : null;
      legacyProject = linkedLegacyId
        ? await prisma.project.findUnique({
            where: { id: linkedLegacyId },
            select: { id: true, name: true, company: true, state: true, library: true },
          })
        : await prisma.project.findFirst({
            where: { name: projectMaster.name },
            select: { id: true, name: true, company: true, state: true, library: true },
          });
    }
  }

  if (!projectMaster && ensureProjectMaster && legacyProject) {
    projectMaster = await prisma.projectMaster.create({
      data: {
        projectId: `PROJECT-${legacyProject.id}`,
        name: legacyProject.name,
        clientName: legacyProject.company || null,
        location: legacyProject.state || null,
        projectType: 'EPC',
        status: 'Active',
      },
    });
  }

  const library = legacyProject?.library
    ? await prisma.library.findFirst({
        where: { name: { equals: legacyProject.library, mode: 'insensitive' } },
        select: { id: true, name: true },
      })
    : null;

  return { legacyProject, projectMaster, library };
}
