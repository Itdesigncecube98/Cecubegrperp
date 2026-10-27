const AUTO_OUT_TIME = '19:00';

const normalizeMachinePunch = (entry) => {
  if (typeof entry === 'string') {
    return { time: entry, direction: null };
  }
  if (!entry || typeof entry.time !== 'string') return null;

  const rawDirection = typeof entry.direction === 'string' ? entry.direction.trim().toUpperCase() : '';
  let direction = null;
  if (rawDirection) {
    if (rawDirection === 'IN' || rawDirection === 'I' || rawDirection.includes('IN')) direction = 'IN';
    else if (rawDirection === 'OUT' || rawDirection === 'O' || rawDirection.includes('OUT')) direction = 'OUT';
  }

  return { time: entry.time, direction };
};

export const getShiftKind = (shift) => {
  if (!shift) return null;
  const label = `${shift.shiftName || ''} ${shift.shortName || ''}`.toLowerCase();
  if (label.includes('night')) return 'NIGHT';
  return 'DAY'; // all non-night shifts treated as Day (General Shift, Morning Shift, etc.)
};

export const getEffectiveEmployeeShift = (employeeShifts, employeeId, date) =>
  employeeShifts.find((assignment) =>
    assignment.employeeId === employeeId &&
    assignment.effectiveFrom <= date &&
    (!assignment.validTill || assignment.validTill >= date)
  ) || null;

export const resolveNightShiftAttendanceSlots = (machinePunchTimes) => {
  if (!Array.isArray(machinePunchTimes)) return null;

  const punches = machinePunchTimes
    .map(normalizeMachinePunch)
    .filter((entry) => entry && entry.time)
    .sort((a, b) => a.time.localeCompare(b.time));
  if (!punches.length) return null;

  const slots = [];
  for (const punch of punches) {
    const openSlot = slots.find((slot) => !slot.out);
    if (punch.direction === 'OUT') {
      if (openSlot) openSlot.out = punch.time;
    } else if (punch.direction === 'IN' || !openSlot) {
      slots.push({ in: punch.time, out: '' });
    } else {
      openSlot.out = punch.time;
    }
  }
  return slots.length ? slots : null;
};

/**
 * Enforce the attendance cutoff consistently for machine ingest and stats.
 * - Prefer the first non-OUT pre-19:00 punch as IN
 * - Prefer the last explicit OUT pre-19:00 punch as OUT
 * - Fallback to first/last pre-19:00 punch when direction is unavailable
 * - If only one punch exists and day is over, auto-close at 19:00
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
    const punches = machinePunchTimes
      .map(normalizeMachinePunch)
      .filter((entry) => entry && entry.time && entry.time < AUTO_OUT_TIME)
      .sort((a, b) => a.time.localeCompare(b.time));
    if (!punches.length) return null;

    const slots = [];
    for (const punch of punches) {
      const openSlot = slots.find((slot) => !slot.out);
      if (punch.direction === 'OUT') {
        if (openSlot) openSlot.out = punch.time;
      } else if (punch.direction === 'IN' || !openSlot) {
        slots.push({ in: punch.time, out: '' });
      } else {
        openSlot.out = punch.time;
      }
    }
    if (!slots.length) return null;

    const shouldClose = attendanceDate < today || (attendanceDate === today && currentTime >= AUTO_OUT_TIME);
    const last = slots[slots.length - 1];
    if (!last.out && shouldClose) last.out = AUTO_OUT_TIME;

    return slots;
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
