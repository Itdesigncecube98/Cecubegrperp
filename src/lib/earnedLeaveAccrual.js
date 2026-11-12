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

export const EARNED_LEAVE_ENCASHMENT_MIN_BALANCE = 50;
export const EARNED_LEAVE_ENCASHMENT_MAX_DAYS = 20;

export function getEarnedLeaveAccrual(
  joinedDate,
  asOnMonth,
  openingBalance = null,
  openingBalanceAsOnDate = null,
) {
  const joinDate = parseDateOnly(joinedDate);
  const cutoff = monthEnd(asOnMonth);
  if (!cutoff) return { monthsSinceJoining: 0, accruedLeaves: 0 };

  const parsedOpeningDate = parseDateOnly(openingBalanceAsOnDate);
  const hasOpeningBalance = openingBalance !== null && openingBalance !== undefined &&
    Number.isFinite(Number(openingBalance)) && parsedOpeningDate && parsedOpeningDate <= cutoff;
  if (!joinDate || joinDate > cutoff) {
    return {
      monthsSinceJoining: 0,
      accruedLeaves: hasOpeningBalance ? Number(openingBalance) : 0,
    };
  }

  const monthsSinceJoining = Math.max(
    0,
    (cutoff.getUTCFullYear() - joinDate.getUTCFullYear()) * 12
      + cutoff.getUTCMonth() - joinDate.getUTCMonth()
  );
  let accruedLeaves = hasOpeningBalance ? Number(openingBalance) : 0;
  for (let serviceMonth = 1; ; serviceMonth += 1) {
    const creditDate = addMonthsClamped(joinDate, serviceMonth);
    if (creditDate > cutoff) break;
    if (!hasOpeningBalance || creditDate > parsedOpeningDate) accruedLeaves += 1.5;
  }

  return { monthsSinceJoining, accruedLeaves };
}

export function getCasualLeaveAccrual(joinedDate, asOnMonth, leavesPerMonth = 1) {
  const joinDate = parseDateOnly(joinedDate);
  const cutoff = monthEnd(asOnMonth);
  if (!joinDate || !cutoff || joinDate > cutoff) return { monthsSinceJoining: 0, accruedLeaves: 0 };

  const monthsSinceJoining = Math.max(
    0,
    (cutoff.getUTCFullYear() - joinDate.getUTCFullYear()) * 12
      + cutoff.getUTCMonth() - joinDate.getUTCMonth()
  );
  let accruedLeaves = 0;
  for (let serviceMonth = 1; ; serviceMonth += 1) {
    const creditDate = addMonthsClamped(joinDate, serviceMonth);
    if (creditDate > cutoff) break;
    accruedLeaves += leavesPerMonth;
  }
  return {
    monthsSinceJoining,
    accruedLeaves,
  };
}

function calculateLeaveDaysTaken(leaveRequests, asOnMonth, attendance, isLeaveType, excludeThroughDate = null) {
  const cutoff = monthEnd(asOnMonth);
  const excludedThrough = parseDateOnly(excludeThroughDate);
  if (!cutoff) return 0;

  const takenDates = new Map();
  const requestDates = new Set();
  leaveRequests.forEach(request => {
    const originalStart = parseDateOnly(request.startDate);
    let start = originalStart;
    const end = parseDateOnly(request.endDate);
    if (!start || !end || start > cutoff) return;
    if (excludedThrough && start <= excludedThrough) {
      start = new Date(excludedThrough.getTime() + 86400000);
    }
    const lastDay = end < cutoff ? end : cutoff;
    if (start > lastDay) return;
    for (let date = start; date <= lastDay; date = new Date(date.getTime() + 86400000)) {
      requestDates.add(date.toISOString().slice(0, 10));
    }
  });
  attendance.forEach(record => {
    const status = String(record.status || '').trim().toLowerCase();
    const date = parseDateOnly(record.date);
    const dateKey = date?.toISOString().slice(0, 10);
    if (!date || date > cutoff || (excludedThrough && date <= excludedThrough) ||
        !isLeaveType(status) || requestDates.has(dateKey)) return;
    takenDates.set(dateKey, 1);
  });

  leaveRequests.forEach(request => {
    const leaveType = String(request.leaveType || '').trim().toLowerCase();
    if (!isLeaveType(leaveType)) return;

    const originalStart = parseDateOnly(request.startDate);
    let start = originalStart;
    const end = parseDateOnly(request.endDate);
    if (!start || !end || start > cutoff) return;
    if (excludedThrough && start <= excludedThrough) {
      start = new Date(excludedThrough.getTime() + 86400000);
    }
    const lastDay = end < cutoff ? end : cutoff;
    if (lastDay < start) return;

    for (let date = start; date <= lastDay; date = new Date(date.getTime() + 86400000)) {
      const dateKey = date.toISOString().slice(0, 10);
      const days = request.isHalfDay && dateKey === originalStart.toISOString().slice(0, 10) ? 0.5 : 1;
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

export function calculateEarnedLeaveDaysTaken(leaveRequests, asOnMonth, attendance = [], excludeThroughDate = null) {
  return calculateLeaveDaysTaken(leaveRequests, asOnMonth, attendance, isEarnedLeaveType, excludeThroughDate);
}

export function calculateCasualLeaveDaysTaken(leaveRequests, asOnMonth, attendance = []) {
  return calculateLeaveDaysTaken(leaveRequests, asOnMonth, attendance, isCasualLeaveType);
}

export function calculateEncashedLeaveDays(
  encashments,
  asOnMonth,
  requestedLeaveType = 'Earned Leave',
  excludeThroughDate = null,
) {
  const isMatchingLeaveType = requestedLeaveType === 'Casual Leave'
    ? isCasualLeaveType
    : isEarnedLeaveType;
  const excludedThrough = parseDateOnly(excludeThroughDate);

  return encashments.reduce((total, encashment) => {
    const leaveType = String(encashment.leaveType || 'Earned Leave').trim().toLowerCase();
    const createdDate = parseDateOnly(encashment.createdAt);
    const encashmentMonth = String(encashment.asOnDate || '').slice(0, 7);
    const isBeforeOpeningBalance = excludedThrough && (
      createdDate
        ? createdDate <= excludedThrough
        : encashmentMonth <= excludedThrough.toISOString().slice(0, 7)
    );
    if (!isMatchingLeaveType(leaveType)
      || encashment.cancelledAt
      || encashmentMonth > asOnMonth
      || isBeforeOpeningBalance) {
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

export function calculateAvailableEarnedLeave({
  joinedDate,
  asOnMonth,
  leaveRequests,
  encashments,
  attendance = [],
  openingBalance = null,
  openingBalanceAsOnDate = null,
}) {
  const { accruedLeaves, monthsSinceJoining } = getEarnedLeaveAccrual(
    joinedDate,
    asOnMonth,
    openingBalance,
    openingBalanceAsOnDate,
  );
  const parsedOpeningDate = parseDateOnly(openingBalanceAsOnDate);
  const cutoff = monthEnd(asOnMonth);
  const baselineDate = openingBalance !== null && openingBalance !== undefined &&
    Number.isFinite(Number(openingBalance)) && parsedOpeningDate && cutoff && parsedOpeningDate <= cutoff
    ? openingBalanceAsOnDate
    : null;
  const leavesTaken = calculateEarnedLeaveDaysTaken(leaveRequests, asOnMonth, attendance, baselineDate);
  const leavesEncashed = calculateEncashedLeaveDays(encashments, asOnMonth, 'Earned Leave', baselineDate);
  return {
    monthsSinceJoining,
    accruedLeaves,
    leavesTaken,
    leavesEncashed,
    availableLeaves: Math.max(0, accruedLeaves - leavesTaken - leavesEncashed),
  };
}
