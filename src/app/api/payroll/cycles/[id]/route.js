import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { amount, postJournal } from '../../../../../lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    const cycle = await prisma.payCycle.findUnique({
      where: { id },
      include: {
        bonusIncentives: true,
        payrollRecords: {
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
              }
            }
          },
          orderBy: { employee: { name: 'asc' } }
        }
      }
    });

    if (!cycle) {
      return NextResponse.json({ error: 'Pay cycle not found' }, { status: 404 });
    }

    const [holidays, attendances, approvedLeaves] = await Promise.all([
      prisma.holiday.findMany({
        where: { date: { gte: cycle.startDate, lte: cycle.endDate } }
      }),
      prisma.attendance.findMany({
        where: { date: { gte: cycle.startDate, lte: cycle.endDate } }
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: cycle.endDate },
          endDate: { gte: cycle.startDate }
        }
      })
    ]);

    // Calculate dates in cycle for Sunday check
    const start = new Date(cycle.startDate);
    const end = new Date(cycle.endDate);
    let sundaysCount = 0;
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() === 0) sundaysCount++;
      cur.setDate(cur.getDate() + 1);
    }

    // Attach attendanceSummary to each record
    const enhancedRecords = cycle.payrollRecords.map(rec => {
      const empAtts = attendances.filter(a => a.employeeId === rec.employeeId);
      const empLeaves = approvedLeaves.filter(l => l.employeeId === rec.employeeId);
      const empBonusIncentives = (cycle.bonusIncentives || []).filter(b => b.employeeId === rec.employeeId);

      const savedWOff = empBonusIncentives.find(b => b.type === 'woff')?.amount;
      const savedHolidays = empBonusIncentives.find(b => b.type === 'holiday')?.amount;
      const savedNightShift = empBonusIncentives.find(b => b.type === 'night_shift')?.amount;
      const savedCoff = empBonusIncentives.find(b => b.type === 'coff')?.amount;

      const wOffAttCount = empAtts.filter(a => a.status === 'W-off' || a.status === 'W').length;
      const wOff = savedWOff !== undefined ? savedWOff : (wOffAttCount > 0 ? wOffAttCount : sundaysCount);

      const hAttCount = empAtts.filter(a => a.status === 'H' || a.status === 'Holiday').length;
      const hCount = savedHolidays !== undefined ? savedHolidays : (hAttCount > 0 ? hAttCount : holidays.length);

      const nightShiftCount = savedNightShift !== undefined ? savedNightShift : empAtts.filter(a => a.shiftType === 'Night').length;

      const coffAttCount = empAtts.filter(a => a.status === 'C-off' || a.status === 'COFF').length;
      const coffLeaveCount = empLeaves.filter(l => (l.leaveType || '').toUpperCase().includes('COFF')).length;
      const coff = savedCoff !== undefined ? savedCoff : (coffAttCount + coffLeaveCount);

      const paidLeaves = empAtts.filter(a => ['CL', 'EL', 'SL'].includes(a.status)).length || empLeaves.length;

      return {
        ...rec,
        attendanceSummary: {
          wOff,
          holidays: hCount,
          nightShift: nightShiftCount,
          coff,
          paidLeaves
        }
      };
    });

    return NextResponse.json({
      ...cycle,
      payrollRecords: enhancedRecords
    });
  } catch (error) {
    console.error('Error fetching pay cycle:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();

    const updatedCycle = await prisma.payCycle.update({
      where: { id },
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        paymentDate: data.paymentDate,
        selectedEmployees: data.selectedEmployees,
        status: data.status,
      }
    });

    return NextResponse.json(updatedCycle);
  } catch (error) {
    console.error('Error updating pay cycle:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const cycle = await prisma.payCycle.findUnique({
      where: { id },
      include: { payrollRecords: true }
    });
    if (!cycle) {
      return NextResponse.json({ error: 'Pay cycle not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async tx => {
      const records = await tx.payrollRecord.findMany({ where: { payCycleId: id } });
      const journalsToReverse = [];

      for (const record of records) {
        const journal = await tx.accountsJournal.findUnique({
          where: { voucherNo: `SALARY-${record.payCycleId}-${record.employeeId}` },
          include: { details: { include: { ledger: { include: { group: true } } } } }
        });
        if (journal) {
          if (journal.status === 'Reversed') continue;
          if (!journal.details.length) {
            throw new Error(`Salary voucher ${journal.voucherNo} has no entries, so the cycle cannot be safely deleted.`);
          }
          journalsToReverse.push(journal);
        } else if (['APPROVED', 'POSTED'].includes(String(record.status).toUpperCase())) {
          throw new Error(`Posted salary record for employee ${record.employeeId} has no accounting voucher. The cycle was not deleted.`);
        }
      }

      for (const journal of journalsToReverse) {
        const reverseVoucherNo = `SALARY-REVERSAL-${journal.voucherNo.replace(/^SALARY-/, '')}`;
        const existingReversal = await tx.accountsJournal.findUnique({ where: { voucherNo: reverseVoucherNo } });
        if (!existingReversal) {
          await postJournal(tx, {
            voucherNo: reverseVoucherNo,
            type: 'JV',
            narration: `Reversal of ${journal.voucherNo} because payroll cycle ${cycle.name} was deleted`,
            company: journal.company,
            branch: journal.branch,
            project: journal.project,
            entries: journal.details.map(detail => ({
              ledger: detail.ledger.name,
              ledgerType: detail.ledger.group.type,
              type: detail.type === 'Dr' ? 'Cr' : 'Dr',
              amount: amount(detail.amount)
            }))
          });
        }
        if (journal.status !== 'Reversed') {
          await tx.accountsJournal.update({ where: { id: journal.id }, data: { status: 'Reversed' } });
        }
      }

      await tx.leaveEncashment.updateMany({
        where: { payCycleId: id, isProcessed: true },
        data: { isProcessed: false },
      });
      await tx.payCycle.delete({ where: { id } });
      return { reversedVouchers: journalsToReverse.length, deletedPayrollRecords: records.length };
    }, { timeout: 30000 });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error deleting pay cycle:', error);
    const isSafeBlock = /no entries|no accounting voucher/i.test(error.message || '');
    return NextResponse.json({ error: error.message }, { status: isSafeBlock ? 409 : 500 });
  }
}
