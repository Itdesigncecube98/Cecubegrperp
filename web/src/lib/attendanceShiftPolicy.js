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
    const toMinutes = (t) => {
      const [h, m] = t.split(':');
      return Number(h) * 60 + Number(m);
    };

    const times = machinePunchTimes
      .map(normalizeMachinePunch)
      .filter((entry) => entry && entry.time && entry.time < AUTO_OUT_TIME)
      .map((entry) => entry.time)
      .sort();

    // 2 minute ke andar duplicate punch ko ek maano
    const punches = [];
    for (const t of times) {
      const prev = punches[punches.length - 1];
      if (prev && toMinutes(t) - toMinutes(prev) < 2) continue;
      punches.push(t);
    }
    if (!punches.length) return null;

    // 1st = IN, 2nd = OUT, 3rd = IN, 4th = OUT ...
    const slots = [];
    for (let i = 0; i < punches.length; i += 2) {
      slots.push({ in: punches[i], out: punches[i + 1] || '' });
    }

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
