import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { isEmployeeWeekoff } from '../../../../lib/attendanceCalendar';

/**
 * GET /api/attendance/dashboard-summary?days=10
 * One round-trip for admin dashboard: counts, today who-is-in, and daily trend.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get('days') || '10', 10) || 10, 31);

    const today = new Date();
    const todayParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(today);
    const todayPartMap = Object.fromEntries(todayParts.map(part => [part.type, part.value]));
    const todayStr = `${todayPartMap.year}-${todayPartMap.month}-${todayPartMap.day}`;

    const start = new Date(`${todayStr}T12:00:00Z`);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    const startStr = start.toISOString().slice(0, 10);

    const [employees, todayRecords, rangeRecords, gpsCount, holidays, allLeaves, workWeeks, announcements] = await Promise.all([
      prisma.employee.findMany({ select: { id: true } }).catch(() => []),
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
      }).catch(() => []),
      prisma.workWeek.findMany({ select: { day: true, isWorking: true } }),
      prisma.announcement.findMany({
        where: {
          date: { gte: startStr, lte: todayStr },
          OR: [{ isWorkingDay: true }, { isHoliday: true }],
        },
        select: { date: true, isWorkingDay: true, isHoliday: true },
      }),
    ]);
    const employeeCount = employees.length;
    const holidayDates = new Set(holidays.map(holiday => holiday.date));
    announcements.forEach(announcement => {
      if (announcement.isHoliday) holidayDates.add(announcement.date);
    });
    const workingAnnouncementDates = new Set(
      announcements.filter(announcement => announcement.isWorkingDay).map(announcement => announcement.date),
    );

    // --- Today's who-is-in ---
    // Only count truly worked statuses for "present today"
    const workedStatuses = ['Present', 'P', 'Half Day', 'Late', 'C-off', 'COFF', 'COff'];
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
      const d = new Date(`${todayStr}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const isWorkingAnnouncement = workingAnnouncementDates.has(dStr);
      const isHol = !isWorkingAnnouncement && holidayDates.has(dStr);
      const isWeekoff = isEmployeeWeekoff(dStr, workWeeks);
      const offEmployees = new Set(!isWorkingAnnouncement && !isHol && isWeekoff
        ? employees.map(employee => employee.id)
        : []);

      let note = '';
      if (isHol) note = 'Holiday';
      else if (offEmployees.size === employeeCount && employeeCount > 0) note = 'Off';

      const dayIndex = d.getUTCDay();
      const dateLabel = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')} (${dayNames[dayIndex]})` + (note ? `||${note}` : '');

      // Workers (physically punched in or marked Present/Late/Half Day)
      const workedSet = workedByDate[dStr] || new Set();
      const workedCount = workedSet.size;

      // Leave (merge attendance Leave + approved LeaveRequests)
      const leaveSet = leaveByDate[dStr] || new Set();
      const approvedLeavesOnDay = allLeaves.filter(l => l.startDate <= dStr && l.endDate >= dStr);
      approvedLeavesOnDay.forEach(l => leaveSet.add(l.employeeId));
      // Remove anyone who worked from leave count
      workedSet.forEach(empId => leaveSet.delete(empId));
      if (isHol) leaveSet.clear();
      else offEmployees.forEach(empId => leaveSet.delete(empId));
      const leaveCount = leaveSet.size;

      let present = 0, coff = 0, absent = 0, holiday = 0, off = 0;
      employees.forEach(employee => {
        const id = employee.id;
        if (workedSet.has(id)) {
          if (isHol || offEmployees.has(id)) coff++;
          else present++;
        } else if (isHol) holiday++;
        else if (offEmployees.has(id)) off++;
        else if (leaveSet.has(id)) {
          // leave already counted separately
        }
        else absent++;
      });

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

    const todayIsWorkingAnnouncement = workingAnnouncementDates.has(todayStr);
    const todayIsHol = !todayIsWorkingAnnouncement && holidayDates.has(todayStr);
    const leavesTodayList = allLeaves.filter(l => l.startDate <= todayStr && l.endDate >= todayStr);
    const leaveTodaySet = new Set(leavesTodayList.map(l => l.employeeId));
    const workedTodaySet = new Set(presentTodayRecords.map(record => record.employeeId));
    workedTodaySet.forEach(id => leaveTodaySet.delete(id));
    const isTodayWeekoff = isEmployeeWeekoff(todayStr, workWeeks);
    const offTodaySet = new Set(!todayIsWorkingAnnouncement && !todayIsHol && isTodayWeekoff
      ? employees.map(employee => employee.id)
      : []);
    if (todayIsHol) leaveTodaySet.clear();
    else offTodaySet.forEach(id => leaveTodaySet.delete(id));
    const employeesOnLeaveCount = leaveTodaySet.size;
    const todayOffCount = employees.filter(employee => offTodaySet.has(employee.id) && !workedTodaySet.has(employee.id)).length;
    const todayHolidayCount = todayIsHol ? Math.max(0, employeeCount - workedTodaySet.size) : 0;
    const todayCoffCount = presentTodayRecords.filter(record => todayIsHol || offTodaySet.has(record.employeeId)).length;

    let todayStatus = 'Working';
    if (todayIsHol) todayStatus = 'Holiday';
    else if (todayOffCount === employeeCount && employeeCount > 0) todayStatus = 'Off';

    const absentToday = todayIsHol ? 0 : Math.max(0, employeeCount - workedTodaySet.size - employeesOnLeaveCount - todayOffCount);

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
        { name: 'COFF', value: todayCoffCount, color: '#166534', bg: '#dcfce7', c: '#166534' },
        { name: 'NO PUNCH', value: absentToday, color: '#ef4444', bg: '#fee2e2', c: '#dc2626' },
        { name: 'OFF', value: todayOffCount, color: '#93c5fd', bg: '#eff6ff', c: '#2563eb' },
        { name: 'HOLIDAY', value: todayHolidayCount, color: '#fcd34d', bg: '#fef3c7', c: '#d97706' },
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
