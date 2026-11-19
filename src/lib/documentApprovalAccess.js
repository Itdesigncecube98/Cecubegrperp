import { readAuthSession } from '@/lib/authSession';
import { employeeHasAnyTool, employeeHasProjectModuleTool } from '@/lib/projectAccess';

export async function checkDocumentApprovalAccess(request, prisma, { module, toolName, projectId, projectName, allowAnyProject = false }) {
  const session = readAuthSession(request);
  if (!session) return { allowed: false, status: 401, error: 'Sign in to approve this record.' };
  if (session.type === 'admin') return { allowed: true, session };

  const projectIds = new Set();
  if (projectId) {
    const suppliedId = String(projectId);
    projectIds.add(suppliedId);
    const direct = await prisma.project.findUnique({ where: { id: suppliedId }, select: { id: true } });
    if (direct) projectIds.add(direct.id);

    const master = await prisma.projectMaster.findFirst({
      where: { OR: [{ id: suppliedId }, { projectId: suppliedId }] },
      select: { id: true, name: true, projectId: true },
    });
    if (master) {
      projectIds.add(master.id);
      if (master.projectId) projectIds.add(master.projectId);
      const linkedId = master.projectId?.startsWith('PROJECT-') ? master.projectId.slice('PROJECT-'.length) : null;
      if (linkedId && await prisma.project.findUnique({ where: { id: linkedId }, select: { id: true } })) {
        projectIds.add(linkedId);
      }
      projectName ||= master.name;
    }
  }
  if (projectName) {
    const matchingProject = await prisma.project.findFirst({
      where: { name: String(projectName) },
      select: { id: true },
    });
    if (matchingProject) projectIds.add(matchingProject.id);
  }

  const projectGrants = await Promise.all(
    [...projectIds].map(id => employeeHasProjectModuleTool(prisma, session.id, id, module, toolName))
  );
  const granted = projectGrants.some(Boolean)
    || (allowAnyProject && await employeeHasAnyTool(prisma, session.id, module, toolName));
  return granted
    ? { allowed: true, session }
    : { allowed: false, status: 403, error: `You do not have ${toolName} permission for this project.` };
}
