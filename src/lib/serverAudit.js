import { isIP } from 'node:net';

function normalizeIp(value) {
  let ip = String(value || '').trim().replace(/^"|"$/g, '');
  if (!ip) return null;
  if (ip.startsWith('[')) ip = ip.slice(1, ip.indexOf(']') > 0 ? ip.indexOf(']') : undefined);
  if (isIP(ip) === 0 && ip.includes(':') && !ip.includes('::')) {
    const [host, port] = ip.split(':');
    if (/^\d+$/.test(port) && isIP(host) === 4) ip = host;
  }
  if (!isIP(ip)) return null;
  return ip.toLowerCase().startsWith('::ffff:') ? ip.slice(7) : ip;
}

export function getClientIp(request) {
  // Prefer headers written by the hosting proxy. The proxy must overwrite these
  // headers; client supplied values cannot be trusted unless the proxy does so.
  const candidates = [
    request.headers.get('cf-connecting-ip'),
    request.headers.get('x-vercel-forwarded-for'),
    request.headers.get('x-real-ip'),
    ...(request.headers.get('x-forwarded-for') || '').split(','),
  ];
  return candidates.map(normalizeIp).find(Boolean) || 'unknown';
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
