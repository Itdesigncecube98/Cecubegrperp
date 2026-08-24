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

    // Auto-punch out logic for 19:00
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', { 
      timeZone: 'Asia/Kolkata', 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', hour12: false 
    }).formatToParts(now);
    const p = {};
    parts.forEach(part => p[part.type] = part.value);
    const currentDateStr = `${p.year}-${p.month}-${p.day}`;
    // handle 24:00 which sometimes Intl returns for midnight
    let currentHour = parseInt(p.hour, 10);
    if (currentHour === 24) currentHour = 0;

    for (let record of attendanceRecords) {
      if (record.timeSlots) {
        try {
          let slots = JSON.parse(record.timeSlots);
          let updated = false;
          slots.forEach(slot => {
            if (slot.in && !slot.out) {
              // If past date OR today and past 19:00
              if (record.date < currentDateStr || (record.date === currentDateStr && currentHour >= 19)) {
                slot.out = '19:00';
                updated = true;
              }
            }
          });
          if (updated) {
            record.timeSlots = JSON.stringify(slots);
            // Fire and forget update to persist the auto punch-out
            prisma.attendance.update({
              where: { id: record.id },
              data: { timeSlots: record.timeSlots }
            }).catch(console.error);
          }
        } catch (e) {}
      }
    }

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
