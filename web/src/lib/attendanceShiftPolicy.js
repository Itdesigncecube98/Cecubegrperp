const AUTO_OUT_TIME = '19:00';

export const getShiftKind = (shift) => {
  if (!shift) return null;
  const label = `${shift.shiftName || ''} ${shift.shortName || ''}`.toLowerCase();
  if (label.includes('night')) return 'NIGHT';
  if (label.includes('day')) return 'DAY';
  return null;
};

export const getEffectiveEmployeeShift = (employeeShifts, employeeId, date) =>
  employeeShifts.find((assignment) =>
    assignment.employeeId === employeeId &&
    assignment.effectiveFrom <= date &&
    (!assignment.validTill || assignment.validTill >= date)
  ) || null;

/**
 * Enforce the attendance cutoff consistently for machine ingest and stats.
 * A Day shift machine attendance starts at its first pre-19:00 punch and ends
 * at 19:00. For stats, only an unapproved, open Day shift slot is auto-closed.
 * Night, unassigned, and unknown shifts are deliberately left untouched.
 */
export const resolveDayShiftAttendanceSlots = ({
  shift,
  machinePunchTimes,
  attendanceDate,
  today,
  currentTime,
  existingSlots,
  isApproved = false,
}) => {
  if (getShiftKind(shift) !== 'DAY') return null;

  if (Array.isArray(machinePunchTimes)) {
    const firstIn = [...machinePunchTimes]
      .filter((time) => typeof time === 'string' && time < AUTO_OUT_TIME)
      .sort()[0];
    if (!firstIn) return null;
    const shouldClose = attendanceDate < today || (attendanceDate === today && currentTime >= AUTO_OUT_TIME);
    return [{ in: firstIn, out: shouldClose ? AUTO_OUT_TIME : '' }];
  }

  if (!Array.isArray(existingSlots) || isApproved) return null;
  const shouldClose = attendanceDate < today || (attendanceDate === today && currentTime >= AUTO_OUT_TIME);
  if (!shouldClose) return null;

  let changed = false;
  const updatedSlots = existingSlots.map((slot) => {
    if (slot?.in && !slot.out && slot.in < AUTO_OUT_TIME) {
      changed = true;
      return { ...slot, out: AUTO_OUT_TIME };
    }
    return slot;
  });
  return changed ? updatedSlots : null;
};
