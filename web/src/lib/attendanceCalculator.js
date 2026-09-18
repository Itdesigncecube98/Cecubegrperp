/**
 * Attendance and Salary Calculation Logic
 * Syncs with shift timings to determine full/half day status
 */

/**
 * Parse time string to minutes from midnight
 * @param {string} timeStr - Time in format "HH:MM AM/PM"
 * @returns {number} Minutes from midnight
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  
  const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3]?.toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

/**
 * Determine attendance status based on punch in/out times
 * @param {Object} shift - Shift details
 * @param {string} punchIn - Actual punch in time
 * @param {string} punchOut - Actual punch out time
 * @returns {Object} Attendance status with salary multiplier
 */
export function calculateAttendanceStatus(shift, punchIn, punchOut) {
  if (!punchIn) {
    return {
      status: 'Absent',
      salaryMultiplier: 0,
      dayType: 'Absent',
      reason: 'No punch in recorded'
    };
  }

  if (!punchOut) {
    return {
      status: 'Pending',
      salaryMultiplier: 0,
      dayType: 'Punch Out Pending',
      reason: 'Checkout not recorded yet',
      warning: 'Cannot calculate salary until punch out'
    };
  }

  const halfDayTimeIn = parseTimeToMinutes(shift.timeInHalfDay);   // 11:00 AM
  const halfDayTimeOut = parseTimeToMinutes(shift.timeOutHalfDay); // 04:00 PM
  
  const actualPunchIn = parseTimeToMinutes(punchIn);
  const actualPunchOut = parseTimeToMinutes(punchOut);

  // Check if late in (after half-day threshold e.g., 11:00 AM)
  const isLateIn = halfDayTimeIn && actualPunchIn > halfDayTimeIn;
  
  // Check if early out (before half-day threshold e.g., 04:00 PM)
  const isEarlyOut = halfDayTimeOut && actualPunchOut < halfDayTimeOut;

  // Case 3: Late in + Early out = No salary (Absent)
  if (isLateIn && isEarlyOut) {
    return {
      status: 'Absent',
      salaryMultiplier: 0,
      dayType: 'Absent - Insufficient Hours',
      reason: `Late in (after ${shift.timeInHalfDay}) AND early out (before ${shift.timeOutHalfDay})`
    };
  }

  // Case 1: Late in but stayed till end = Half day
  if (isLateIn && !isEarlyOut) {
    return {
      status: 'Half Day',
      salaryMultiplier: 0.5,
      dayType: 'Half Day - Late In',
      reason: `Punched in after ${shift.timeInHalfDay}, but completed shift`
    };
  }

  // Case 2: On time but left early = Half day
  if (!isLateIn && isEarlyOut) {
    return {
      status: 'Half Day',
      salaryMultiplier: 0.5,
      dayType: 'Half Day - Early Out',
      reason: `On time but punched out before ${shift.timeOutHalfDay}`
    };
  }

  // Case 4: On time + Full shift = Full day
  return {
    status: 'Present',
    salaryMultiplier: 1.0,
    dayType: 'Full Day',
    reason: 'Complete shift worked on time'
  };
}

/**
 * Calculate daily salary based on attendance status
 * @param {number} monthlySalary - Employee monthly salary
 * @param {Object} attendanceStatus - Result from calculateAttendanceStatus
 * @param {number} workingDaysInMonth - Total working days in month
 * @returns {number} Daily salary amount
 */
export function calculateDailySalary(monthlySalary, attendanceStatus, workingDaysInMonth = 26) {
  const perDaySalary = monthlySalary / workingDaysInMonth;
  return perDaySalary * attendanceStatus.salaryMultiplier;
}

/**
 * Calculate monthly salary based on attendance records
 * @param {number} monthlySalary - Base monthly salary
 * @param {Array} attendanceRecords - Array of attendance records with status
 * @param {number} workingDaysInMonth - Total working days in month
 * @returns {Object} Salary breakdown
 */
export function calculateMonthlySalary(monthlySalary, attendanceRecords, workingDaysInMonth = 26) {
  const perDaySalary = monthlySalary / workingDaysInMonth;
  
  let totalEarned = 0;
  let fullDays = 0;
  let halfDays = 0;
  let absentDays = 0;

  attendanceRecords.forEach(record => {
    if (record.status === 'Present' && record.salaryMultiplier === 1.0) {
      fullDays++;
      totalEarned += perDaySalary;
    } else if (record.status === 'Half Day' || record.salaryMultiplier === 0.5) {
      halfDays++;
      totalEarned += perDaySalary * 0.5;
    } else {
      absentDays++;
    }
  });

  return {
    monthlySalary,
    perDaySalary: perDaySalary.toFixed(2),
    fullDays,
    halfDays,
    absentDays,
    totalWorkedDays: fullDays + (halfDays * 0.5),
    totalEarned: totalEarned.toFixed(2),
    deduction: (monthlySalary - totalEarned).toFixed(2)
  };
}

/**
 * Example usage:
 * 
 * const shift = {
 *   shiftName: 'General Day Shift',
 *   startTime: '09:00 AM',
 *   endTime: '06:00 PM',
 *   timeInHalfDay: '11:00 AM',  // Late threshold
 *   timeOutHalfDay: '04:00 PM'  // Early out threshold
 * };
 * 
 * // Case 1: Late in but full shift - Half Day (50%)
 * const case1 = calculateAttendanceStatus(shift, '11:30 AM', '06:00 PM');
 * // => { status: 'Half Day', salaryMultiplier: 0.5 }
 * 
 * // Case 2: On time but early out - Half Day (50%)
 * const case2 = calculateAttendanceStatus(shift, '09:00 AM', '03:30 PM');
 * // => { status: 'Half Day', salaryMultiplier: 0.5 }
 * 
 * // Case 3: Late in + early out - Absent (0%)
 * const case3 = calculateAttendanceStatus(shift, '11:30 AM', '03:30 PM');
 * // => { status: 'Absent', salaryMultiplier: 0 }
 * 
 * // Case 4: On time + full shift - Full Day (100%)
 * const case4 = calculateAttendanceStatus(shift, '09:00 AM', '06:00 PM');
 * // => { status: 'Present', salaryMultiplier: 1.0 }
 * 
 * // Salary calculation
 * const dailySalary = calculateDailySalary(30000, case1, 26);
 * // => 576.92 (half of per day salary for Case 1)
 */
