export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const accountId = new URL(request.url).searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
  const deductions = await prisma.tdsDeduction.findMany({ where: { status: { in: ['Pending', 'PartiallyPaid'] } }, include: { journal: true } });
  return NextResponse.json({ data: { debitSide: [], creditSide: deductions.map(row => ({ refType: 'Deduction', refId: row.id, vDateVNo: row.journal.voucherNo, bankParty: row.accountName, amount: Number(row.tdsAmount), pending: Number(row.tdsAmount) - Number(row.paidAmount) })) } });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const lines = body.lines || [];
    const debitTotal = lines.filter(line => line.side === 'Debit').reduce((sum, line) => sum + Number(line.adjAmount), 0);
    const creditTotal = lines.filter(line => line.side === 'Credit').reduce((sum, line) => sum + Number(line.adjAmount), 0);
    if (!body.accountId || !lines.length || Math.abs(debitTotal - creditTotal) > 0.005) return NextResponse.json({ error: 'Account, lines, and equal debit/credit totals are required' }, { status: 400 });
    const data = await prisma.$transaction(async tx => {
      const adjustment = await tx.tdsAdjustment.create({ data: { accountId: body.accountId, bankId: body.bankId || null, taxType: body.taxType || 'TDS', totalAmount: debitTotal, lines: { create: lines.map(line => ({ side: line.side, refType: line.refType, refId: Number(line.refId), amount: Number(line.amount) || 0, pendingAmount: Number(line.pending) || 0, adjAmount: Number(line.adjAmount) })) } } });
      for (const line of lines.filter(item => item.side === 'Credit' && item.refType === 'Deduction')) {
        const deduction = await tx.tdsDeduction.findUnique({ where: { id: Number(line.refId) } });
        if (deduction) { const paid = Number(deduction.paidAmount) + Number(line.adjAmount); await tx.tdsDeduction.update({ where: { id: deduction.id }, data: { paidAmount: paid, status: paid >= Number(deduction.tdsAmount) ? 'Paid' : 'PartiallyPaid' } }); }
      }
      return adjustment;
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: 'Failed to save TDS adjustment' }, { status: 500 }); }
}
