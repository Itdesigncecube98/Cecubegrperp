import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/contracting/quotation?enquiryId=xxx
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const enquiryId = searchParams.get('enquiryId');
    const id = searchParams.get('id');

    if (id) {
      const q = await prisma.contractingQuotation.findUnique({
        where: { id },
        include: { items: true }
      });
      return NextResponse.json(q);
    }

    const where = enquiryId ? { enquiryId } : {};
    const quotations = await prisma.contractingQuotation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });
    return NextResponse.json(quotations);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/contracting/quotation
export async function POST(req) {
  try {
    const body = await req.json();
    const { enquiryId, contractorId, contractorName, quotationDate, validTill, items, terms, documents } = body;

    const count = await prisma.contractingQuotation.count();
    const quotationNo = `CE-QT-${String(count + 1).padStart(4, '0')}`;

    const quotation = await prisma.contractingQuotation.create({
      data: {
        quotationNo,
        enquiryId,
        contractorId,
        contractorName,
        quotationDate: quotationDate ? new Date(quotationDate) : new Date(),
        validTill: validTill ? new Date(validTill) : null,
        // Terms
        deliveryTerms:      terms?.deliveryTerms      || null,
        paymentTerms:       terms?.paymentTerms       || null,
        materialInspection: terms?.materialInspection || null,
        warranty:           terms?.warranty           || null,
        transactionMode:    terms?.transactionMode    || null,
        insurance:          terms?.insurance          || null,
        taxAndDuties:       terms?.taxAndDuties       || null,
        freightCharges:     terms?.freightCharges     || null,
        otherConditions:    terms?.otherConditions    || null,
        // Documents stored as JSON
        documents: documents ? JSON.stringify(documents) : null,
        items: {
          create: (items || []).map(item => {
            const qty = parseFloat(item.qty) || 1;
            const rate = parseFloat(item.rate) || 0;
            const amount = qty * rate;
            const gstPercent = parseFloat(item.gstPercent) || 18;
            const gstAmount = amount * (gstPercent / 100);
            return {
              taskName: item.taskName,
              unit: item.unit || null,
              qty, rate, amount, gstPercent, gstAmount,
              totalAmount: amount + gstAmount,
            };
          })
        }
      },
      include: { items: true }
    });

    return NextResponse.json(quotation);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/contracting/quotation — update a quotation and its line items
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, enquiryId, contractorId, contractorName, quotationDate, validTill, items, terms, documents } = body;
    if (!id || !enquiryId || !contractorId) {
      return NextResponse.json({ error: 'Quotation, enquiry, and contractor are required.' }, { status: 400 });
    }

    const quotation = await prisma.$transaction(async (tx) => {
      await tx.contractingQuotationItem.deleteMany({ where: { quotationId: id } });
      return tx.contractingQuotation.update({
        where: { id },
        data: {
          enquiryId,
          contractorId,
          contractorName,
          quotationDate: quotationDate ? new Date(quotationDate) : new Date(),
          validTill: validTill ? new Date(validTill) : null,
          deliveryTerms: terms?.deliveryTerms || null,
          paymentTerms: terms?.paymentTerms || null,
          materialInspection: terms?.materialInspection || null,
          warranty: terms?.warranty || null,
          transactionMode: terms?.transactionMode || null,
          insurance: terms?.insurance || null,
          taxAndDuties: terms?.taxAndDuties || null,
          freightCharges: terms?.freightCharges || null,
          otherConditions: terms?.otherConditions || null,
          documents: documents ? JSON.stringify(documents) : null,
          items: {
            create: (items || []).map(item => {
              const qty = parseFloat(item.qty) || 1;
              const rate = parseFloat(item.rate) || 0;
              const amount = qty * rate;
              const gstPercent = parseFloat(item.gstPercent) || 18;
              const gstAmount = amount * (gstPercent / 100);
              return {
                taskName: item.taskName,
                unit: item.unit || null,
                qty, rate, amount, gstPercent, gstAmount,
                totalAmount: amount + gstAmount,
              };
            })
          }
        },
        include: { items: true }
      });
    });

    return NextResponse.json(quotation);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/contracting/quotation
export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Quotation id is required.' }, { status: 400 });
    await prisma.contractingQuotation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/contracting/quotation — update status (Select Winner)
export async function PATCH(req) {
  try {
    const { id, status } = await req.json();
    const updated = await prisma.contractingQuotation.update({
      where: { id },
      data: { status }
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
