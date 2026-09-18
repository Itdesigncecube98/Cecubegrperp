import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request) {
  try {
    const data = await request.json();
    const { updates, isApproved } = data; // updates = [{ employeeId, date, status, timeSlots, shiftType }]

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Updates must be an array' }, { status: 400 });
    }

    const results = [];
    
    // Process updates sequentially to avoid race conditions with leave refunds, etc.
    for (const update of updates) {
      const { employeeId, date, status, timeSlots, shiftType } = update;
      if (!employeeId || !date) continue;

      // Get existing record to check for status changes
      const existing = await prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId, date } }
      });

      // Upsert attendance record
      const record = await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId, date } },
        update: { 
          ...(status && { status }), 
          ...(shiftType && { shiftType }),
          ...(timeSlots && { timeSlots }),
          ...(typeof isApproved === 'boolean' && { isApproved })
        },
        create: { 
          employeeId, 
          date, 
          status: status || 'Present', 
          shiftType: shiftType || 'Day', 
          timeSlots: timeSlots || '[]',
          isApproved: typeof isApproved === 'boolean' ? isApproved : false
        }
      });

      results.push(record);

      // Leave refund logic
      const isNowPresent = status === 'Present';
      const wasAlreadyPresent = existing?.status === 'Present';

      if (isNowPresent && !wasAlreadyPresent) {
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
    }

    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
