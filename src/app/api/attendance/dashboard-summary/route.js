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

    const [employeeCount, todayRecords, rangeRecords, gpsCount] = await Promise.all([
      prisma.employee.count().catch(() => 0),
      prisma.attendance.findMany({
        where: { date: todayStr },
        select: { employeeId: true, status: true, timeSlots: true }
      }).catch(() => []),
      prisma.attendance.findMany({
        where: { date: { gte: startStr, lte: todayStr } },
        select: { date: true, status: true }
      }).catch(() => []),
      prisma.gpsLocation.count({ where: { isActive: true } }).catch(() => 0)
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

    const dailyTrend = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dateLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const dayPresent = byDate[dStr] || 0;
      dailyTrend.push({
        date: dateLabel,
        fullDate: dStr,
        Present: dayPresent,
        Absent: Math.max(0, employeeCount - dayPresent)
      });
    }

    return NextResponse.json({
      totalEmployees: employeeCount,
      presentToday,
      gpsLocations: gpsCount,
      whoIsIn: [
        { name: 'IN', value: inCount, color: '#22c55e' },
        { name: 'OUT', value: outCount, color: '#3b82f6' },
        { name: 'NO PUNCH', value: Math.max(0, employeeCount - presentToday), color: '#ef4444' },
        { name: 'ON LEAVE', value: 0, color: '#10b981' }
      ],
      statusDistribution: [
        { name: 'Present', value: presentStatusCount, color: '#bbf7d0' },
        { name: 'Absent', value: Math.max(0, employeeCount - presentStatusCount), color: '#fca5a5' }
      ],
      dailyTrend
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
