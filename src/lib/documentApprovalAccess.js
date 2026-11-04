import { readAuthSession } from '@/lib/authSession';
import { employeeHasAnyTool, employeeHasProjectModuleTool } from '@/lib/projectAccess';

export async function checkDocumentApprovalAccess(request, prisma, { module, toolName, projectId, projectName, allowAnyProject = false }) {
  const session = readAuthSession(request);
  if (!session) return { allowed: false, status: 401, error: 'Sign in to approve this record.' };
  if (session.type === 'admin') return { allowed: true, session };

  let legacyProjectId = null;
  if (projectId) {
    const direct = await prisma.project.findUnique({ where: { id: String(projectId) }, select: { id: true } });
    if (direct) legacyProjectId = direct.id;
    else {
      const master = await prisma.projectMaster.findUnique({ where: { id: String(projectId) }, select: { id: true, name: true, projectId: true } });
      const linkedId = master?.projectId?.startsWith('PROJECT-') ? master.projectId.slice('PROJECT-'.length) : null;
      if (linkedId && await prisma.project.findUnique({ where: { id: linkedId }, select: { id: true } })) legacyProjectId = linkedId;
      projectName ||= master?.name;
    }
  }
  if (!legacyProjectId && projectName) {
    legacyProjectId = (await prisma.project.findFirst({ where: { name: String(projectName) }, select: { id: true } }))?.id || null;
  }

  const granted = legacyProjectId
    ? await employeeHasProjectModuleTool(prisma, session.id, legacyProjectId, module, toolName)
    : allowAnyProject && await employeeHasAnyTool(prisma, session.id, module, toolName);
  return granted
    ? { allowed: true, session }
    : { allowed: false, status: 403, error: `You do not have ${toolName} permission for this project.` };
}
