const pad = value => String(value).padStart(2, '0');

export function toDateKey(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const dateOnly = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function addMonthsToDateKey(dateKey, months) {
  const parsed = toDateKey(dateKey);
  if (!parsed) return null;

  const [year, month, day] = parsed.split('-').map(Number);
  const targetMonth = new Date(Date.UTC(year, month - 1 + months, 1));
  const targetYear = targetMonth.getUTCFullYear();
  const targetMonthNumber = targetMonth.getUTCMonth();
  const lastDay = new Date(Date.UTC(targetYear, targetMonthNumber + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);
  return `${targetYear}-${pad(targetMonthNumber + 1)}-${pad(targetDay)}`;
}

export function getEarnedLeaveEligibilityDate(employee, eligibilityMonths = 8) {
  const joinedDate = toDateKey(
    employee?.joinedDate ?? employee?.joiningDate ?? employee?.dateOfJoining ?? employee?.doj,
  );
  return joinedDate ? addMonthsToDateKey(joinedDate, eligibilityMonths) : null;
}

export function addDaysToDateKey(dateKey, days) {
  const parsed = toDateKey(dateKey);
  if (!parsed) return null;
  const date = new Date(`${parsed}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
