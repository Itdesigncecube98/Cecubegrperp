import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { amount, postJournal } from '@/lib/accounting';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['PENDING', 'APPROVED'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.payrollRecord.findUnique({ where: { id }, include: { employee: true, payCycle: true } });
      if (!record) throw new Error('Payroll record not found');
      const result = await tx.payrollRecord.update({ where: { id }, data: { status } });
      if (status === 'APPROVED') {
        await postJournal(tx, {
          voucherNo: `SALARY-${record.payCycleId}-${record.employeeId}`,
          type: 'Payment',
          narration: `Approved salary for ${record.employee.name} for ${record.payCycle.name}`,
          entries: [
            { ledger: record.employee.debitAccount || `Salary - ${record.payCycle.name} - ${record.employee.name}`, ledgerType: 'Expense', type: 'Dr', amount: amount(record.netPay) },
            { ledger: record.employee.creditAccount || 'Cash / Bank', ledgerType: 'Asset', type: 'Cr', amount: amount(record.netPay) }
          ]
        });
      }
      return result;
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (error) {
    console.error('Error updating payroll record status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
