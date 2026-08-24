import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json({ error: 'employee not found' }, { status: 404 });
    }

    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        // Last 6 months only — keeps employee dashboard fast
        date: { gte: (() => {
          const d = new Date();
          d.setMonth(d.getMonth() - 6);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        })() }
      }
    });

    // Holidays / work weeks only needed for absent injection in current month
    const [holidays, workWeeks] = await Promise.all([
      prisma.holiday.findMany(),
      prisma.workWeek.findMany()
    ]);
    // Convert to easy lookups
    const holidayDates = new Set(holidays.map(h => h.date));
    const nonWorkingDays = new Set(workWeeks.filter(w => !w.isWorking).map(w => w.day));

    // Group by month
    // Format: 'YYYY-MM-DD'
    const statsByMonth = {};

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    records.forEach(record => {
      const monthPrefix = record.date.substring(0, 7); // e.g., '2023-08'
      
      let effectiveStatus = record.status;
      const parsedSlots = record.timeSlots ? JSON.parse(record.timeSlots) : [];

      // If it's a past date and has incomplete/no time slots, and status is not already
      // Present (admin-marked), treat it as Absent so employee can regularize.
      // We do NOT override an admin-set Present status just because punch-out is missing.
      // Late is treated the same as Present — no downgrade.
      if (record.date < todayStr && effectiveStatus !== 'Present' && effectiveStatus !== 'Late') {
        if (parsedSlots.length === 0 || parsedSlots.some(slot => !slot.out || !slot.in)) {
          effectiveStatus = 'Absent';
        }
      }

      // Normalize Late → Present (Late status is no longer used)
      if (effectiveStatus === 'Late') effectiveStatus = 'Present';
      
      if (!statsByMonth[monthPrefix]) {
        statsByMonth[monthPrefix] = {
          month: monthPrefix,
          Present: 0,
          Absent: 0,
          details: []
        };
      }
      
      if (statsByMonth[monthPrefix][effectiveStatus] !== undefined) {
        statsByMonth[monthPrefix][effectiveStatus]++;
      }
      
      statsByMonth[monthPrefix].details.push({
        date: record.date,
        status: effectiveStatus,
        shiftType: record.shiftType || 'Day',
        timeSlots: record.timeSlots ? JSON.parse(record.timeSlots) : []
      });
    });

    // Inject missing days as Absent
    // From start of current month up to yesterday
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    for (let d = new Date(startOfMonth); d < today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const monthPrefix = dateStr.substring(0, 7);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });

      // If record exists, skip
      if (records.some(r => r.date === dateStr)) continue;
      
      // If it's a holiday or weekend, skip (or maybe show as 'Holiday'/'Week Off'?)
      if (holidayDates.has(dateStr)) continue;
      if (nonWorkingDays.has(dayName)) continue;

      if (!statsByMonth[monthPrefix]) {
        statsByMonth[monthPrefix] = { month: monthPrefix, Present: 0, Absent: 0, details: [] };
      }
      
      statsByMonth[monthPrefix].Absent++;
      statsByMonth[monthPrefix].details.push({
        date: dateStr,
        status: 'Absent',
        shiftType: 'Day',
        timeSlots: []
      });
    }

    // Convert to sorted array and sort details by date
    const result = Object.values(statsByMonth).sort((a, b) => b.month.localeCompare(a.month));
    result.forEach(month => {
        month.details.sort((a, b) => b.date.localeCompare(a.date));
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
