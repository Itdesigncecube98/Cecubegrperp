export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

async function generateRfqNo() {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseRFQ.count();
  return `RFQ-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const rfq = await prisma.purchaseRFQ.findUnique({
        where: { id },
        include: {
          indent: { include: { items: true } },
          vendors: { include: { vendor: true } },
          quotations: { include: { vendor: true, items: true } }
        }
      });

      if (!rfq) {
        return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
      }
      return NextResponse.json(rfq);
    }

    const rfqs = await prisma.purchaseRFQ.findMany({
      include: {
        indent: { select: { id: true, prNo: true } },
        vendors: { select: { id: true, status: true, vendor: { select: { id: true, name: true } } } },
        _count: { select: { quotations: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(rfqs);
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    return NextResponse.json({ error: 'Failed to fetch enquiries.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const indentId = body?.indentId;
    const vendorIds = Array.isArray(body?.vendorIds) ? body.vendorIds.filter(Boolean) : [];

    if (!indentId) {
      return NextResponse.json({ error: 'A purchase indent must be selected.' }, { status: 400 });
    }
    if (vendorIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one vendor to send the enquiry to.' }, { status: 400 });
    }

    const indent = await prisma.purchaseIndent.findUnique({
      where: { id: indentId },
      include: { items: true }
    });

    if (!indent) {
      return NextResponse.json({ error: 'Purchase indent not found.' }, { status: 404 });
    }
    if (indent.items.length === 0) {
      return NextResponse.json({ error: 'This indent has no materials to enquire.' }, { status: 400 });
    }

    const rfq = await prisma.purchaseRFQ.create({
      data: {
        rfqNo: await generateRfqNo(),
        rfqDate: toDate(body.rfqDate) || new Date(),
        indentId,
        project: body.project || indent.project,
        requiredDate: toDate(body.requiredDate) || indent.requiredDate,
        dueDate: toDate(body.dueDate),
        expiryDate: toDate(body.expiryDate),
        paymentTerms: body.paymentTerms || null,
        deliveryTerms: body.deliveryTerms || null,
        warranty: body.warranty || null,
        specialCond: body.specialCond || null,
        status: 'Open',
        vendors: {
          create: vendorIds.map((vendorId) => ({ vendorId, status: 'Sent' }))
        }
      },
      include: {
        vendors: { include: { vendor: true } },
        indent: { include: { items: true } }
      }
    });

    return NextResponse.json(rfq, { status: 201 });
  } catch (error) {
    console.error('Error creating enquiry:', error);
    return NextResponse.json({ error: error.message || 'Failed to create enquiry.' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    if (!body?.id) {
      return NextResponse.json({ error: 'Enquiry id is required.' }, { status: 400 });
    }

    const rfq = await prisma.purchaseRFQ.update({
      where: { id: body.id },
      data: {
        dueDate: toDate(body.dueDate),
        expiryDate: toDate(body.expiryDate),
        paymentTerms: body.paymentTerms ?? null,
        deliveryTerms: body.deliveryTerms ?? null,
        warranty: body.warranty ?? null,
        specialCond: body.specialCond ?? null,
        status: body.status || 'Open'
      }
    });

    return NextResponse.json(rfq);
  } catch (error) {
    console.error('Error updating enquiry:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'This enquiry no longer exists.' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update enquiry.' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const body = await req.json();
    if (!body?.id) {
      return NextResponse.json({ error: 'Enquiry id is required.' }, { status: 400 });
    }

    await prisma.purchaseRFQ.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'This enquiry no longer exists.' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Failed to delete enquiry.' }, { status: 500 });
  }
}
