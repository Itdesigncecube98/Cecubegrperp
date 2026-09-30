export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || request.headers.get('cf-connecting-ip')?.trim() || 'unknown';
}

export async function writeSessionAudit(prisma, request, session, {
  module, subModule, action, status = 'SUCCESS', entityType, entityId, oldValues, newValues,
}) {
  let actorName = session?.id || 'Unknown account';
  let employeeId;
  if (session?.type === 'employee') {
    employeeId = String(session.id);
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { name: true, email: true } }).catch(() => null);
    actorName = employee?.name || employee?.email || actorName;
  } else if (session?.type === 'admin') {
    const id = Number(session.id);
    const identityChecks = [{ email: String(session.id) }];
    if (Number.isInteger(id) && id > 0) identityChecks.push({ id });
    const admin = await prisma.admin.findFirst({ where: { OR: identityChecks }, select: { name: true, email: true } }).catch(() => null);
    const systemUser = admin ? null : await prisma.systemUser.findUnique({ where: { id: String(session.id) }, select: { displayName: true, username: true, email: true } }).catch(() => null);
    actorName = admin?.name || admin?.email || systemUser?.displayName || systemUser?.username || systemUser?.email || actorName;
  }

  return prisma.auditLog.create({
    data: {
      ...(employeeId ? { employeeId } : {}),
      module,
      subModule: subModule || null,
      action,
      status,
      entityType: entityType || null,
      entityId: entityId ? String(entityId).slice(0, 160) : null,
      oldValues: oldValues || null,
      newValues: newValues || null,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      remarks: actorName,
    },
  });
}
