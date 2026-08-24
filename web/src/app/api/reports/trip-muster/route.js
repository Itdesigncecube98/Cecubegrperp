import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    // Fetch all employees
    const employees = await prisma.employee.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        empId: true,
        name: true,
        branch: true,
        designation: true
      }
    });

    // Fetch all TripLogs in date range
    const trips = await prisma.tripLog.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Group trips by employeeId and date
    const tripMap = {};

    trips.forEach(trip => {
      const empId = trip.employeeId;
      const dateStr = trip.date;
      
      if (!tripMap[empId]) tripMap[empId] = {};
      if (!tripMap[empId][dateStr]) {
        tripMap[empId][dateStr] = {
          amount: 0,
          status: trip.status,
          tripCount: 0
        };
      }

      const dayData = tripMap[empId][dateStr];
      dayData.amount += (trip.amount || 0);
      dayData.tripCount += 1;
      
      const statusPriority = { 'PAID': 4, 'APPROVED': 3, 'ACTIVE': 2, 'REQUESTED': 1, 'REJECTED': 0 };
      const currentPriority = statusPriority[dayData.status] || -1;
      const newPriority = statusPriority[trip.status] || -1;
      
      if (newPriority > currentPriority) {
        dayData.status = trip.status;
      }
    });

    return NextResponse.json({ employees, tripMap });
  } catch (error) {
    console.error('Trip Muster API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
