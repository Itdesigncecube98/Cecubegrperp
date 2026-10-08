import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { employeeHasProjectModuleTool } from '@/lib/projectAccess';

export async function enquiryAccess(request, projectId, toolName) {
  const session = readAuthSession(request);
  if (!session) return { error: 'Please sign in.', status: 401 };
  if (session.type === 'admin') return { session };
  if (session.type !== 'employee' || !await employeeHasProjectModuleTool(prisma, session.id, projectId, 'Marketing', toolName)) {
    return { error: 'You do not have permission for this project enquiry.', status: 403 };
  }
  return { session };
}

export async function resolveEnquiryProjectId(lead) {
  if (lead?.projectId) return lead.projectId;
  if (!lead?.projectName) return null;
  const project = await prisma.project.findFirst({ where: { name: lead.projectName }, select: { id: true } });
  return project?.id || null;
}

