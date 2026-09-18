export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { amount, postJournal } from '@/lib/accounting';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const journals = await prisma.accountsJournal.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(search ? { OR: [{ voucherNo: { contains: search, mode: 'insensitive' } }, { narration: { contains: search, mode: 'insensitive' } }] } : {})
      },
      include: { details: { include: { ledger: true } } },
      orderBy: { voucherDate: 'desc' }
    });
    return NextResponse.json(journals.map(journal => ({
      id: journal.id,
      no: journal.voucherNo,
      date: journal.voucherDate.toISOString().slice(0, 10),
      type: journal.type === 'JV' ? 'Journal' : journal.type,
      party: journal.details.find(detail => detail.type === 'Dr')?.ledger?.name || journal.narration || '-',
      amount: journal.totalAmount,
      status: journal.status,
      narration: journal.narration,
      billNo: journal.billNo,
      billDate: journal.billDate,
      dueDate: journal.dueDate
    })));
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    return NextResponse.json({ error: 'Failed to fetch vouchers' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const type = body.type || 'Payment';
    const party = String(body.party || '').trim();
    const ledger = String(body.ledger || party).trim();
    const voucherDate = body.date ? new Date(body.date) : new Date();
    const total = amount(body.amount);
    if (!party || !ledger || total <= 0 || !body.narration) {
      return NextResponse.json({ error: 'Party, ledger, amount, and narration are required' }, { status: 400 });
    }

    const voucherNo = body.voucherNo || `${type.toUpperCase().slice(0, 2)}-${Date.now()}`;
    const debitFirst = ['Payment', 'Purchase'].includes(type);
    const journal = await prisma.$transaction(async (tx) => {
      const created = await postJournal(tx, {
        voucherNo,
        type,
        narration: body.narration,
        entries: [
          { ledger: debitFirst ? ledger : 'Cash / Bank', ledgerType: debitFirst ? 'Expense' : 'Asset', type: 'Dr', amount: total },
          { ledger: debitFirst ? 'Cash / Bank' : ledger, ledgerType: debitFirst ? 'Asset' : 'Income', type: 'Cr', amount: total }
        ]
      });
      return tx.accountsJournal.update({ where: { id: created.id }, data: { voucherDate, billNo: body.billNo || null, billDate: body.billDate ? new Date(body.billDate) : null, dueDate: body.dueDate ? new Date(body.dueDate) : null } });
    }, { timeout: 30000 });
    return NextResponse.json(journal, { status: 201 });
  } catch (error) {
    console.error('Error creating voucher:', error);
    return NextResponse.json({ error: error.message || 'Failed to create voucher' }, { status: 500 });
  }
}