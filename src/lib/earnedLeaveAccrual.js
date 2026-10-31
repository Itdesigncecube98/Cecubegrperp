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

export function getEarnedLeaveAccrual(joinedDate, asOnMonth, leavesPerMonth = 1.5) {
  const joinDate = parseDateOnly(joinedDate);
  const cutoff = monthEnd(asOnMonth);
  if (!joinDate || !cutoff || joinDate > cutoff) return { monthsSinceJoining: 0, accruedLeaves: 0 };

  const monthsSinceJoining = Math.max(
    0,
    (cutoff.getUTCFullYear() - joinDate.getUTCFullYear()) * 12
      + cutoff.getUTCMonth() - joinDate.getUTCMonth()
  );
  let accruedMonths = 0;
  for (let monthsAfterJoining = 10; ; monthsAfterJoining += 1) {
    if (addMonthsClamped(joinDate, monthsAfterJoining) > cutoff) break;
    accruedMonths += 1;
  }

  return { monthsSinceJoining, accruedLeaves: accruedMonths * leavesPerMonth };
}

export function getCasualLeaveAccrual(joinedDate, asOnMonth, leavesPerYear = 12) {
  const joinDate = parseDateOnly(joinedDate);
  const cutoff = monthEnd(asOnMonth);
  if (!joinDate || !cutoff || joinDate > cutoff) return { monthsSinceJoining: 0, accruedLeaves: 0 };

  let monthsSinceJoining = 0;
  for (let month = 1; addMonthsClamped(joinDate, month) <= cutoff; month += 1) {
    monthsSinceJoining += 1;
  }

  return {
    monthsSinceJoining,
    accruedLeaves: (monthsSinceJoining * leavesPerYear) / 12,
  };
}

function calculateLeaveDaysTaken(leaveRequests, asOnMonth, attendance, isLeaveType) {
  const cutoff = monthEnd(asOnMonth);
  if (!cutoff) return 0;

  const takenDates = new Map();
  attendance.forEach(record => {
    const status = String(record.status || '').trim().toLowerCase();
    const date = parseDateOnly(record.date);
    if (!date || date > cutoff || !isLeaveType(status)) return;
    takenDates.set(date.toISOString().slice(0, 10), 1);
  });

  leaveRequests.forEach(request => {
    const leaveType = String(request.leaveType || '').trim().toLowerCase();
    if (!isLeaveType(leaveType)) return;

    const start = parseDateOnly(request.startDate);
    const end = parseDateOnly(request.endDate);
    if (!start || !end || start > cutoff) return;
    const lastDay = end < cutoff ? end : cutoff;
    if (lastDay < start) return;

    if (request.isHalfDay) {
      const dateKey = start.toISOString().slice(0, 10);
      if (!takenDates.has(dateKey)) takenDates.set(dateKey, 0.5);
      return;
    }

    for (let date = start; date <= lastDay; date = new Date(date.getTime() + 86400000)) {
      const dateKey = date.toISOString().slice(0, 10);
      if (!takenDates.has(dateKey)) takenDates.set(dateKey, 1);
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
