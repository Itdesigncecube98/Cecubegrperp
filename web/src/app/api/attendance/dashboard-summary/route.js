import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

/**
 * GET /api/attendance/dashboard-summary?days=10
 * One round-trip for admin dashboard: counts, today who-is-in, and daily trend.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get('days') || '10', 10) || 10, 31);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

    const [employeeCount, todayRecords, rangeRecords, gpsCount, holidays, allLeaves] = await Promise.all([
      prisma.employee.count().catch(() => 0),
      prisma.attendance.findMany({
        where: { date: todayStr },
        select: { employeeId: true, status: true, timeSlots: true }
      }).catch(() => []),
      prisma.attendance.findMany({
        where: { date: { gte: startStr, lte: todayStr } },
        select: { date: true, status: true, employeeId: true }
      }).catch(() => []),
      prisma.gpsLocation.count({ where: { isActive: true } }).catch(() => 0),
      prisma.holiday.findMany({
        where: { date: { gte: startStr, lte: todayStr } },
        select: { date: true }
      }).catch(() => []),
      prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: todayStr },
          endDate: { gte: startStr }
        },
        select: { employeeId: true, startDate: true, endDate: true }
      }).catch(() => [])
    ]);

    // --- Today's who-is-in ---
    // Only count truly worked statuses for "present today"
    const workedStatuses = ['Present', 'P', 'Half Day', 'Late'];
    const presentTodayRecords = todayRecords.filter(a => workedStatuses.includes(a.status));
    const presentToday = presentTodayRecords.length;

    let inCount = 0;
    let outCount = 0;
    presentTodayRecords.forEach(a => {
      let slots = [];
      try { slots = JSON.parse(a.timeSlots || '[]'); } catch (e) { slots = []; }
      const last = slots[slots.length - 1];
      if (last && last.in && !last.out) inCount++;
      else outCount++;
    });

    // --- Daily Trend for chart (same logic as /api/attendance/daily-trend) ---
    // Group employees by Date and Status - only truly worked employees count
    const workedByDate = {};
    const leaveByDate = {};

    rangeRecords.forEach(r => {
      const date = r.date;
      const status = r.status || '';

      if (!workedByDate[date]) workedByDate[date] = new Set();
      if (!leaveByDate[date]) leaveByDate[date] = new Set();

      if (workedStatuses.includes(status)) {
        workedByDate[date].add(r.employeeId);
      } else if (['Leave', 'L'].includes(status)) {
        leaveByDate[date].add(r.employeeId);
      }
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyTrend = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isSun = d.getDay() === 0;
      const isHol = holidays.some(h => h.date === dStr);
      const isOffDay = isHol || isSun;

      let note = '';
      if (isHol) note = 'Holiday';
      else if (isSun) note = 'Off';

      const dateLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} (${dayNames[d.getDay()]})` + (note ? `||${note}` : '');

      // Workers (physically punched in or marked Present/Late/Half Day)
      const workedSet = workedByDate[dStr] || new Set();
      const workedCount = workedSet.size;

      // Leave (merge attendance Leave + approved LeaveRequests)
      const leaveSet = leaveByDate[dStr] || new Set();
      const approvedLeavesOnDay = allLeaves.filter(l => l.startDate <= dStr && l.endDate >= dStr);
      approvedLeavesOnDay.forEach(l => leaveSet.add(l.employeeId));
      // Remove anyone who worked from leave count
      workedSet.forEach(empId => leaveSet.delete(empId));
      const leaveCount = leaveSet.size;

      const remainingCount = Math.max(0, employeeCount - workedCount - leaveCount);

      let present = 0, coff = 0, absent = 0, holiday = 0, off = 0;
      if (isOffDay) {
        coff = workedCount;
        if (isHol) holiday = remainingCount;
        else off = remainingCount;
      } else {
        present = workedCount;
        absent = remainingCount;
      }

      dailyTrend.push({
        date: dateLabel,
        fullDate: dStr,
        all: employeeCount,
        Present: present,
        COff: coff,
        Absent: absent,
        Leave: leaveCount,
        Holiday: holiday,
        Off: off
      });
    }

    const distPresent = dailyTrend.reduce((sum, day) => sum + day.Present, 0);
    const distCOff = dailyTrend.reduce((sum, day) => sum + day.COff, 0);
    const distAbsent = dailyTrend.reduce((sum, day) => sum + day.Absent, 0);
    const distHoliday = dailyTrend.reduce((sum, day) => sum + day.Holiday, 0);
    const distOff = dailyTrend.reduce((sum, day) => sum + day.Off, 0);
    const distLeave = dailyTrend.reduce((sum, day) => sum + day.Leave, 0);

    const todayIsSun = today.getDay() === 0;
    const todayIsHol = holidays.some(h => h.date === todayStr);

    const leavesTodayList = allLeaves.filter(l => l.startDate <= todayStr && l.endDate >= todayStr);
    const employeesOnLeaveCount = new Set(leavesTodayList.map(l => l.employeeId)).size;

    let todayStatus = 'Working';
    if (todayIsHol) todayStatus = 'Holiday';
    else if (todayIsSun) todayStatus = 'Off';

    const absentToday = (todayIsHol || todayIsSun) ? 0 : Math.max(0, employeeCount - presentToday - employeesOnLeaveCount);

    return NextResponse.json({
      totalEmployees: employeeCount,
      presentToday,
      todayStatus,
      absentToday,
      leavesToday: employeesOnLeaveCount,
      gpsLocations: gpsCount,
      whoIsIn: [
        { name: 'IN', value: inCount, color: '#22c55e', bg: '#dcfce7', c: '#15803d' },
        { name: 'OUT', value: outCount, color: '#3b82f6', bg: '#dbeafe', c: '#1d4ed8' },
        { name: 'COFF', value: (todayIsHol || todayIsSun) ? presentToday : 0, color: '#166534', bg: '#dcfce7', c: '#166534' },
        { name: 'NO PUNCH', value: (todayIsHol || todayIsSun) ? 0 : absentToday, color: '#ef4444', bg: '#fee2e2', c: '#dc2626' },
        { name: 'OFF', value: (todayIsSun && !todayIsHol) ? Math.max(0, employeeCount - presentToday - employeesOnLeaveCount) : 0, color: '#93c5fd', bg: '#eff6ff', c: '#2563eb' },
        { name: 'HOLIDAY', value: todayIsHol ? Math.max(0, employeeCount - presentToday - employeesOnLeaveCount) : 0, color: '#fcd34d', bg: '#fef3c7', c: '#d97706' },
        { name: 'ON LEAVE', value: employeesOnLeaveCount, color: '#10b981', bg: '#ecfdf5', c: '#047857' }
      ],
      statusDistribution: [
        { name: 'Present', value: distPresent, color: '#bbf7d0' },
        { name: 'COff', value: distCOff, color: '#166534' },
        { name: 'Absent', value: distAbsent, color: '#fca5a5' },
        { name: 'Holiday', value: distHoliday, color: '#fcd34d' },
        { name: 'Off', value: distOff, color: '#93c5fd' },
        { name: 'Leave', value: distLeave, color: '#10b981' }
      ],
      dailyTrend
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
