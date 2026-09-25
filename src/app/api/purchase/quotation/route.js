export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const round2 = (value) => Math.round(value * 100) / 100;

/** Builds one quotation line with gross, discount, GST and line total calculated. */
function buildQuotationLine(raw) {
  const quantity = toNumber(raw?.quantity);
  const rate = toNumber(raw?.rate);
  const discountPercent = toNumber(raw?.discount);
  const gstPercent = toNumber(raw?.gst);

  const gross = quantity * rate;
  const discountAmount = (gross * discountPercent) / 100;
  const taxable = gross - discountAmount;
  const gstAmount = (taxable * gstPercent) / 100;
  const amount = taxable + gstAmount;

  return {
    indentItemId: raw?.indentItemId || null,
    item: typeof raw?.item === 'string' ? raw.item.trim() : '',
    brand: raw?.brand ? String(raw.brand).trim() : null,
    quantity,
    rate,
    discount: discountPercent,
    gst: gstPercent,
    amount: round2(amount),
    _gross: gross,
    _discountAmount: discountAmount,
    _gstAmount: gstAmount
  };
}

function summariseLines(lines) {
  return lines.reduce(
    (totals, line) => ({
      basicAmount: totals.basicAmount + line._gross,
      discount: totals.discount + line._discountAmount,
      gst: totals.gst + line._gstAmount,
      finalAmount: totals.finalAmount + line.amount
    }),
    { basicAmount: 0, discount: 0, gst: 0, finalAmount: 0 }
  );
}

function cleanLines(lines) {
  return lines.map(({ _gross, _discountAmount, _gstAmount, ...line }) => line);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const rfqId = searchParams.get('rfqId');

    if (id) {
      const quotation = await prisma.vendorQuotation.findUnique({
        where: { id },
        include: { vendor: true, items: true }
      });
      if (!quotation) {
        return NextResponse.json({ error: 'Quotation not found.' }, { status: 404 });
      }
      return NextResponse.json(quotation);
    }

    const quotations = await prisma.vendorQuotation.findMany({
      where: rfqId ? { rfqId } : undefined,
      include: {
        vendor: { select: { id: true, name: true, vendorCode: true } },
        items: true,
        rfq: { select: { id: true, rfqNo: true, dueDate: true, status: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(quotations);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return NextResponse.json({ error: 'Failed to fetch quotations.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rfqId = body?.rfqId;
    const vendorId = body?.vendorId;

    if (!rfqId) {
      return NextResponse.json({ error: 'An enquiry must be selected.' }, { status: 400 });
    }
    if (!vendorId) {
      return NextResponse.json({ error: 'A vendor must be selected.' }, { status: 400 });
    }
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Add at least one material line.' }, { status: 400 });
    }

    const rfq = await prisma.purchaseRFQ.findUnique({ where: { id: rfqId } });
    if (!rfq) {
      return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
    }

    const lines = body.items.map(buildQuotationLine);
    if (lines.some((line) => !line.item)) {
      return NextResponse.json({ error: 'Every material line needs a name.' }, { status: 400 });
    }

    const totals = summariseLines(lines);
    const data = cleanLines(lines);

    // One quotation per vendor per enquiry: replace the previous revision.
    const existing = await prisma.vendorQuotation.findFirst({ where: { rfqId, vendorId } });

    const quotation = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.vendorQuotationItem.deleteMany({ where: { quotationId: existing.id } });
        return tx.vendorQuotation.update({
          where: { id: existing.id },
          data: {
            date: toDate(body.date),
            basicAmount: round2(totals.basicAmount),
            discount: round2(totals.discount),
            gst: round2(totals.gst),
            finalAmount: round2(totals.finalAmount),
            docsUrl: body.docsUrl || null,
            // Terms
            deliveryTerms:      body.terms?.deliveryTerms      || null,
            paymentTerms:       body.terms?.paymentTerms       || null,
            materialInspection: body.terms?.materialInspection || null,
            warranty:           body.terms?.warranty           || null,
            transactionMode:    body.terms?.transactionMode    || null,
            insurance:          body.terms?.insurance          || null,
            taxAndDuties:       body.terms?.taxAndDuties       || null,
            freightCharges:     body.terms?.freightCharges     || null,
            otherConditions:    body.terms?.otherConditions    || null,
            // Documents stored as JSON
            documents: body.documents ? JSON.stringify(body.documents) : null,
            items: { create: data }
          },
          include: { vendor: true, items: true }
        });
      }

      return tx.vendorQuotation.create({
        data: {
          rfqId,
          vendorId,
          date: toDate(body.date),
          basicAmount: round2(totals.basicAmount),
          discount: round2(totals.discount),
          gst: round2(totals.gst),
          finalAmount: round2(totals.finalAmount),
          docsUrl: body.docsUrl || null,
          // Terms
          deliveryTerms:      body.terms?.deliveryTerms      || null,
          paymentTerms:       body.terms?.paymentTerms       || null,
          materialInspection: body.terms?.materialInspection || null,
          warranty:           body.terms?.warranty           || null,
          transactionMode:    body.terms?.transactionMode    || null,
          insurance:          body.terms?.insurance          || null,
          taxAndDuties:       body.terms?.taxAndDuties       || null,
          freightCharges:     body.terms?.freightCharges     || null,
          otherConditions:    body.terms?.otherConditions    || null,
          // Documents stored as JSON
          documents: body.documents ? JSON.stringify(body.documents) : null,
          items: { create: data }
        },
        include: { vendor: true, items: true }
      });
    });

    await prisma.purchaseRFQVendor.updateMany({
      where: { rfqId, vendorId, status: 'Sent' },
      data: { status: 'Responded' }
    });

    return NextResponse.json(quotation, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Error saving quotation:', error);
    return NextResponse.json({ error: error.message || 'Failed to save quotation.' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const body = await req.json();
    if (!body?.id) {
      return NextResponse.json({ error: 'Quotation id is required.' }, { status: 400 });
    }

    await prisma.vendorQuotation.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'This quotation no longer exists.' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete quotation.' }, { status: 500 });
  }
}
