export function getLeaveCategory(value) {
  const type = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  if (type === 'cl' || type.includes('casual')) return 'CL';
  if (type === 'el' || type === 'pl' || type.includes('earned') || type === 'paid leave') return 'EL';
  if (type === 'lwp' || type.includes('unpaid') || type.includes('leave without pay')) return 'LWP';
  if (type === 'coff' || type === 'c off' || type.includes('compensatory')) return 'COFF';
  if (type === 'sick' || type === 'sl') return 'SL';
  return 'OTHER';
}

export function supportsHalfDayLeave(value) {
  return ['CL', 'EL', 'COFF'].includes(getLeaveCategory(value));
}

function normalizeLeaveType(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

export function isMaternityLeave(value) {
  return normalizeLeaveType(value).includes('maternity');
}

export function isPaternityLeave(value) {
  return normalizeLeaveType(value).includes('paternity');
}

export function isFemaleEmployee(gender) {
  return ['female', 'f'].includes(String(gender || '').trim().toLowerCase());
}

export function isWithinSixMonthMaternityLimit(startDate, endDate) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(startDate || '') || !datePattern.test(endDate || '')) return false;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start ||
      start.toISOString().slice(0, 10) !== startDate || end.toISOString().slice(0, 10) !== endDate) return false;

  const monthIndex = start.getUTCMonth() + 6;
  const targetYear = start.getUTCFullYear() + Math.floor(monthIndex / 12);
  const targetMonth = monthIndex % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const limit = new Date(Date.UTC(targetYear, targetMonth, Math.min(start.getUTCDate(), lastDayOfTargetMonth)));
  limit.setUTCDate(limit.getUTCDate() - 1);
  return end <= limit;
}

export function calculateLeaveDays(startDate, endDate, isHalfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(endDate || '')) return null;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  if (new Date(start).toISOString().slice(0, 10) !== startDate ||
      new Date(end).toISOString().slice(0, 10) !== endDate) return null;
  const fullDays = Math.floor((end - start) / 86400000) + 1;
  return isHalfDay ? fullDays - 0.5 : fullDays;
}
