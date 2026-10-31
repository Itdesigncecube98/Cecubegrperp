import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculateAvailableEarnedLeave,
  getMonthEndDateString,
} from '@/lib/earnedLeaveAccrual';

export const dynamic = 'force-dynamic';

const LEAVE_BALANCE_FIELDS = {
  'Earned Leave': 'earnedLeaves',
  'Casual Leave': 'casualLeaves',
  'Leave Without Pay': 'leaveWithoutPay',
  'Compensatory Leave': 'compensatoryLeaves',
};

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const result = await prisma.$transaction(async tx => {
      const record = await tx.payrollRecord.findUnique({
        where: { id },
        include: { payCycle: true, employee: { select: { id: true, joinedDate: true } } },
      });
      if (!record) return { error: 'Payroll record not found.', status: 404 };
      if (record.status !== 'PENDING' || record.payCycle.status === 'COMPLETED') {
        return { error: 'Leave encashment cannot be cancelled after salary approval or posting.', status: 409 };
      }
      if (!(Number(record.leaveEncashment) > 0)) {
        return { error: 'This salary slip has no leave encashment to cancel.', status: 409 };
      }

      const encashments = await tx.leaveEncashment.findMany({
        where: {
          employeeId: record.employeeId,
          payCycleId: record.payCycleId,
          isProcessed: false,
          cancelledAt: null,
        },
        select: { id: true, leaveType: true, encashedDays: true },
      });

      const cancelledAt = new Date();
      if (encashments.length > 0) {
        await tx.leaveEncashment.updateMany({
          where: {
            id: { in: encashments.map(encashment => encashment.id) },
            isProcessed: false,
            cancelledAt: null,
          },
          data: { cancelledAt },
        });

        const leaveRequests = await tx.leaveRequest.findMany({
          where: { employeeId: record.employeeId, status: 'APPROVED' },
          select: { leaveType: true, startDate: true, endDate: true, isHalfDay: true },
        });
        const allEncashments = await tx.leaveEncashment.findMany({
          where: { employeeId: record.employeeId },
          select: { leaveType: true, asOnDate: true, encashedDays: true, cancelledAt: true },
        });
        const balanceMonth = new Date().toISOString().slice(0, 7);
        const attendance = await tx.attendance.findMany({
          where: {
            employeeId: record.employeeId,
            status: { in: ['EL'] },
            date: { lte: getMonthEndDateString(balanceMonth) },
          },
          select: { date: true, status: true },
        });
        const earnedLeaves = calculateAvailableEarnedLeave({
          joinedDate: record.employee.joinedDate,
          asOnMonth: balanceMonth,
          leaveRequests,
          encashments: allEncashments,
          attendance,
        }).availableLeaves;
        const earnedField = LEAVE_BALANCE_FIELDS['Earned Leave'];
        const nonEarnedRestoration = encashments.reduce((totals, encashment) => {
          if (encashment.leaveType === 'Earned Leave') return totals;
          const field = LEAVE_BALANCE_FIELDS[encashment.leaveType];
          if (field) totals[field] = (totals[field] || 0) + encashment.encashedDays;
          return totals;
        }, {});
        const currentBalance = await tx.leaveBalance.findUnique({ where: { employeeId: record.employeeId } });
        await tx.leaveBalance.upsert({
          where: { employeeId: record.employeeId },
          create: {
            employeeId: record.employeeId,
            [earnedField]: earnedLeaves,
            ...nonEarnedRestoration,
          },
          update: {
            [earnedField]: earnedLeaves,
            ...Object.fromEntries(Object.entries(nonEarnedRestoration).map(([field, days]) => [
              field,
              (Number(currentBalance?.[field]) || 0) + days,
            ])),
          },
        });
      }

      const amount = Math.round(Number(record.leaveEncashment) * 100) / 100;
      const update = await tx.payrollRecord.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          leaveEncashment: 0,
          grossPay: Math.round((Number(record.grossPay) - amount) * 100) / 100,
          netPay: Math.round((Number(record.netPay) - amount) * 100) / 100,
        },
      });
      if (update.count !== 1) {
        const error = new Error('Salary record changed while cancelling. Refresh and retry.');
        error.code = 'PAYROLL_RECORD_CONFLICT';
        throw error;
      }

      return {
        record: await tx.payrollRecord.findUnique({
          where: { id },
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                empId: true,
                department: true,
                branch: true,
                designation: true,
                grade: true,
                bankAccountNo: true,
                bankName: true,
                pan: true,
                pfEmployee: true,
                esicNo: true,
                uan: true,
                email: true,
                phone: true,
              },
            },
          },
        }),
        cancelledEncashments: encashments.length,
      };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error cancelling payroll leave encashment:', error);
    if (error.code === 'PAYROLL_RECORD_CONFLICT') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to cancel leave encashment.' }, { status: 500 });
  }
}
