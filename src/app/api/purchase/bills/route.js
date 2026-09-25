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

    // Enrich bills with computed GST fields stored in remarks (JSON prefix)
    const enriched = bills.map(bill => {
      let extra = {};
      try {
        const match = bill.remarks?.match(/^__META__:(\{.*?\})\n?/);
        if (match) extra = JSON.parse(match[1]);
      } catch { /* ignore parse errors */ }
      return { ...bill, ...extra };
    });

    return NextResponse.json(enriched);
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
      poId,             // optional
      poNumber,         // PurchaseOrder.poNumber (string ref)
      supplierId,
      supplierName,
      companyId,
      billDate,
      // GST breakdown
      taxableAmount,
      cgstAmount    = 0,
      sgstAmount    = 0,
      cartageCharges = 0,
      roundOff      = 0,
      grossAmount,      // may be sent directly (legacy) or computed below
      tdsAmount     = 0,
      netAmount,        // may be sent directly or computed below
      vendorInvoiceNo,
      vendorInvoiceDate,
      // bank details
      companyPan,
      companyBankName,
      companyBankAccount,
      companyBankIfsc,
      remarks
    } = body;

    if (!poNumber || !billDate) {
      return NextResponse.json(
        { error: 'poNumber and billDate are required' },
        { status: 400 }
      );
    }

    // Compute amounts
    const taxable  = parseFloat(taxableAmount) || 0;
    const cgst     = parseFloat(cgstAmount) || 0;
    const sgst     = parseFloat(sgstAmount) || 0;
    const cartage  = parseFloat(cartageCharges) || 0;
    const rndOff   = parseFloat(roundOff) || 0;
    const tds      = parseFloat(tdsAmount) || 0;

    // grossAmount = total bill before TDS
    const gross = parseFloat(grossAmount) || (taxable + cgst + sgst + cartage + rndOff);
    if (!gross) {
      return NextResponse.json({ error: 'Bill amount is required' }, { status: 400 });
    }
    const net = parseFloat(netAmount) || (gross - tds);

    // Verify PO exists and is APPROVED
    const po = await prisma.purchaseOrder.findFirst({ where: { poNumber } });

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
    const lastBill = await prisma.vendorBill.findFirst({ orderBy: { createdAt: 'desc' } });
    let billNo = 'VB-0001';
    if (lastBill?.billNo) {
      const parts = lastBill.billNo.split('-');
      const num = parseInt(parts[parts.length - 1] || '0') + 1;
      billNo = `VB-${num.toString().padStart(4, '0')}`;
    }

    // Store GST breakdown + bank details in a JSON prefix inside remarks
    const meta = {
      taxableAmount: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      cartageCharges: cartage,
      roundOff: rndOff,
      vendorInvoiceNo: vendorInvoiceNo || null,
      companyPan: companyPan || null,
      companyBankName: companyBankName || null,
      companyBankAccount: companyBankAccount || null,
      companyBankIfsc: companyBankIfsc || null,
    };
    const remarksText = `__META__:${JSON.stringify(meta)}\n${remarks || `Bill for PO ${poNumber} — ${supplierName || po.supplierName}`}`;

    // Create the bill
    const bill = await prisma.vendorBill.create({
      data: {
        billNo,
        billDate: new Date(billDate),
        poNo: poNumber,
        vendorId: supplierId || po.supplierId || po.id,
        companyId: companyId || po.companyId || 'DEFAULT',
        grossAmount: gross,
        tdsAmount: tds,
        netAmount: net,
        paidAmount: 0,
        status: 'UNPAID',
        remarks: remarksText
      }
    });

    // Hydrate the GST fields back into the response
    const enrichedBill = { ...bill, ...meta, remarks: remarks || `Bill for PO ${poNumber}` };

    // Update PO status to SENT (bill raised, now with accounts)
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'SENT' }
    });

    return NextResponse.json({ bill: enrichedBill, message: 'Bill sent to accounts for payment' }, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase bill:', error);
    return NextResponse.json({ error: error.message || 'Failed to create purchase bill' }, { status: 500 });
  }
}
