export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { amount, postJournal } from '@/lib/accounting';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const location = searchParams.get('location');
    const employeeId = searchParams.get('employeeId');
    const payCycleId = searchParams.get('payCycleId');
    const status = searchParams.get('status') || 'Unposted'; // 'All', 'Posted', 'Unposted'

    const where = {};
    if (payCycleId && payCycleId !== 'Select Here') where.payCycleId = payCycleId;
    if (employeeId && employeeId !== 'Select Here') where.employeeId = employeeId;
    
    if (department && department !== 'Select Here') {
      where.employee = { ...where.employee, department };
    }
    if (location && location !== 'Select Here') {
      where.employee = {
        ...where.employee,
        OR: [
          { siteOffice: location },
          { branch: location }
        ]
      };
    }

    if (status === 'Unposted') {
      where.status = 'APPROVED';
    } else if (status === 'Posted') {
      where.status = 'POSTED';
    } else if (status === 'All') {
      where.status = { in: ['APPROVED', 'POSTED'] };
    }

    const records = await prisma.payrollRecord.findMany({
      where,
      include: {
        employee: true,
        payCycle: true
      },
      orderBy: { employee: { name: 'asc' } }
    });

    // Fetch arrears from BonusIncentive
    const recordIds = records.map(r => r.id);
    const bonusIncentives = await prisma.bonusIncentive.findMany({
      where: {
        type: 'arrears',
        payCycleId: { in: records.map(r => r.payCycleId) },
        employeeId: { in: records.map(r => r.employeeId) }
      }
    });

    const formattedData = records.map(record => {
      const emp = record.employee;
      const payCycle = record.payCycle;
      
      const arrearsEntry = bonusIncentives.find(b => b.employeeId === record.employeeId && b.payCycleId === record.payCycleId);
      const arrears = arrearsEntry ? arrearsEntry.amount : 0;

      return {
        id: record.id,
        employeeId: emp.id,
        name: emp.name,
        payCycleName: payCycle.name,
        location: emp.siteOffice || emp.branch || 'Head office',
        creditAccount: emp.creditAccount || '',
        debitAccount: emp.debitAccount || '',
        netSalary: record.netPay.toFixed(2),
        arrears: arrears.toFixed(2),
        bonusIncentive: record.bonus.toFixed(2),
        tds: record.tds.toFixed(2),
        leaveEncashment: record.leaveEncashment.toFixed(2),
        status: record.status,
        budgetHead: 'Ops', 
        remark: ''
      };
    });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching post salary data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { updates, action } = body;
    
    if (!updates || !updates.length) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 });
    }

    // Expects updates: [{ id: payrollRecordId, creditAccount, debitAccount, budgetHead, remark }]
    if (action === 'POST') {
      await prisma.$transaction(async (tx) => {
        for (const update of updates) {
          const record = await tx.payrollRecord.findUnique({ where: { id: update.id }, include: { employee: true, payCycle: true } });
          if (!record) continue;
          if (record.status !== 'APPROVED') {
            throw new Error(`Salary record ${record.id} must be approved by HR/admin before posting to Accounts`);
          }
          await tx.payrollRecord.update({ where: { id: update.id }, data: { status: 'POSTED' } });
          await postJournal(tx, {
            voucherNo: `SALARY-${record.payCycleId}-${record.employeeId}`,
            type: 'Payment',
            narration: `Salary paid to ${record.employee.name} for ${record.payCycle.name}`,
            entries: [
              { ledger: update.debitAccount || `Salary - ${record.payCycle.name} - ${record.employee.name}`, ledgerType: 'Expense', type: 'Dr', amount: amount(record.netPay) },
              { ledger: update.creditAccount || 'Cash / Bank', ledgerType: 'Asset', type: 'Cr', amount: amount(record.netPay) }
            ]
          });
          if (update.employeeId && (update.creditAccount || update.debitAccount)) {
            await tx.employee.update({
              where: { id: update.employeeId },
              data: { ...(update.creditAccount ? { creditAccount: update.creditAccount } : {}), ...(update.debitAccount ? { debitAccount: update.debitAccount } : {}) }
            });
          }
        }
      });
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error posting salary:', error);
    return NextResponse.json({ error: 'Failed to post salary' }, { status: 500 });
  }
}
