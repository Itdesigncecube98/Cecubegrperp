import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const VALID_STATUSES = ['UNPAID', 'PARTIAL', 'PAID'];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendorId');
    const poNo = searchParams.get('poNo');

    const where = {};
    if (status && VALID_STATUSES.includes(status)) where.status = status;
    if (vendorId) where.vendorId = vendorId;
    if (poNo) where.poNo = poNo;

    const bills = await prisma.vendorBill.findMany({
      where,
      include: {
        voucher: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(bills);
  } catch (error) {
    console.error('Error fetching purchase bills:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase bills' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      poNo,
      vendorId,
      companyId,
      billDate,
      grossAmount,
      tdsAmount = 0,
      remarks
    } = body;

    if (!vendorId || !companyId || !billDate || grossAmount == null) {
      return NextResponse.json({ error: 'vendorId, companyId, billDate and grossAmount are required' }, { status: 400 });
    }

    const netAmount = parseFloat(grossAmount) - parseFloat(tdsAmount);

    // Generate bill number
    const lastBill = await prisma.vendorBill.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    let billNo = 'VB-0001';
    if (lastBill?.billNo) {
      const parts = lastBill.billNo.split('-');
      const num = parseInt(parts[parts.length - 1] || '0') + 1;
      billNo = `VB-${num.toString().padStart(4, '0')}`;
    }

    const bill = await prisma.vendorBill.create({
      data: {
        billNo,
        billDate: new Date(billDate),
        poNo: poNo || null,
        vendorId,
        companyId,
        grossAmount: parseFloat(grossAmount),
        tdsAmount: parseFloat(tdsAmount),
        netAmount,
        paidAmount: 0,
        status: 'UNPAID',
        remarks: remarks || null
      }
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase bill:', error);
    return NextResponse.json({ error: 'Failed to create purchase bill' }, { status: 500 });
  }
}
