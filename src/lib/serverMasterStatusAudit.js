import { writeSessionAudit } from '@/lib/serverAudit';

export async function writeMasterRecordStatusAudit(db, request, session, {
  entityType,
  entityId,
  oldStatus,
  newStatus,
}) {
  if (oldStatus === newStatus) return null;
  return writeSessionAudit(db, request, session, {
    module: 'Master Data',
    subModule: entityType === 'VendorMaster' ? 'Vendor Master' : 'Contractor Master',
    action: 'STATUS_CHANGE',
    entityType,
    entityId,
    oldValues: oldStatus == null ? null : JSON.stringify({ status: oldStatus }),
    newValues: JSON.stringify({ status: newStatus }),
  });
}
