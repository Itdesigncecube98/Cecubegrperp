import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { recordId } = await params;
    if (!recordId) {
      return NextResponse.json({ error: 'Posted salary record ID is required.' }, { status: 400 });
    }

    const record = await prisma.payrollRecord.findFirst({
      where: { id: recordId, status: 'POSTED' },
      select: {
        employee: { select: { id: true, name: true, empId: true } },
        payCycle: { select: { id: true, name: true, startDate: true, endDate: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Posted salary record was not found.' }, { status: 404 });
    }

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId: record.employee.id,
        date: { gte: record.payCycle.startDate, lte: record.payCycle.endDate },
      },
      select: { date: true, status: true },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({
      data: {
        employee: record.employee,
        payCycle: record.payCycle,
        attendance,
      },
    });
  } catch (error) {
    console.error('Error fetching posted salary attendance:', error);
    return NextResponse.json({ error: 'Could not load posted salary attendance.' }, { status: 500 });
  }
}
