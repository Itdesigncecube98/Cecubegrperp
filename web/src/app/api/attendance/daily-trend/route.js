export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 366) {
      return NextResponse.json({ error: 'Date range cannot exceed 366 days' }, { status: 400 });
    }

    const [employeeCount, rangeRecords, holidays, leaves] = await Promise.all([
      prisma.employee.count().catch(() => 0),
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
      }).catch(() => [])
    ]);

    // Group employees by Date and their Status
    const workedByDate = {}; // Set of employeeIds who worked
    const leaveByDate = {}; // Set of employeeIds on leave
    const lateByDate = {};
    const halfDayByDate = {};

    rangeRecords.forEach(r => {
      const date = r.date;
      const status = r.status || '';
      
      if (!workedByDate[date]) workedByDate[date] = new Set();
      if (!leaveByDate[date]) leaveByDate[date] = new Set();
      if (!lateByDate[date]) lateByDate[date] = new Set();
      if (!halfDayByDate[date]) halfDayByDate[date] = new Set();

      const workedStatuses = ['Present', 'P', 'Half Day', 'Late'];
      const leaveStatuses = ['Leave', 'L'];

      if (workedStatuses.includes(status)) {
        workedByDate[date].add(r.employeeId);
        if (status === 'Late') lateByDate[date].add(r.employeeId);
        if (status === 'Half Day') halfDayByDate[date].add(r.employeeId);
      } else if (leaveStatuses.includes(status)) {
        leaveByDate[date].add(r.employeeId);
      }
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyTrend = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isSun = d.getDay() === 0;
      const isHol = holidays.some(h => h.date === dStr);
      const isOffDay = isHol || isSun;
      
      let note = '';
      if (isHol) note = 'Holiday';
      else if (isSun) note = 'Off';
      
      const dateLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} (${dayNames[d.getDay()]})` + (note ? `||${note}` : '');
      
      // Calculate employees who worked
      const workedSet = workedByDate[dStr] || new Set();
      const workedCount = workedSet.size;

      // Calculate employees on leave (Merge Attendance 'Leave' + LeaveRequest 'APPROVED')
      const leaveSet = leaveByDate[dStr] || new Set();
      const approvedLeavesOnDay = leaves.filter(l => l.startDate <= dStr && l.endDate >= dStr);
      approvedLeavesOnDay.forEach(l => leaveSet.add(l.employeeId));
      
      // Exclude anyone who actually worked from the leave count (just in case)
      workedSet.forEach(empId => leaveSet.delete(empId));
      const leaveCount = leaveSet.size;

      // Calculate missing employees
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
