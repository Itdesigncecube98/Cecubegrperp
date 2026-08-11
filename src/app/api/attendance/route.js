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

    return NextResponse.json(Array.isArray(result) ? result : []);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const { employeeId, date, status, shiftType = 'Day', timeSlots } = await request.json();

    // Get the existing record before upserting (to detect status change)
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date } }
    });

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

    // Leave refund logic:
    // If this date is being marked Present and was NOT already Present,
    // check if there's an approved leave covering this date and refund 1 day.
    const isNowPresent = status === 'Present';
    const wasAlreadyPresent = existing?.status === 'Present';

    if (isNowPresent && !wasAlreadyPresent) {
      // Find any APPROVED leave for this employee that covers this date
      const overlappingLeave = await prisma.leaveRequest.findFirst({
        where: {
          employeeId,
          status: 'APPROVED',
          startDate: { lte: date },
          endDate: { gte: date }
        }
      });

      if (overlappingLeave) {
        const balance = await prisma.leaveBalance.findUnique({
          where: { employeeId }
        });

        if (balance) {
          const refundDays = overlappingLeave.isHalfDay ? 0.5 : 1;
          let balanceUpdateData = {};
          const { leaveType } = overlappingLeave;

          if (leaveType === 'Casual') {
            balanceUpdateData.casualLeaves = balance.casualLeaves + refundDays;
          } else if (leaveType === 'Earned' || leaveType === 'Paid leave') {
            balanceUpdateData.earnedLeaves = balance.earnedLeaves + refundDays;
          } else if (leaveType === 'Leave Without Pay' || leaveType === 'Sick' || leaveType === 'Unpaid') {
            balanceUpdateData.leaveWithoutPay = Math.max(0, balance.leaveWithoutPay - refundDays);
          } else if (leaveType === 'COFF') {
            balanceUpdateData.compensatoryLeaves = balance.compensatoryLeaves + refundDays;
          }

          if (Object.keys(balanceUpdateData).length > 0) {
            await prisma.leaveBalance.update({
              where: { employeeId },
              data: balanceUpdateData
            });
          }
        }
      }
    }

    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
