import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    // Check if the request is from Vercel Cron or local
    const authHeader = request.headers.get('authorization');
    if (
      process.env.NODE_ENV === 'production' &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate the date exactly one year ago from today
    const oneYearAgoDate = new Date();
    oneYearAgoDate.setFullYear(oneYearAgoDate.getFullYear() - 1);

    // Format for String date comparisons (YYYY-MM-DD)
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const istDateString = new Intl.DateTimeFormat('en-CA', options).format(oneYearAgoDate); 
    const [yyyy, mm, dd] = istDateString.split('-');
    const oneYearAgoString = `${yyyy}-${mm}-${dd}`;

    console.log(`Starting data cleanup for records older than: ${oneYearAgoString}`);

    // Execute deletions in transaction or sequentially
    const deletedPunches = await prisma.punchRequest.deleteMany({
      where: { date: { lt: oneYearAgoString } }
    });

    const deletedLeaves = await prisma.leaveRequest.deleteMany({
      where: { startDate: { lt: oneYearAgoString } }
    });

    const deletedAttendance = await prisma.attendance.deleteMany({
      where: { date: { lt: oneYearAgoString } }
    });

    const deletedLocations = await prisma.locationRequest.deleteMany({
      where: { requestedAt: { lt: oneYearAgoDate } }
    });

    // Handle optional string field filtering
    const deletedTrips = await prisma.tripLog.deleteMany({
      where: { 
        date: { 
          not: null,
          lt: oneYearAgoString 
        } 
      }
    });

    const deletedOvertime = await prisma.overtimeAssignment.deleteMany({
      where: { date: { lt: oneYearAgoString } }
    });

    const result = {
      success: true,
      cutoffDate: oneYearAgoString,
      deleted: {
        punchRequests: deletedPunches.count,
        leaveRequests: deletedLeaves.count,
        attendanceRecords: deletedAttendance.count,
        locationRequests: deletedLocations.count,
        tripLogs: deletedTrips.count,
        overtimeAssignments: deletedOvertime.count,
      }
    };

    console.log("Cleanup completed:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Cleanup Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
