import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const employees = await prisma.employee.findMany();
    const attendanceRecords = await prisma.attendance.findMany({
      where: { date }
    });

    // Merge employees with their attendance status for that date
    const result = employees.map(emp => {
      const record = attendanceRecords.find(a => a.employeeId === emp.id);
      return {
        employee: emp,
        status: record ? record.status : 'Not Marked',
        shiftType: record ? record.shiftType : 'Day',
        timeSlots: record ? record.timeSlots : '[]',
        date: date
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { employeeId, date, status, shiftType = 'Day', timeSlots } = await request.json();

    // Upsert attendance record
    const record = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date
        }
      },
      update: { status, shiftType, timeSlots },
      create: { employeeId, date, status, shiftType, timeSlots }
    });

    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
