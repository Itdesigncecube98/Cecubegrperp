const normalizeName = value => String(value || '').trim().toLowerCase();

/** Resolve weekly off days from global settings and employee-assigned templates. */
export function getEmployeeWeekoffDays(employee, weekoffTypes = [], workWeeks = []) {
  const assignedNames = new Set((employee?.offDaysTemplates || []).map(normalizeName));
  const applicableTypes = weekoffTypes.filter(type =>
    normalizeName(type.assignedTo) === 'all employees' || assignedNames.has(normalizeName(type.name))
  );
  const templateDays = [...new Set(applicableTypes.flatMap(type => Array.isArray(type.days) ? type.days : []))];

  if (templateDays.length) return templateDays;
  const configuredDays = workWeeks.filter(day => !day.isWorking).map(day => day.day);
  return configuredDays.length || workWeeks.length ? configuredDays : ['Sunday'];
}

export function isEmployeeWeekoff(employee, date, weekoffTypes = [], workWeeks = []) {
  const dayName = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  return getEmployeeWeekoffDays(employee, weekoffTypes, workWeeks).includes(dayName);
}
