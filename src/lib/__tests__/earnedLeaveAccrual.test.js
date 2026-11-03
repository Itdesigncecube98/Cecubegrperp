import {
  calculateAvailableCasualLeave,
  calculateAvailableEarnedLeave,
  calculateCasualLeaveDaysTaken,
  calculateEarnedLeaveDaysTaken,
  getCasualLeaveAccrual,
  getEarnedLeaveAccrual,
} from '../earnedLeaveAccrual';

describe('getCasualLeaveAccrual', () => {
  test('credits 12 CL on joining and each joining-date anniversary', () => {
    expect(getCasualLeaveAccrual('2025-04-15', '2026-10')).toMatchObject({
      monthsSinceJoining: 18,
      accruedLeaves: 24,
    });
  });

  test('does not accrue before the joining date', () => {
    expect(getCasualLeaveAccrual('2026-11-15', '2026-10').accruedLeaves).toBe(0);
  });
});

describe('getEarnedLeaveAccrual', () => {
  test('credits 18 EL after eight months and every joining anniversary thereafter', () => {
    expect(getEarnedLeaveAccrual('2025-01-15', '2025-11')).toMatchObject({
      monthsSinceJoining: 10,
      accruedLeaves: 18,
    });
    expect(getEarnedLeaveAccrual('2025-01-15', '2026-08').accruedLeaves).toBe(18);
    expect(getEarnedLeaveAccrual('2025-01-15', '2026-09').accruedLeaves).toBe(36);
    expect(getEarnedLeaveAccrual('2025-01-15', '2026-10').accruedLeaves).toBe(36);
  });

  test('does not accrue before the eight-month service milestone', () => {
    expect(getEarnedLeaveAccrual('2025-01-15', '2025-08').accruedLeaves).toBe(0);
  });

  test('clamps a month-end joining date when calculating eligibility', () => {
    expect(getEarnedLeaveAccrual('2025-01-31', '2025-11').accruedLeaves).toBe(18);
  });

  test('bases earned-leave credits on service milestones, not April', () => {
    expect(getEarnedLeaveAccrual('2026-09-15', '2027-04').accruedLeaves).toBe(0);
    expect(getEarnedLeaveAccrual('2026-09-15', '2027-06').accruedLeaves).toBe(18);
    expect(getEarnedLeaveAccrual('2026-09-15', '2028-04').accruedLeaves).toBe(18);
    expect(getEarnedLeaveAccrual('2026-09-15', '2028-05').accruedLeaves).toBe(36);
  });

  test('ignores a cancelled encashment when calculating carried leave', () => {
    expect(calculateAvailableEarnedLeave({
      joinedDate: '2025-01-15',
      asOnMonth: '2025-11',
      leaveRequests: [],
      encashments: [
        { asOnDate: '2025-11', encashedDays: 6, cancelledAt: '2025-11-10T00:00:00.000Z' },
      ],
    }).availableLeaves).toBe(18);
  });

  test('does not subtract encashed non-earned leave from the earned-leave balance', () => {
    expect(calculateAvailableEarnedLeave({
      joinedDate: '2025-01-15',
      asOnMonth: '2025-11',
      leaveRequests: [],
      encashments: [
        { leaveType: 'Casual Leave', asOnDate: '2025-11', encashedDays: 6 },
      ],
    }).availableLeaves).toBe(18);
  });

  test('deduplicates attendance CL with an approved Casual leave request', () => {
    expect(calculateCasualLeaveDaysTaken([
      { leaveType: 'Casual', startDate: '2026-09-01', endDate: '2026-09-02', isHalfDay: false },
    ], '2026-09', [
      { date: '2026-09-01', status: 'CL' },
      { date: '2026-09-03', status: 'C-off' },
    ])).toBe(2);
  });

  test('calculates the available casual leave after attendance and encashment', () => {
    expect(calculateAvailableCasualLeave({
      joinedDate: '2025-04-15',
      asOnMonth: '2026-10',
      leaveRequests: [],
      encashments: [
        { leaveType: 'Casual Leave', asOnDate: '2026-09', encashedDays: 2 },
        { leaveType: 'Earned Leave', asOnDate: '2026-09', encashedDays: 4 },
      ],
      attendance: [
        { date: '2026-09-01', status: 'CL' },
        { date: '2026-09-02', status: 'EL' },
      ],
    })).toMatchObject({
      accruedLeaves: 24,
      leavesTaken: 1,
      leavesEncashed: 2,
      availableLeaves: 21,
    });
  });

  test('deducts a half-day request even when the biometric attendance is present', () => {
    expect(calculateCasualLeaveDaysTaken([
      { leaveType: 'Casual', startDate: '2026-09-01', endDate: '2026-09-01', isHalfDay: true },
    ], '2026-09', [
      { date: '2026-09-01', status: 'Present' },
    ])).toBe(0.5);
  });
});

describe('calculateAvailableEarnedLeave', () => {
  test('carries forward accrual and subtracts leave taken and encashed', () => {
    const balance = calculateAvailableEarnedLeave({
      joinedDate: '2024-01-15',
      asOnMonth: '2026-09',
      leaveRequests: [
        { leaveType: 'Earned Leave', startDate: '2025-10-01', endDate: '2025-10-02', isHalfDay: false },
      ],
      encashments: [{ asOnDate: '2026-02', encashedDays: 5 }],
    });
    expect(balance).toMatchObject({
      accruedLeaves: 54,
      leavesTaken: 2,
      leavesEncashed: 5,
      availableLeaves: 47,
    });
  });

  test('counts only earned-leave days through the selected month', () => {
    expect(calculateEarnedLeaveDaysTaken([
      { leaveType: 'Earned Leave', startDate: '2026-09-29', endDate: '2026-10-02', isHalfDay: false },
      { leaveType: 'Casual Leave', startDate: '2026-09-01', endDate: '2026-09-03', isHalfDay: false },
    ], '2026-09')).toBe(2);
  });

  test('counts attendance EL and avoids counting the same approved leave dates twice', () => {
    expect(calculateEarnedLeaveDaysTaken([
      { leaveType: 'Paid leave', startDate: '2026-09-01', endDate: '2026-09-02', isHalfDay: false },
    ], '2026-09', [
      { date: '2026-09-01', status: 'EL' },
      { date: '2026-09-03', status: 'el' },
      { date: '2026-09-04', status: 'C-OFF' },
      { date: '2026-10-01', status: 'EL' },
    ])).toBe(3);
  });

  test('subtracts attendance EL from the encashable balance', () => {
    expect(calculateAvailableEarnedLeave({
      joinedDate: '2025-01-15',
      asOnMonth: '2026-09',
      leaveRequests: [],
      encashments: [],
      attendance: [
        { date: '2025-10-01', status: 'EL' },
        { date: '2025-10-02', status: 'EL' },
        { date: '2025-10-03', status: 'CL' },
      ],
    })).toMatchObject({
      accruedLeaves: 36,
      leavesTaken: 2,
      availableLeaves: 34,
    });
  });
});
