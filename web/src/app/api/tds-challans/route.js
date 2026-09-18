export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const p = new URL(request.url).searchParams;
  const rows = await prisma.tdsChallan.findMany({ where: { financialYear: p.get('financialYear') || undefined, quarter: p.get('quarter') || undefined, tdsAccountId: p.get('tdsAccountId') ? Number(p.get('tdsAccountId')) : undefined }, include: { journal: true, tdsAccount: { include: { section: true } }, bank: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ data: rows.map(row => ({ id: row.id, voucherNo: row.journal.voucherNo, accountName: row.tdsAccount.name, section: row.tdsAccount.section?.code, bankName: row.bank?.bankName || row.bank?.accountNumber, chequeDate: row.chequeDate, chequeNo: row.chequeNo, challanAmount: Number(row.challanAmount) })) });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.journalId || !body.tdsAccountId || !body.financialYear || !body.quarter || !Array.isArray(body.deductionIds) || !body.deductionIds.length) return NextResponse.json({ error: 'Journal, TDS account, period, and deductions are required' }, { status: 400 });
    const deductions = await prisma.tdsDeduction.findMany({ where: { id: { in: body.deductionIds.map(Number) } } });
    const total = deductions.reduce((sum, row) => sum + Number(row.tdsAmount) - Number(row.paidAmount), 0);
    const data = await prisma.$transaction(async tx => {
      const challan = await tx.tdsChallan.create({ data: { journalId: body.journalId, tdsAccountId: Number(body.tdsAccountId), bankId: body.bankId || null, chequeNo: body.chequeNo, chequeDate: body.chequeDate ? new Date(body.chequeDate) : null, challanAmount: total, financialYear: body.financialYear, quarter: body.quarter, deductions: { create: deductions.map(row => ({ deductionId: row.id, amountApplied: Number(row.tdsAmount) - Number(row.paidAmount) })) } } });
      await tx.tdsDeduction.updateMany({ where: { id: { in: deductions.map(row => row.id) } }, data: { paidAmount: { increment: total }, status: 'Paid' } });
      return challan;
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: 'Failed to create TDS challan' }, { status: 500 }); }
}
