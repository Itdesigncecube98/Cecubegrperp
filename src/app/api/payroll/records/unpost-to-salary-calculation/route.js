import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { amount, getSalaryVoucherAttempts, postJournal } from '@/lib/accounting';

function conflict(message) {
  const error = new Error(message);
  error.statusCode = 409;
  throw error;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const recordIds = [...new Set(
      Array.isArray(body.recordIds) ? body.recordIds.filter(id => typeof id === 'string' && id.length > 0) : []
    )];
    if (recordIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Select at least one approved, unposted salary record.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async tx => {
      const records = await tx.payrollRecord.findMany({
        where: { id: { in: recordIds } },
        include: { payCycle: true, employee: true },
      });
      if (records.length !== recordIds.length) conflict('One or more salary records were not found.');

      const payCycleIds = [...new Set(records.map(record => record.payCycleId))];
      if (payCycleIds.length !== 1) conflict('Unpost salary records from one pay cycle at a time.');

      const toUnpost = [];
      for (const record of records) {
        if (record.status !== 'APPROVED') {
          conflict(record.status === 'POSTED'
            ? 'Posted salary cannot be unposted to Salary Calculation.'
            : 'Only approved, unposted salary can be returned to Salary Calculation.');
        }
        if (record.payCycle.status === 'COMPLETED') {
          conflict(`Pay cycle ${record.payCycle.name} is completed and cannot be changed.`);
        }

        const attempts = await getSalaryVoucherAttempts(tx, record.payCycleId, record.employeeId, true);
        const journal = attempts.find(attempt => attempt.status !== 'Reversed');
        if (!journal) {
          conflict(`No active approval voucher was found for ${record.employee.name}. Salary was not changed.`);
        }
        if (!journal.details?.length) {
          conflict(`Approval voucher ${journal.voucherNo} has no entries and cannot be safely reversed.`);
        }
        toUnpost.push({ record, journal });
      }

      for (const { record, journal } of toUnpost) {
        const reversalVoucherNo = `SALARY-REVERSAL-${journal.voucherNo.replace(/^SALARY-/, '')}`;
        await postJournal(tx, {
          voucherNo: reversalVoucherNo,
          type: 'JV',
          narration: `Reversal of ${journal.voucherNo} because salary was unposted to Salary Calculation`,
          company: journal.company,
          branch: journal.branch,
          project: journal.project,
          entries: journal.details.map(detail => ({
            ledger: detail.ledger.name,
            ledgerType: detail.ledger.group.type,
            type: detail.type === 'Dr' ? 'Cr' : 'Dr',
            amount: amount(detail.amount),
          })),
        });
        await tx.accountsJournal.update({ where: { id: journal.id }, data: { status: 'Reversed' } });
        const updatedRecord = await tx.payrollRecord.updateMany({
          where: { id: record.id, status: 'APPROVED' },
          data: { status: 'PENDING' },
        });
        if (updatedRecord.count !== 1) {
          conflict(`Salary for ${record.employee.name} changed while unposting. Refresh and try again.`);
        }
      }

      return { payCycleId: payCycleIds[0], employeeIds: records.map(record => record.employeeId) };
    }, { timeout: 30000 });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error unposting salary to calculation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Could not unpost salary to Salary Calculation.' },
      { status: error.statusCode || 500 }
    );
  }
}
