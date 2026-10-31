import {
  calculateAvailableCasualLeave,
  calculateAvailableEarnedLeave,
  calculateCasualLeaveDaysTaken,
  calculateEarnedLeaveDaysTaken,
  getCasualLeaveAccrual,
  getEarnedLeaveAccrual,
} from '../earnedLeaveAccrual';

describe('getCasualLeaveAccrual', () => {
  test('accrues one CL per completed month and carries it forward', () => {
    expect(getCasualLeaveAccrual('2025-04-15', '2026-10')).toMatchObject({
      monthsSinceJoining: 18,
      accruedLeaves: 18,
    });
  });

  test('does not accrue the current month before the joining-date anniversary', () => {
    expect(getCasualLeaveAccrual('2026-10-15', '2026-10').accruedLeaves).toBe(0);
  });
});

describe('getEarnedLeaveAccrual', () => {
  test('starts monthly accrual after ten months of service', () => {
    expect(getEarnedLeaveAccrual('2025-01-15', '2025-11')).toMatchObject({
      monthsSinceJoining: 10,
      accruedLeaves: 1.5,
    });
  });

  test('accrues 1.5 days per month after eligibility and carries it across financial years', () => {
    expect(getEarnedLeaveAccrual('2025-01-15', '2026-04').accruedLeaves).toBe(9);
    expect(getEarnedLeaveAccrual('2025-01-15', '2026-11').accruedLeaves).toBe(19.5);
  });

  test('does not accrue before the ten-month service milestone', () => {
    expect(getEarnedLeaveAccrual('2025-01-15', '2025-10').accruedLeaves).toBe(0);
  });

  test('clamps a month-end joining date when calculating monthly accruals', () => {
    expect(getEarnedLeaveAccrual('2025-01-31', '2025-11').accruedLeaves).toBe(1.5);
  });

  test('matches September joining example: available from July, with 15 days by April', () => {
    expect(getEarnedLeaveAccrual('2026-09-15', '2027-06').accruedLeaves).toBe(0);
    expect(getEarnedLeaveAccrual('2026-09-15', '2027-07').accruedLeaves).toBe(1.5);
    expect(getEarnedLeaveAccrual('2026-09-15', '2028-04').accruedLeaves).toBe(15);
  });

  test('ignores a cancelled encashment when calculating carried leave', () => {
    expect(calculateAvailableEarnedLeave({
      joinedDate: '2025-01-15',
      asOnMonth: '2025-11',
      leaveRequests: [],
      encashments: [
        { asOnDate: '2025-11', encashedDays: 6, cancelledAt: '2025-11-10T00:00:00.000Z' },
      ],
    }).availableLeaves).toBe(1.5);
  });

  test('does not subtract encashed non-earned leave from the earned-leave balance', () => {
    expect(calculateAvailableEarnedLeave({
      joinedDate: '2025-01-15',
      asOnMonth: '2025-11',
      leaveRequests: [],
      encashments: [
        { leaveType: 'Casual Leave', asOnDate: '2025-11', encashedDays: 6 },
      ],
    }).availableLeaves).toBe(1.5);
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
      accruedLeaves: 18,
      leavesTaken: 1,
      leavesEncashed: 2,
      availableLeaves: 15,
    });
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
      accruedLeaves: 34.5,
      leavesTaken: 2,
      leavesEncashed: 5,
      availableLeaves: 27.5,
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
      accruedLeaves: 16.5,
      leavesTaken: 2,
      availableLeaves: 14.5,
    });
  });
});
