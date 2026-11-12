const normalizeName = value => String(value || '').trim().toLowerCase();

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Resolve weekly offs from WorkWeek; dated holiday/workday announcements override them. */
export function getEmployeeWeekoffDays(workWeeks = []) {
  const configuredDays = new Set(
    workWeeks
      .filter(day => !day.isWorking)
      .map(day => WEEKDAYS.find(weekday => normalizeName(weekday) === normalizeName(day.day)))
      .filter(Boolean),
  );
  return workWeeks.length ? WEEKDAYS.filter(day => configuredDays.has(day)) : ['Sunday'];
}

export function isEmployeeWeekoff(date, workWeeks = []) {
  const dayName = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  return getEmployeeWeekoffDays(workWeeks).includes(dayName);
}
