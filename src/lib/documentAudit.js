export async function recordDocumentEdit(prisma, { entityType, entityId, module, editorName }) {
  const name = String(editorName || '').trim();
  if (!name || !entityId) return;
  try {
    await prisma.auditLog.create({
      data: {
        module,
        action: 'EDIT',
        entityType,
        entityId: String(entityId),
        remarks: JSON.stringify({ editedBy: name }),
      },
    });
  } catch (error) {
    console.error(`Failed to record ${entityType} editor`, error);
  }
}

export async function recordDocumentAction(prisma, { entityType, entityId, module, action, actorName }) {
  const name = String(actorName || '').trim();
  if (!name || !entityId || !['CREATE', 'APPROVE'].includes(action)) return;
  try {
    await prisma.auditLog.create({
      data: { module, action, entityType, entityId: String(entityId), remarks: JSON.stringify({ actorName: name }) },
    });
  } catch (error) {
    console.error(`Failed to record ${entityType} ${action.toLowerCase()} actor`, error);
  }
}

export async function getDocumentActors(prisma, entityType, entityIds) {
  const ids = [...new Set((entityIds || []).filter(Boolean).map(String))];
  if (!ids.length) return {};
  const logs = await prisma.auditLog.findMany({
    where: { entityType, action: { in: ['CREATE', 'APPROVE'] }, entityId: { in: ids } },
    orderBy: { createdAt: 'desc' },
    select: { entityId: true, action: true, remarks: true, createdAt: true },
  });
  const byId = {};
  for (const log of logs) {
    if (!log.entityId) continue;
    const row = (byId[log.entityId] ||= {});
    const field = log.action === 'CREATE' ? 'madeBy' : 'approvedBy';
    if (row[field]) continue;
    try {
      row[field] = JSON.parse(log.remarks || '{}').actorName || '';
      if (field === 'approvedBy') row.approvedAt = log.createdAt;
    } catch { /* Ignore malformed legacy audit records. */ }
  }
  return byId;
}

export async function getDocumentEditors(prisma, entityType, entityIds) {
  const ids = [...new Set((entityIds || []).filter(Boolean).map(String))];
  if (!ids.length) return {};
  const logs = await prisma.auditLog.findMany({
    where: { entityType, action: 'EDIT', entityId: { in: ids } },
    orderBy: { createdAt: 'desc' },
    select: { entityId: true, remarks: true, createdAt: true },
  });
  const latestById = {};
  for (const log of logs) {
    if (!log.entityId || latestById[log.entityId]) continue;
    let editedBy = '';
    try { editedBy = JSON.parse(log.remarks || '{}').editedBy || ''; } catch { /* Ignore old free-text audit notes. */ }
    latestById[log.entityId] = { editedBy, editedAt: log.createdAt };
  }
  return latestById;
}
