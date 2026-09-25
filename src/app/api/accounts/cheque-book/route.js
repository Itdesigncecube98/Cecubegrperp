export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bank = searchParams.get('bank');
    const seriesName = searchParams.get('seriesName');
    const status = searchParams.get('status');
    const chequeNo = searchParams.get('chequeNo');
    const statusDateFrom = searchParams.get('statusDateFrom');
    const statusDateTo = searchParams.get('statusDateTo');
    const voucherDateFrom = searchParams.get('voucherDateFrom');
    const voucherDateTo = searchParams.get('voucherDateTo');

    const rows = await prisma.accountsChequeBook.findMany({
      where: {
        ...(bank ? { bank: { contains: bank, mode: 'insensitive' } } : {}),
        ...(seriesName ? { seriesName: { contains: seriesName, mode: 'insensitive' } } : {}),
        ...(status ? { status } : {}),
        ...(chequeNo ? { chequeNo: { contains: chequeNo, mode: 'insensitive' } } : {}),
        ...(statusDateFrom || statusDateTo ? { statusDate: { ...(statusDateFrom ? { gte: new Date(statusDateFrom) } : {}), ...(statusDateTo ? { lte: new Date(statusDateTo) } : {}) } } : {}),
        ...(voucherDateFrom || voucherDateTo ? { voucherDate: { ...(voucherDateFrom ? { gte: new Date(voucherDateFrom) } : {}), ...(voucherDateTo ? { lte: new Date(voucherDateTo) } : {}) } } : {})
      },
      orderBy: [{ voucherDate: 'desc' }, { id: 'desc' }]
    });
    return NextResponse.json(rows.map(row => ({
      ...row,
      statusDate: row.statusDate.toISOString().slice(0, 10),
      voucherDate: row.voucherDate.toISOString().slice(0, 10)
    })));
  } catch (error) {
    console.error('Error fetching cheque book:', error);
    return NextResponse.json({ error: 'Failed to fetch cheque book' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const bank = String(body.bank || '').trim();
    const seriesName = String(body.seriesName || '').trim();
    const chequeNo = String(body.chequeNo || '').trim();
    const status = String(body.status || 'Issued').trim();
    const statusDate = body.statusDate || new Date().toISOString().slice(0, 10);
    const voucherDate = body.voucherDate || statusDate;

    if (!bank || !seriesName || !chequeNo) {
      return NextResponse.json({ error: 'Bank, series name, and cheque number are required' }, { status: 400 });
    }

    const cheque = await prisma.accountsChequeBook.create({ data: { bank, seriesName, chequeNo, status, statusDate: new Date(statusDate), voucherDate: new Date(voucherDate) } });
    return NextResponse.json({ ...cheque, statusDate: statusDate, voucherDate: voucherDate }, { status: 201 });
  } catch (error) {
    console.error('Error creating cheque:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'This cheque number already exists in the selected series' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create cheque' }, { status: 500 });
  }
}
