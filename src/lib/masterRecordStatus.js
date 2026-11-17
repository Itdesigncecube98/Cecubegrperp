export const MASTER_RECORD_STATUSES = [
  'Blacklisted',
  'Inactive',
  'Active',
  'Suspended',
  'Unapproved',
  'Approved',
  'Regular'
];

export function normalizeMasterRecordStatus(status, fallback = null) {
  if (status === 'Pending Approval') return 'Unapproved';
  return MASTER_RECORD_STATUSES.includes(status) ? status : fallback;
}
