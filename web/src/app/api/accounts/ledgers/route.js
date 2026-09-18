export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { amount, getLedger, postJournal } from '@/lib/accounting';

const groupTypes = { Assets: 'Asset', Liabilities: 'Liability', Expense: 'Expense', Expenses: 'Expense', Income: 'Income', Capital: 'Capital' };

function ledgerSection(name) {
  if (/salary/i.test(name)) return 'Salary';
  if (/opening balance/i.test(name)) return 'Opening Balance';
  if (/imprest/i.test(name)) return 'Imprest';
  if (/vehicle|conveyance|taxi|transport|freight/i.test(name)) return 'Vehicle Expenses';
  return 'Opening Balance';
}

export async function GET(request) {
  try {
    try {
    const approvedSalaries = await prisma.payrollRecord.findMany({
        where: { status: 'APPROVED' },
        include: { employee: true, payCycle: true }
      });
    for (const record of approvedSalaries) {
      await prisma.$transaction(async (tx) => {
        const journal = await tx.accountsJournal.findUnique({ where: { voucherNo: `SALARY-${record.payCycleId}-${record.employeeId}` }, include: { details: true } });
        const salaryLedger = await getLedger(tx, `Salary - ${record.payCycle.name} - ${record.employee.name}`, 'Expense');
        if (journal) {
          const debit = journal.details.find(detail => detail.type === 'Dr');
          if (debit) await tx.accountsJournalDetail.update({ where: { id: debit.id }, data: { ledgerId: salaryLedger.id } });
        }
        await postJournal(tx, {
          voucherNo: `SALARY-${record.payCycleId}-${record.employeeId}`,
          type: 'Payment',
          narration: `Approved salary for ${record.employee.name} for ${record.payCycle.name}`,
          entries: [
            { ledger: record.employee.debitAccount || `Salary - ${record.payCycle.name} - ${record.employee.name}`, ledgerType: 'Expense', type: 'Dr', amount: amount(record.netPay) },
            { ledger: record.employee.creditAccount || 'Cash / Bank', ledgerType: 'Asset', type: 'Cr', amount: amount(record.netPay) }
          ]
        });
      }, { timeout: 30000 });
    }

    const approvedImprests = await prisma.imprestRequest.findMany({
        where: { status: { in: ['APPROVED', 'ISSUED'] } },
        include: { employee: true, expenses: true }
      });
    for (const request of approvedImprests) {
        const approvedAmount = amount(request.approvedAmount || request.amountRequested);
        if (approvedAmount > 0) {
          await prisma.$transaction(async (tx) => {
            await postJournal(tx, {
              voucherNo: `IMPREST-APPROVAL-${request.id}`,
              type: 'JV',
              narration: `Approved imprest advance for ${request.employee.name}`,
              project: request.projectSite,
              entries: [
                { ledger: `Imprest Advance - ${request.employee.name}`, ledgerType: 'Asset', type: 'Dr', amount: approvedAmount },
                { ledger: `Imprest Payable - ${request.employee.name}`, ledgerType: 'Liability', type: 'Cr', amount: approvedAmount }
              ]
            });
          }, { timeout: 30000 });
        }
      const total = amount(request.expenses.reduce((sum, expense) => sum + expense.billAmount, 0));
      if (total > 0) {
        await prisma.$transaction(async (tx) => {
          await postJournal(tx, {
            voucherNo: `IMPREST-EXPENSE-${request.id}`,
            type: 'Purchase',
            narration: `Approved vehicle expense for ${request.employee.name}`,
            project: request.projectSite,
            entries: [
              { ledger: request.expenses[0]?.category || 'Vehicle Expenses', ledgerType: 'Expense', type: 'Dr', amount: total },
              { ledger: `Imprest Payable - ${request.employee.name}`, ledgerType: 'Liability', type: 'Cr', amount: total }
            ]
          });
        }, { timeout: 30000 });
      }
    }

    const approvedTrips = await prisma.tripLog.findMany({
      where: { status: { in: ['APPROVED', 'PAID'] } },
      include: { employee: true, vehicle: true }
    });
    for (const trip of approvedTrips) {
      const tripAmount = amount(trip.amount);
      if (tripAmount > 0) {
        await prisma.$transaction(async (tx) => {
          await postJournal(tx, {
            voucherNo: `VEHICLE-TRIP-${trip.id}`,
            type: 'Purchase',
            narration: `Approved vehicle expense for ${trip.employee.name} on ${trip.date || 'trip'}`,
            entries: [
              { ledger: `Vehicle Expenses - ${trip.employee.name}`, ledgerType: 'Expense', type: 'Dr', amount: tripAmount },
              { ledger: `Vehicle Payable - ${trip.employee.name}`, ledgerType: 'Liability', type: 'Cr', amount: tripAmount }
            ]
          });
        }, { timeout: 30000 });
      }
    }

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ImprestOpeningBalance" (
        id SERIAL PRIMARY KEY,
        "employeeId" TEXT NOT NULL UNIQUE,
        "openingBalance" FLOAT NOT NULL DEFAULT 0,
        "asOfDate" TEXT NOT NULL,
        "remarks" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    const openingBalances = await prisma.$queryRaw`
      SELECT ob."employeeId", ob."openingBalance"::float AS amount, e.name
      FROM "ImprestOpeningBalance" ob
      LEFT JOIN "Employee" e ON e.id = ob."employeeId"
      WHERE ob."openingBalance" <> 0
    `;
    for (const opening of openingBalances) {
      const employeeName = opening.name || opening.employeeId;
      const openingAmount = amount(opening.amount);
      await prisma.$transaction(async (tx) => {
        await getLedger(tx, 'Opening Balance Equity', 'Capital');
        await postJournal(tx, {
          voucherNo: `IMPREST-OPENING-${opening.employeeId}`,
          type: 'JV',
          narration: `Imprest opening balance for ${employeeName}`,
          entries: [
            { ledger: `Imprest Opening Balance - ${employeeName}`, ledgerType: 'Asset', type: 'Dr', amount: openingAmount },
            { ledger: 'Opening Balance Equity', ledgerType: 'Capital', type: 'Cr', amount: openingAmount }
          ]
        });
      }, { timeout: 30000 });
    }

    } catch (syncError) {
      console.warn('Historical accounting sync skipped:', syncError.message);
    }

    const ledgers = await prisma.accountsLedgerMaster.findMany({
      include: {
        group: true,
        journalEntries: true
      }
    });

    // Calculate dynamic balance based on journal entries
    const formattedLedgers = ledgers.map(ledger => {
      let currentBalance = ledger.openingBalance;
      
      ledger.journalEntries.forEach(entry => {
        if (ledger.balanceType === 'Dr') {
          if (entry.type === 'Dr') currentBalance += entry.amount;
          else currentBalance -= entry.amount;
        } else {
          if (entry.type === 'Cr') currentBalance += entry.amount;
          else currentBalance -= entry.amount;
        }
      });

      return {
        id: ledger.id,
        code: ledger.ledgerCode,
        name: ledger.name,
        group: ledger.group?.name || 'Unknown',
        subGroup: ledger.group?.type || 'Unknown',
        type: 'Ledger',
        balance: currentBalance,
        balanceType: ledger.balanceType,
        status: ledger.status
        ,section: ledgerSection(ledger.name)
      };
    });

    return NextResponse.json(formattedLedgers);
  } catch (error) {
    console.error('Error fetching ledgers:', error);
    return NextResponse.json({ error: 'Failed to fetch ledgers' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const groupName = body.group || 'Assets';
    const openingBalance = amount(body.openingBalance);
    const balanceType = body.balanceType === 'Cr' ? 'Cr' : 'Dr';
    if (!name) return NextResponse.json({ error: 'Account name is required' }, { status: 400 });

    const ledger = await prisma.$transaction(async (tx) => {
      const group = await tx.accountsAccountGroup.upsert({
        where: { name: groupName },
        update: {},
        create: { name: groupName, type: groupTypes[groupName] || 'Asset' }
      });
      const created = await tx.accountsLedgerMaster.create({
        data: {
          ledgerCode: body.code || `AUTO-${Date.now()}`,
          name,
          groupId: group.id,
          openingBalance,
          balanceType,
          status: 'Active'
        }
      });
      if (openingBalance > 0) {
        await postJournal(tx, {
          voucherNo: `OPENING-${created.id}`,
          type: 'JV',
          narration: `Opening balance for ${name}`,
          entries: [
            { ledger: name, ledgerType: groupTypes[groupName] || 'Asset', type: balanceType, amount: openingBalance },
            { ledger: 'Opening Balance Equity', ledgerType: 'Capital', type: balanceType === 'Dr' ? 'Cr' : 'Dr', amount: openingBalance }
          ]
        });
      }
      return created;
    }, { timeout: 30000 });
    return NextResponse.json(ledger, { status: 201 });
  } catch (error) {
    console.error('Error creating ledger:', error);
    return NextResponse.json({ error: error.message || 'Failed to create ledger' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Account id is required' }, { status: 400 });
    const ledger = await prisma.accountsLedgerMaster.update({
      where: { id: body.id },
      data: {
        ledgerCode: body.code || undefined,
        name: body.name,
        openingBalance: amount(body.openingBalance),
        balanceType: body.balanceType === 'Cr' ? 'Cr' : 'Dr'
      }
    });
    return NextResponse.json(ledger);
  } catch (error) {
    console.error('Error updating ledger:', error);
    return NextResponse.json({ error: error.message || 'Failed to update ledger' }, { status: 500 });
  }
}
