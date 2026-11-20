import { getEmployeeWeekoffDays } from '@/lib/attendanceCalendar';

export function getLeaveAbbreviation(leaveType) {
  if (!leaveType) return 'CL';
  const lt = leaveType.toLowerCase().trim();
  if (lt.includes('casual') || lt === 'cl') return 'CL';
  if (lt.includes('earned') || lt.includes('paid') || lt === 'el' || lt === 'pl') return 'EL';
  if (lt.includes('sick') || lt.includes('medical') || lt === 'sl') return 'SL';
  if (lt.includes('without pay') || lt.includes('unpaid') || lt === 'lwp') return 'LWP';
  if (lt.includes('coff') || lt.includes('compensatory') || lt === 'c-off') return 'C-off';
  return 'CL';
}

export function resolveDayAttendance(emp, col, approvedLeaves = []) {
  const att = emp?.attendances?.find(a => a.date === col.fullDate);
  const rawStatus = att?.status;
  const employeeWeekoffDays = getEmployeeWeekoffDays(col.workWeeks || []);
  const isWeekOff = !col.isWorkingDay && employeeWeekoffDays.includes(col.dayName);
  const isScheduledWorkingDay = col.isWorkingDay || (!col.isHoliday && !isWeekOff);

  const explicitStatuses = ['P', 'HD', 'A', 'CL', 'SL', 'EL', 'C-off', 'LWP', 'W-off', 'H'];
  if (att?.isManual || rawStatus === '-' || rawStatus === 'Not Marked' || explicitStatuses.includes(rawStatus)) {
    return rawStatus === 'Not Marked' ? '-' : rawStatus;
  }

  let slots = [];
  try { slots = Array.isArray(att?.timeSlots) ? att.timeSlots : JSON.parse(att?.timeSlots || '[]'); } catch { slots = []; }
  const hasPunch = slots.some(slot => slot?.in || slot?.out);
  const workedStatus = ['Present', 'P', 'Late', 'Half Day', 'HD', 'C-off', 'COFF', 'COff'].includes(rawStatus);
  if (!col.isWorkingDay && (col.isHoliday || isWeekOff)) return hasPunch || workedStatus ? 'C-off' : col.isHoliday ? 'H' : 'W-off';

  if (isScheduledWorkingDay && ['Holiday', 'H', 'Weekly Off', 'W-off', 'Off', 'C-off', 'COFF', 'COff'].includes(rawStatus)) {
    return hasPunch ? 'P' : col.fullDate < new Date().toISOString().slice(0, 10) ? 'A' : '-';
  }

  const leave = approvedLeaves.find(l => l.employeeId === emp?.id && col.fullDate >= l.startDate && col.fullDate <= l.endDate);
  if (leave) return getLeaveAbbreviation(leave.leaveType);

  if (rawStatus) {
    if (rawStatus === 'Present') return 'P';
    if (rawStatus === 'Absent') return 'A';
    if (rawStatus === 'Half Day' || rawStatus === 'HD') return 'HD';
    if (rawStatus === 'Holiday') return 'H';
    if (rawStatus === 'Weekly Off') return 'W-off';
    if (rawStatus === 'Leave' || rawStatus === 'L') return 'CL';
    if (['P', 'A', 'HD', 'CL', 'SL', 'EL', 'C-off', 'LWP', 'W-off', 'H'].includes(rawStatus)) return rawStatus;
  }

  if (col.isHoliday) return 'H';
  if (isWeekOff) return 'W-off';
  if (col.isWorkingDay) return col.fullDate < new Date().toISOString().slice(0, 10) ? 'A' : '-';
  return '-';
}
