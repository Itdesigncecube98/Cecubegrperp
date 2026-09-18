export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const p = new URL(request.url).searchParams;
  const rows = await prisma.tdsDeduction.findMany({
    where: { deductionType: p.get('deductionType') || undefined, quarter: p.get('quarter') || undefined, financialYear: p.get('financialYear') || undefined, status: p.get('status') || undefined, tdsAccountId: p.get('tdsAccountId') ? Number(p.get('tdsAccountId')) : undefined },
    include: { journal: true, tdsAccount: { include: { section: true } } }, orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json({ data: rows.map(row => ({ ...row, billAmount: Number(row.billAmount), tdsAmount: Number(row.tdsAmount), interest: Number(row.interest), voucherNo: row.journal.voucherNo, voucherDate: row.journal.voucherDate, tdsAccount: row.tdsAccount.name, section: row.tdsAccount.section?.code })) });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.journalId || !body.accountName || !body.tdsAccountId || !body.quarter || !body.financialYear) return NextResponse.json({ error: 'Journal, account, TDS account, quarter, and financial year are required' }, { status: 400 });
    const data = await prisma.tdsDeduction.create({ data: { journalId: body.journalId, pan: body.pan, accountName: body.accountName, billAmount: Number(body.billAmount) || 0, tdsAmount: Number(body.tdsAmount) || 0, interest: Number(body.interest) || 0, deductionRemark: body.deductionRemark, tdsAccountId: Number(body.tdsAccountId), costCentre: body.costCentre, deductionType: body.deductionType || '26Q', quarter: body.quarter, financialYear: body.financialYear } });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: 'Failed to create deduction' }, { status: 500 }); }
}
