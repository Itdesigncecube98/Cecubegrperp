import { getEarnedLeaveEligibilityDate } from './leaveEntitlements';
import {
  calculateAvailableCasualLeave,
  calculateAvailableEarnedLeave,
} from './earnedLeaveAccrual';
import { getLeaveCategory } from './leavePolicy';

export function calculateLeaveBalanceSnapshot({
  employee,
  asOnMonth,
  approvedRequests,
  attendance,
  encashments,
  savedBalance,
}) {
  const casual = calculateAvailableCasualLeave({
    joinedDate: employee.joinedDate,
    asOnMonth,
    leaveRequests: approvedRequests,
    encashments,
    attendance,
  });
  const earned = calculateAvailableEarnedLeave({
    joinedDate: employee.joinedDate,
    asOnMonth,
    leaveRequests: approvedRequests,
    encashments,
    attendance,
    openingBalance: savedBalance?.earnedLeaveOpeningBalance,
    openingBalanceAsOnDate: savedBalance?.earnedLeaveOpeningDate,
  });
  const monthPrefix = asOnMonth;
  const result = {
    employeeId: employee.id,
    casualLeaves: casual.availableLeaves,
    casualEntitlement: casual.accruedLeaves,
    earnedLeaves: earned.availableLeaves,
    earnedEntitlement: earned.accruedLeaves,
    earnedUsed: 0,
    leaveWithoutPay: 0,
    explicitLwp: 0,
    netDaysLwp: 0,
    compensatoryLeaves: Number(savedBalance?.compensatoryLeaves) || 0,
    joiningDateMissing: !getEarnedLeaveEligibilityDate(employee),
    earnedLeaveEligibleFrom: getEarnedLeaveEligibilityDate(employee),
  };

  for (const leave of approvedRequests) {
    const category = getLeaveCategory(leave.leaveType);
    const start = new Date(`${leave.startDate}T00:00:00.000Z`);
    const end = new Date(`${leave.endDate}T00:00:00.000Z`);
    for (let date = start; date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
      const dateKey = date.toISOString().slice(0, 10);
      if (!dateKey.startsWith(monthPrefix)) continue;
      const dayValue = leave.isHalfDay && dateKey === leave.startDate ? 0.5 : 1;
      if (category === 'EL') result.earnedUsed += dayValue;
      if (category === 'LWP' || category === 'SL') {
        result.leaveWithoutPay += dayValue;
        result.explicitLwp += dayValue;
        result.netDaysLwp += dayValue;
      }
    }
  }
  return result;
}
