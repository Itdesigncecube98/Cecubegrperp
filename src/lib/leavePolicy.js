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
  return ['CL', 'EL', 'COFF', 'LWP'].includes(getLeaveCategory(value));
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
