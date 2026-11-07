export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { isEmployeeWeekoff } from '../../../../lib/attendanceCalendar';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const start = new Date(`${startDateStr}T12:00:00Z`);
    const end = new Date(`${endDateStr}T12:00:00Z`);

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 366) {
      return NextResponse.json({ error: 'Date range cannot exceed 366 days' }, { status: 400 });
    }

    const [employees, rangeRecords, holidays, leaves, workWeeks, weekoffTypes, announcements] = await Promise.all([
      prisma.employee.findMany({ select: { id: true, offDaysTemplates: true } }).catch(() => []),
      prisma.attendance.findMany({
        where: { date: { gte: startDateStr, lte: endDateStr } },
        select: { date: true, status: true, employeeId: true }
      }).catch(() => []),
      prisma.holiday.findMany({
        where: { date: { gte: startDateStr, lte: endDateStr } },
        select: { date: true }
      }).catch(() => []),
      prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: endDateStr },
          endDate: { gte: startDateStr }
        },
        select: { employeeId: true, startDate: true, endDate: true }
      }).catch(() => []),
      prisma.workWeek.findMany({ select: { day: true, isWorking: true } }),
      prisma.weekoffType.findMany({ select: { name: true, days: true, assignedTo: true } }).catch(() => []),
      prisma.announcement.findMany({
        where: {
          date: { gte: startDateStr, lte: endDateStr },
          OR: [{ isWorkingDay: true }, { isHoliday: true }],
        },
        select: { date: true, isWorkingDay: true, isHoliday: true },
      }),
    ]);
    const employeeCount = employees.length;

    // Group employees by Date and their Status
    const workedByDate = {}; // Set of employeeIds who worked
    const leaveByDate = {}; // Set of employeeIds on leave
    const lateByDate = {};
    const halfDayByDate = {};

    const workedStatuses = ['Present', 'P', 'Half Day', 'Late', 'C-off', 'COFF', 'COff'];
    const leaveStatuses = ['Leave', 'L'];
    rangeRecords.forEach(r => {
      const date = r.date;
      const status = r.status || '';
      
      if (!workedByDate[date]) workedByDate[date] = new Set();
      if (!leaveByDate[date]) leaveByDate[date] = new Set();
      if (!lateByDate[date]) lateByDate[date] = new Set();
      if (!halfDayByDate[date]) halfDayByDate[date] = new Set();

      if (workedStatuses.includes(status)) {
        workedByDate[date].add(r.employeeId);
        if (status === 'Late') lateByDate[date].add(r.employeeId);
        if (status === 'Half Day') halfDayByDate[date].add(r.employeeId);
      } else if (leaveStatuses.includes(status)) {
        leaveByDate[date].add(r.employeeId);
      }
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const holidayDates = new Set(holidays.map(holiday => holiday.date));
    announcements.forEach(announcement => {
      if (announcement.isHoliday) holidayDates.add(announcement.date);
    });
    const workingAnnouncementDates = new Set(
      announcements.filter(announcement => announcement.isWorkingDay).map(announcement => announcement.date),
    );
    const dailyTrend = [];
    
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dStr = d.toISOString().slice(0, 10);
      const isWorkingAnnouncement = workingAnnouncementDates.has(dStr);
      const isHol = !isWorkingAnnouncement && holidayDates.has(dStr);
      const offEmployees = new Set(!isWorkingAnnouncement && !isHol ? employees
        .filter(employee => isEmployeeWeekoff(employee, dStr, weekoffTypes, workWeeks))
        .map(employee => employee.id) : []);

      let note = '';
      if (isHol) note = 'Holiday';
      else if (offEmployees.size === employeeCount && employeeCount > 0) note = 'Off';
      
      const dateLabel = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')} (${dayNames[d.getUTCDay()]})` + (note ? `||${note}` : '');
      
      // Calculate employees who worked
      const workedSet = workedByDate[dStr] || new Set();
      const workedCount = workedSet.size;

      // Calculate employees on leave (Merge Attendance 'Leave' + LeaveRequest 'APPROVED')
      const leaveSet = leaveByDate[dStr] || new Set();
      const approvedLeavesOnDay = leaves.filter(l => l.startDate <= dStr && l.endDate >= dStr);
      approvedLeavesOnDay.forEach(l => leaveSet.add(l.employeeId));
      
      // Exclude anyone who actually worked from the leave count (just in case)
      workedSet.forEach(empId => leaveSet.delete(empId));
      if (isHol) leaveSet.clear();
      else offEmployees.forEach(empId => leaveSet.delete(empId));
      const leaveCount = leaveSet.size;

      // Calculate missing employees
      let present = 0, coff = 0, absent = 0, holiday = 0, off = 0;
      employees.forEach(employee => {
        const id = employee.id;
        if (workedSet.has(id)) {
          if (isHol || offEmployees.has(id)) coff++;
          else present++;
        } else if (isHol) holiday++;
        else if (offEmployees.has(id)) off++;
        else if (leaveSet.has(id)) {
          // Leave has its own series.
        }
        else absent++;
      });

      // Calculate Late and Half Day subset counts
      const lateCount = (lateByDate[dStr] || new Set()).size;
      const halfDayCount = (halfDayByDate[dStr] || new Set()).size;

      dailyTrend.push({
        date: dateLabel,
        fullDate: dStr,
        all: employeeCount,
        Present: present,
        COff: coff,
        Absent: absent,
        Leave: leaveCount,
        Holiday: holiday,
        Off: off,
        Late: lateCount,
        HalfDay: halfDayCount
      });
    }

    return NextResponse.json(dailyTrend);
  } catch (error) {
    console.error('Failed to fetch daily trend', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
