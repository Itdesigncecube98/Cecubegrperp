export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - List purchase bills (for purchase team view)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const poNo = searchParams.get('poNo');

    const where = {};
    if (status) where.status = status;
    if (poNo) where.poNo = poNo;

    const bills = await prisma.vendorBill.findMany({
      where,
      include: { voucher: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(bills);
  } catch (error) {
    console.error('Error fetching purchase bills:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase bills' }, { status: 500 });
  }
}

// POST - Purchase team creates a bill from an approved PO
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      poId,         // PurchaseOrder.id
      poNumber,     // PurchaseOrder.poNumber (string ref)
      supplierId,
      supplierName,
      companyId,
      billDate,
      grossAmount,   // final amount purchase team enters
      tdsAmount = 0,
      vendorInvoiceNo,
      vendorInvoiceDate,
      remarks
    } = body;

    if (!poNumber || !billDate || grossAmount == null) {
      return NextResponse.json(
        { error: 'poNumber, billDate, and grossAmount are required' },
        { status: 400 }
      );
    }

    // Verify PO exists and is APPROVED
    const po = await prisma.purchaseOrder.findFirst({
      where: { poNumber }
    });

    if (!po) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    if (po.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `PO must be APPROVED before generating a bill. Current status: ${po.status}` },
        { status: 400 }
      );
    }

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

    const gross = parseFloat(grossAmount);
    const tds = parseFloat(tdsAmount) || 0;
    const netAmount = gross - tds;

    // Create the bill (status = UNPAID — goes to accounts for payment)
    const bill = await prisma.vendorBill.create({
      data: {
        billNo,
        billDate: new Date(billDate),
        poNo: poNumber,
        vendorId: supplierId || po.supplierId || po.id,
        companyId: companyId || po.companyId || 'DEFAULT',
        grossAmount: gross,
        tdsAmount: tds,
        netAmount,
        paidAmount: 0,
        status: 'UNPAID',
        remarks: remarks || `Bill for PO ${poNumber} — ${supplierName || po.supplierName}`
      }
    });

    // Update PO status to SENT (bill raised, now with accounts)
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'SENT' }
    });

    return NextResponse.json({ bill, message: 'Bill sent to accounts for payment' }, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase bill:', error);
    return NextResponse.json({ error: error.message || 'Failed to create purchase bill' }, { status: 500 });
  }
}
