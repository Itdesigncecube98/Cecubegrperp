import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    const records = await prisma.attendance.findMany({
      where: { employeeId }
    });

    // Group by month
    // Format: 'YYYY-MM-DD'
    const statsByMonth = {};

    records.forEach(record => {
      const monthPrefix = record.date.substring(0, 7); // e.g., '2023-08'
      
      if (!statsByMonth[monthPrefix]) {
        statsByMonth[monthPrefix] = {
          month: monthPrefix,
          Present: 0,
          Absent: 0,
          Late: 0,
          details: []
        };
      }
      
      if (statsByMonth[monthPrefix][record.status] !== undefined) {
        statsByMonth[monthPrefix][record.status]++;
      }
      
      statsByMonth[monthPrefix].details.push({
        date: record.date,
        status: record.status,
        shiftType: record.shiftType || 'Day',
        timeSlots: record.timeSlots ? JSON.parse(record.timeSlots) : []
      });
    });

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
