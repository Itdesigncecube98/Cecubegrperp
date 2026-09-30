xport const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPurchaseBillPreview } from '@/lib/purchaseBillAmounts';
import { getDocumentEditors, recordDocumentEdit } from '@/lib/documentAudit';

async function getNextBillNumbers(client = prisma, year = new Date().getFullYear()) {
  const existingBills = await client.vendorBill.findMany({
    select: { billNo: true, billDate: true, remarks: true }
  });
  let lastBillSequence = 0;
  let lastInvoiceSequence = 0;

  for (const bill of existingBills) {
    if (new Date(bill.billDate).getFullYear() !== year) continue;

    const billNo = String(bill.billNo || '');
    const yearlyBillMatch = billNo.match(new RegExp(`^PB-${year}-(\\d+)$`, 'i'));
    const legacyBillMatch = billNo.match(/^VB-0*(\d+)$/i);
    if (yearlyBillMatch) lastBillSequence = Math.max(lastBillSequence, Number(yearlyBillMatch[1]) || 0);
    else if (legacyBillMatch) lastBillSequence = Math.max(lastBillSequence, Number(legacyBillMatch[1]) || 0);

    const metadataMatch = String(bill.remarks || '').match(/^__META__:(\{.*?\})\n?/);
    if (metadataMatch) {
      try {
        const metadata = JSON.parse(metadataMatch[1]);
        const invoiceMatch = String(metadata.vendorInvoiceNo || '').match(new RegExp(`^INV-${year}-(\\d+)$`, 'i'));
        if (invoiceMatch) lastInvoiceSequence = Math.max(lastInvoiceSequence, Number(invoiceMatch[1]) || 0);
      } catch { /* Ignore malformed legacy metadata. */ }
    }
    if (legacyBillMatch) lastInvoiceSequence = Math.max(lastInvoiceSequence, Number(legacyBillMatch[1]) || 0);
  }

  return {
    billNo: `PB-${year}-${String(lastBillSequence + 1).padStart(4, '0')}`,
    invoiceNo: `INV-${year}-${String(lastInvoiceSequence + 1).padStart(4, '0')}`,
  };
}

// GET - List purchase bills (for purchase team view)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const poNo = searchParams.get('poNo');
    const previewPoNumber = searchParams.get('previewPoNumber');
    const id = searchParams.get('id');

    if (previewPoNumber) {
      const preview = await getPurchaseBillPreview(prisma, previewPoNumber);
      if (!preview) return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
      return NextResponse.json({ ...preview, ...(await getNextBillNumbers(prisma)) });
    }

    if (id) {
      const bill = await prisma.vendorBill.findUnique({ where: { id } });
      if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
      const editors = await getDocumentEditors(prisma, 'PurchaseBill', [bill.id]);
      let meta = {};
      let remarks = bill.remarks || '';
      try {
        const match = remarks.match(/^__META__:(\{.*?\})\n?/);
        if (match) {
          meta = JSON.parse(match[1]);
          remarks = remarks.slice(match[0].length);
        }
      } catch { /* Keep the original remarks if stored metadata is malformed. */ }
      const po = bill.poNo ? await prisma.purchaseOrder.findUnique({ where: { poNumber: bill.poNo } }) : null;
      const preview = bill.poNo ? await getPurchaseBillPreview(prisma, bill.poNo) : null;
      return NextResponse.json({ ...bill, ...meta, ...editors[bill.id], remarks, po, items: preview?.items || [] });
    }

    const where = {};
    if (status) where.status = status;
    if (poNo) where.poNo = poNo;

    const bills = await prisma.vendorBill.findMany({
      where,
      include: { voucher: true },
      orderBy: { createdAt: 'desc' }
    });

    // Enrich bills with computed GST fields stored in remarks (JSON prefix)
    const editors = await getDocumentEditors(prisma, 'PurchaseBill', bills.map(bill => bill.id));
    const enriched = bills.map(bill => {
      let extra = {};
      let remarks = bill.remarks || '';
      try {
        const match = remarks.match(/^__META__:(\{.*?\})\n?/);
        if (match) extra = JSON.parse(match[1]);
        if (match) remarks = remarks.slice(match[0].length);
      } catch { /* ignore parse errors */ }
      return { ...bill, ...extra, ...editors[bill.id], remarks };
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
      cartageCharges = 0,
      roundOff      = 0,
      tdsAmount     = 0,
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

    const preview = await getPurchaseBillPreview(prisma, poNumber);
    if (!preview) return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    if (preview.items.length === 0 || preview.grossAmount <= 0) {
      return NextResponse.json({ error: 'No accepted, non-rejected quantities are available to bill for this PO.' }, { status: 400 });
    }

    const taxable = preview.taxableAmount;
    const cgst = preview.cgstAmount;
    const sgst = preview.sgstAmount;
    const cartage  = parseFloat(cartageCharges) || 0;
    const rndOff   = parseFloat(roundOff) || 0;
    const tds      = parseFloat(tdsAmount) || 0;

    const gross = taxable + cgst + sgst + cartage + rndOff;
    if (!gross) {
      return NextResponse.json({ error: 'Bill amount is required' }, { status: 400 });
    }
    const net = gross - tds;

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

    const billYear = new Date(billDate).getFullYear();
    if (!Number.isFinite(billYear)) return NextResponse.json({ error: 'A valid bill date is required.' }, { status: 400 });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await prisma.$transaction(async tx => {
          const latestPo = await tx.purchaseOrder.findUnique({ where: { id: po.id } });
          if (!latestPo || latestPo.status !== 'APPROVED') {
            throw new Error(`PO must be APPROVED before generating a bill. Current status: ${latestPo?.status || 'not found'}`);
          }

          const { billNo, invoiceNo } = await getNextBillNumbers(tx, billYear);
          const meta = {
            taxableAmount: taxable,
            cgstAmount: cgst,
            sgstAmount: sgst,
            cartageCharges: cartage,
            roundOff: rndOff,
            vendorInvoiceNo: invoiceNo,
            companyPan: companyPan || null,
            companyBankName: companyBankName || null,
            companyBankAccount: companyBankAccount || null,
            companyBankIfsc: companyBankIfsc || null,
          };
          const remarksText = `__META__:${JSON.stringify(meta)}\n${remarks || `Bill for PO ${poNumber} — ${supplierName || latestPo.supplierName}`}`;
          const bill = await tx.vendorBill.create({
            data: {
              billNo,
              billDate: new Date(billDate),
              poNo: poNumber,
              vendorId: supplierId || latestPo.supplierId || latestPo.id,
              companyId: companyId || latestPo.companyId || 'DEFAULT',
              grossAmount: gross,
              tdsAmount: tds,
              netAmount: net,
              paidAmount: 0,
              status: 'UNPAID',
              remarks: remarksText
            }
          });
          await tx.purchaseOrder.update({ where: { id: latestPo.id }, data: { status: 'SENT' } });
          return { bill: { ...bill, ...meta, remarks: remarks || `Bill for PO ${poNumber}` } };
        });
        return NextResponse.json({ ...result, message: 'Bill sent to accounts for payment' }, { status: 201 });
      } catch (error) {
        if (error?.code === 'P2002' && attempt < 2) continue;
        throw error;
      }
    }
  } catch (error) {
    console.error('Error creating purchase bill:', error);
    return NextResponse.json({ error: error.message || 'Failed to create purchase bill' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Bill id is required' }, { status: 400 });
    const current = await prisma.vendorBill.findUnique({ where: { id: body.id } });
    if (!current) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

    if (body.action === 'approve') {
      let existingMeta = {};
      let existingRemarks = current.remarks || '';
      try {
        const match = existingRemarks.match(/^__META__:(\{.*?\})\n?/);
        if (match) { existingMeta = JSON.parse(match[1]); existingRemarks = existingRemarks.slice(match[0].length); }
      } catch { /* Preserve old remarks if metadata is malformed. */ }
      const metaRemarks = `__META__:${JSON.stringify({ ...existingMeta, approvalStatus: 'APPROVED', approvedBy: body.approvedBy || null, approvedAt: new Date().toISOString() })}\n${existingRemarks}`;
      const approvedBill = await prisma.vendorBill.update({ where: { id: body.id }, data: { remarks: metaRemarks } });
      return NextResponse.json({ ...approvedBill, approvalStatus: 'APPROVED', approvedBy: body.approvedBy || null });
    }

    const meta = {
      taxableAmount: Number(body.taxableAmount) || 0,
      cgstAmount: Number(body.cgstAmount) || 0,
      sgstAmount: Number(body.sgstAmount) || 0,
      cartageCharges: Number(body.cartageCharges) || 0,
      roundOff: Number(body.roundOff) || 0,
      vendorInvoiceNo: body.vendorInvoiceNo || null,
      companyPan: body.companyPan || null,
      companyBankName: body.companyBankName || null,
      companyBankAccount: body.companyBankAccount || null,
      companyBankIfsc: body.companyBankIfsc || null,
    };
    const grossAmount = meta.taxableAmount + meta.cgstAmount + meta.sgstAmount + meta.cartageCharges + meta.roundOff;
    const tdsAmount = Number(body.tdsAmount) || 0;
    const remarks = String(body.remarks || '');
    const bill = await prisma.vendorBill.update({
      where: { id: body.id },
      data: {
        billDate: body.billDate ? new Date(body.billDate) : current.billDate,
        grossAmount,
        tdsAmount,
        netAmount: grossAmount - tdsAmount,
        remarks: `__META__:${JSON.stringify(meta)}\n${remarks}`,
      }
    });

    await recordDocumentEdit(prisma, {
      entityType: 'PurchaseBill', entityId: bill.id, module: 'Purchase', editorName: body.editedBy,
    });

    return NextResponse.json({ ...bill, ...meta, editedBy: body.editedBy || null, remarks });
  } catch (error) {
    console.error('Error updating purchase bill:', error);
    return NextResponse.json({ error: error.message || 'Failed to update bill' }, { status: 500 });
  }
}
