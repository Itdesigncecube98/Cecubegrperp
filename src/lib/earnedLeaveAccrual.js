function parseDateOnly(value) {
  if (!value) return null;
  const text = String(value).trim();
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));

  match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

function monthEnd(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ''))) return null;
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 0));
}

export function getMonthEndDateString(month) {
  return monthEnd(month)?.toISOString().slice(0, 10) || null;
}

function addMonthsClamped(date, months) {
  const totalMonth = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(totalMonth / 12);
  const month = totalMonth % 12;
  const day = Math.min(date.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, month, day));
}

export function getEarnedLeaveAccrual(joinedDate, asOnMonth) {
  const joinDate = parseDateOnly(joinedDate);
  const cutoff = monthEnd(asOnMonth);
  if (!joinDate || !cutoff || joinDate > cutoff) return { monthsSinceJoining: 0, accruedLeaves: 0 };

  const monthsSinceJoining = Math.max(
    0,
    (cutoff.getUTCFullYear() - joinDate.getUTCFullYear()) * 12
      + cutoff.getUTCMonth() - joinDate.getUTCMonth()
  );
  const eligibilityDate = addMonthsClamped(joinDate, 8);
  if (eligibilityDate > cutoff) return { monthsSinceJoining, accruedLeaves: 0 };

  let accruedLeaves = 0;
  for (let creditDate = eligibilityDate; creditDate <= cutoff; creditDate = addMonthsClamped(creditDate, 12)) {
    accruedLeaves += 18;
  }

  return { monthsSinceJoining, accruedLeaves };
}

export function getCasualLeaveAccrual(joinedDate, asOnMonth, leavesPerYear = 12) {
  const joinDate = parseDateOnly(joinedDate);
  const cutoff = monthEnd(asOnMonth);
  if (!joinDate || !cutoff || joinDate > cutoff) return { monthsSinceJoining: 0, accruedLeaves: 0 };

  const monthsSinceJoining = Math.max(
    0,
    (cutoff.getUTCFullYear() - joinDate.getUTCFullYear()) * 12
      + cutoff.getUTCMonth() - joinDate.getUTCMonth()
  );
  let accruedLeaves = 0;
  for (let creditDate = joinDate; creditDate <= cutoff; creditDate = addMonthsClamped(creditDate, 12)) {
    accruedLeaves += leavesPerYear;
  }
  return {
    monthsSinceJoining,
    accruedLeaves,
  };
}

function calculateLeaveDaysTaken(leaveRequests, asOnMonth, attendance, isLeaveType) {
  const cutoff = monthEnd(asOnMonth);
  if (!cutoff) return 0;

  const takenDates = new Map();
  const requestDates = new Set();
  leaveRequests.forEach(request => {
    const start = parseDateOnly(request.startDate);
    const end = parseDateOnly(request.endDate);
    if (!start || !end || start > cutoff) return;
    const lastDay = end < cutoff ? end : cutoff;
    for (let date = start; date <= lastDay; date = new Date(date.getTime() + 86400000)) {
      requestDates.add(date.toISOString().slice(0, 10));
    }
  });
  attendance.forEach(record => {
    const status = String(record.status || '').trim().toLowerCase();
    const date = parseDateOnly(record.date);
    const dateKey = date?.toISOString().slice(0, 10);
    if (!date || date > cutoff || !isLeaveType(status) || requestDates.has(dateKey)) return;
    takenDates.set(dateKey, 1);
  });

  leaveRequests.forEach(request => {
    const leaveType = String(request.leaveType || '').trim().toLowerCase();
    if (!isLeaveType(leaveType)) return;

    const start = parseDateOnly(request.startDate);
    const end = parseDateOnly(request.endDate);
    if (!start || !end || start > cutoff) return;
    const lastDay = end < cutoff ? end : cutoff;
    if (lastDay < start) return;

    for (let date = start; date <= lastDay; date = new Date(date.getTime() + 86400000)) {
      const dateKey = date.toISOString().slice(0, 10);
      const days = request.isHalfDay && dateKey === start.toISOString().slice(0, 10) ? 0.5 : 1;
      if (isLeaveType(leaveType)) takenDates.set(dateKey, Math.max(takenDates.get(dateKey) || 0, days));
    }
  });

  return Array.from(takenDates.values()).reduce((total, days) => total + days, 0);
}

const isEarnedLeaveType = leaveType => (
  leaveType.includes('earned') || ['el', 'pl', 'paid leave'].includes(leaveType)
);

const isCasualLeaveType = leaveType => (
  leaveType.includes('casual') || leaveType === 'cl'
);

export function calculateEarnedLeaveDaysTaken(leaveRequests, asOnMonth, attendance = []) {
  return calculateLeaveDaysTaken(leaveRequests, asOnMonth, attendance, isEarnedLeaveType);
}

export function calculateCasualLeaveDaysTaken(leaveRequests, asOnMonth, attendance = []) {
  return calculateLeaveDaysTaken(leaveRequests, asOnMonth, attendance, isCasualLeaveType);
}

export function calculateEncashedLeaveDays(encashments, asOnMonth, requestedLeaveType = 'Earned Leave') {
  const isMatchingLeaveType = requestedLeaveType === 'Casual Leave'
    ? isCasualLeaveType
    : isEarnedLeaveType;

  return encashments.reduce((total, encashment) => {
    const leaveType = String(encashment.leaveType || 'Earned Leave').trim().toLowerCase();
    if (!isMatchingLeaveType(leaveType)
      || encashment.cancelledAt
      || String(encashment.asOnDate || '').slice(0, 7) > asOnMonth) {
      return total;
    }
    return total + (Number(encashment.encashedDays) || 0);
  }, 0);
}

export function calculateAvailableCasualLeave({
  joinedDate,
  asOnMonth,
  leaveRequests,
  encashments,
  attendance = [],
}) {
  const { accruedLeaves, monthsSinceJoining } = getCasualLeaveAccrual(joinedDate, asOnMonth);
  const leavesTaken = calculateCasualLeaveDaysTaken(leaveRequests, asOnMonth, attendance);
  const leavesEncashed = calculateEncashedLeaveDays(encashments, asOnMonth, 'Casual Leave');
  return {
    monthsSinceJoining,
    accruedLeaves,
    leavesTaken,
    leavesEncashed,
    availableLeaves: Math.max(0, accruedLeaves - leavesTaken - leavesEncashed),
  };
}

export function calculateAvailableEarnedLeave({ joinedDate, asOnMonth, leaveRequests, encashments, attendance = [] }) {
  const { accruedLeaves, monthsSinceJoining } = getEarnedLeaveAccrual(joinedDate, asOnMonth);
  const leavesTaken = calculateEarnedLeaveDaysTaken(leaveRequests, asOnMonth, attendance);
  const leavesEncashed = calculateEncashedLeaveDays(encashments, asOnMonth);
  return {
    monthsSinceJoining,
    accruedLeaves,
    leavesTaken,
    leavesEncashed,
    availableLeaves: Math.max(0, accruedLeaves - leavesTaken - leavesEncashed),
  };
}
