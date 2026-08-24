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

    const [employeeCount, todayRecords, rangeRecords, gpsCount, holidays, todayLeaves] = await Promise.all([
      prisma.employee.count().catch(() => 0),
      prisma.attendance.findMany({
        where: { date: todayStr },
        select: { employeeId: true, status: true, timeSlots: true }
      }).catch(() => []),
      prisma.attendance.findMany({
        where: { date: { gte: startStr, lte: todayStr } },
        select: { date: true, status: true }
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

    const presentToday = todayRecords.filter(a => a.status && a.status !== 'Not Marked').length;
    let inCount = 0;
    let outCount = 0;
    todayRecords.forEach(a => {
      if (!a.status || a.status === 'Not Marked') return;
      let slots = [];
      try { slots = JSON.parse(a.timeSlots || '[]'); } catch (e) { slots = []; }
      const last = slots[slots.length - 1];
      if (last && last.in && !last.out) inCount++;
      else outCount++;
    });

    const presentStatusCount = todayRecords.filter(
      a => a.status === 'Present' || a.status === 'PRESENT' || a.status === 'Late'
    ).length;

    // Daily present counts for trend
    const byDate = {};
    rangeRecords.forEach(r => {
      if (!r.status || r.status === 'Not Marked') return;
      byDate[r.date] = (byDate[r.date] || 0) + 1;
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyTrend = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isSun = d.getDay() === 0;
      const isHol = holidays.some(h => h.date === dStr);
      
      let note = '';
      if (isHol) note = 'Holiday';
      else if (isSun) note = 'Off';
      
      const dateLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} (${dayNames[d.getDay()]})` + (note ? `||${note}` : '');
      const leavesOnDay = todayLeaves.filter(l => l.startDate <= dStr && l.endDate >= dStr);
      const uniqueLeavesOnDay = new Set(leavesOnDay.map(l => l.employeeId)).size;
      
      const dayPresent = byDate[dStr] || 0;
      const isOffDay = isHol || isSun;
      const nonPresent = Math.max(0, employeeCount - dayPresent - uniqueLeavesOnDay);
      
      dailyTrend.push({
        date: dateLabel,
        fullDate: dStr,
        Present: isOffDay ? 0 : dayPresent,
        COff: isOffDay ? dayPresent : 0,
        Absent: isOffDay ? 0 : nonPresent,
        Leave: uniqueLeavesOnDay,
        Holiday: isHol ? nonPresent : 0,
        Off: (isSun && !isHol) ? nonPresent : 0
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
    
    // Calculate employees on leave today
    const leavesToday = todayLeaves.filter(l => l.startDate <= todayStr && l.endDate >= todayStr);
    const employeesOnLeaveCount = new Set(leavesToday.map(l => l.employeeId)).size;
    
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
        { name: 'NO PUNCH', value: (todayIsHol || todayIsSun) ? 0 : Math.max(0, employeeCount - presentToday - employeesOnLeaveCount), color: '#ef4444', bg: '#fee2e2', c: '#dc2626' },
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
