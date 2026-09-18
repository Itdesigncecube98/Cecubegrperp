export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const [banks, ledgers, details] = await Promise.all([
      prisma.accountsBankMaster.findMany({ select: { openingBalance: true, currentBalance: true } }),
      prisma.accountsLedgerMaster.findMany({ include: { group: true } }),
      prisma.accountsJournalDetail.findMany({ include: { ledger: { include: { group: true } }, journal: { select: { voucherDate: true } } } })
    ]);

    const balances = new Map(ledgers.map(ledger => [ledger.id, Number(ledger.openingBalance) || 0]));
    details.forEach(detail => {
      const ledger = detail.ledger;
      const signedAmount = detail.type === ledger.balanceType ? detail.amount : -detail.amount;
      balances.set(ledger.id, (balances.get(ledger.id) || 0) + signedAmount);
    });

    const matchingBalance = (pattern) => ledgers
      .filter(ledger => pattern.test(ledger.name))
      .reduce((sum, ledger) => sum + (balances.get(ledger.id) || 0), 0);
    const cashBalance = matchingBalance(/cash/i);
    const bankBalance = banks.reduce((sum, bank) => sum + (Number(bank.currentBalance) || Number(bank.openingBalance) || 0), 0) || matchingBalance(/bank/i);
    const groupType = (ledger) => `${ledger.group?.type || ''} ${ledger.group?.name || ''}`.toLowerCase();
    const isGroup = (ledger, type) => groupType(ledger).includes(type.toLowerCase());
    const receivable = ledgers
      .filter(ledger => isGroup(ledger, 'asset') && /receivable|customer/i.test(ledger.name))
      .reduce((sum, ledger) => sum + (balances.get(ledger.id) || 0), 0);
    const payable = ledgers
      .filter(ledger => isGroup(ledger, 'liabilit') && /payable|vendor/i.test(ledger.name))
      .reduce((sum, ledger) => sum + (balances.get(ledger.id) || 0), 0);
    const gstPayable = matchingBalance(/GST/i);
    const tdsPayable = matchingBalance(/TDS/i);

    const now = new Date();
    const monthlyTotals = (month) => details
      .filter(detail => detail.journal.voucherDate.toISOString().startsWith(month))
      .reduce((totals, detail) => {
        if (isGroup(detail.ledger, 'income') && detail.type === 'Cr') totals.inflow += detail.amount;
        if (isGroup(detail.ledger, 'expense') && detail.type === 'Dr') totals.outflow += detail.amount;
        return totals;
      }, { inflow: 0, outflow: 0 });

    const currentMonth = now.toISOString().slice(0, 7);
    const currentTotals = monthlyTotals(currentMonth);
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7);
      const monthName = date.toLocaleString('en-US', { month: 'short' });
      const totals = monthlyTotals(monthStr);
      last6Months.push({
        month: monthName,
        in: Math.round(totals.inflow / 100000),
        out: Math.round(totals.outflow / 100000)
      });
    }

    return NextResponse.json({
      cashBalance: cashBalance,
      bankBalance: bankBalance,
      receivable: receivable,
      payable: payable,
      revenueMonthly: currentTotals.inflow,
      expenseMonthly: currentTotals.outflow,
      gstPayable: gstPayable,
      tdsPayable: tdsPayable,
      cashFlowData: last6Months
    });
  } catch (error) {
    console.error('Error fetching accounts dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
