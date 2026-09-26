export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const normalize = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

function buildOffers(material, quotations) {
  const materialName = normalize(material.item);
  const offers = [];

  for (const quotation of quotations) {
    const line =
      quotation.items.find((item) => item.indentItemId === material.id) ||
      quotation.items.find((item) => !item.indentItemId && normalize(item.item) === materialName);

    if (!line) continue;

    offers.push({
      quotationItemId: line.id,
      quotationId: quotation.id,
      vendorId: quotation.vendorId,
      vendorName: quotation.vendor?.name || 'Unknown vendor',
      rate: line.rate,
      discount: line.discount,
      gst: line.gst,
      amount: line.amount,
      brand: line.brand,
      isSelected: line.isSelected,
      approvedAt: line.approvedAt
    });
  }

  return offers.sort((a, b) => a.rate - b.rate);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rfqId = searchParams.get('rfqId');

    if (!rfqId) {
      return NextResponse.json({ error: 'An enquiry id is required.' }, { status: 400 });
    }

    const rfq = await prisma.purchaseRFQ.findUnique({
      where: { id: rfqId },
      include: {
        indent: { include: { items: true } },
        vendors: { include: { vendor: true } },
        quotations: { include: { vendor: true, items: true } }
      }
    });

    if (!rfq) {
      return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
    }

    const materials = rfq.indent?.items || [];
    const libraryItems = await prisma.materialLibraryItem.findMany({
      where: { resourceType: 'Material' },
      select: { name: true, rate: true }
    });
    const libraryRates = new Map(
      libraryItems.map((item) => [normalize(item.name), Number(item.rate) || 0])
    );

    const rows = materials.map((material) => {
      const offers = buildOffers(material, rfq.quotations);
      const priced = offers.filter((offer) => offer.rate > 0);

      return {
        indentItemId: material.id,
        item: material.item,
        specification: material.specification,
        unit: material.unit,
        quantity: material.quantity,
        libraryRate: libraryRates.get(normalize(material.item)) || 0,
        offers,
        lowestRate: priced.length ? priced[0].rate : null,
        lowestVendorId: priced.length ? priced[0].vendorId : null,
        highestRate: priced.length ? priced[priced.length - 1].rate : null
      };
    });

    const vendors = rfq.vendors.map((entry) => {
      const quotation = rfq.quotations.find((q) => q.vendorId === entry.vendorId);
      return {
        vendorId: entry.vendorId,
        vendorName: entry.vendor?.name || 'Unknown vendor',
        inviteStatus: entry.status,
        quotationId: quotation?.id || null,
        finalAmount: quotation?.finalAmount ?? null,
        basicAmount: quotation?.basicAmount ?? null,
        gst: quotation?.gst ?? null,
        discount: quotation?.discount ?? null,
        quotedOn: quotation?.date || null,
        itemCount: quotation?.items.length || 0
      };
    });

    return NextResponse.json({
      rfq: {
        id: rfq.id,
        rfqNo: rfq.rfqNo,
        status: rfq.status,
        project: rfq.project,
        rfqDate: rfq.rfqDate,
        dueDate: rfq.dueDate,
        expiryDate: rfq.expiryDate,
        indentNo: rfq.indent?.prNo || null,
        paymentTerms: rfq.paymentTerms,
        deliveryTerms: rfq.deliveryTerms,
        warranty: rfq.warranty
      },
      materials: rows,
      vendors,
      approvedCount: rows.filter((row) => row.offers.some((offer) => offer.isSelected)).length
    });
  } catch (error) {
    console.error('Error building comparison:', error);
    return NextResponse.json({ error: 'Failed to build the comparison.' }, { status: 500 });
  }
}

/** Records the approved (usually lowest) quote line for each material. */
export async function POST(req) {
  try {
    const body = await req.json();
    const rfqId = body?.rfqId;
    const selections = Array.isArray(body?.selections) ? body.selections : [];

    if (!rfqId) {
      return NextResponse.json({ error: 'An enquiry id is required.' }, { status: 400 });
    }
    if (selections.length === 0) {
      return NextResponse.json({ error: 'Select at least one material to approve.' }, { status: 400 });
    }

    const rfq = await prisma.purchaseRFQ.findUnique({ where: { id: rfqId } });
    if (!rfq) {
      return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
    }

    const quotationItemIds = selections.map((selection) => selection?.quotationItemId).filter(Boolean);
    if (quotationItemIds.length === 0) {
      return NextResponse.json({ error: 'No valid quotation lines were selected.' }, { status: 400 });
    }

    const allLines = await prisma.vendorQuotationItem.findMany({
      where: { quotation: { rfqId } },
      select: { id: true }
    });

    const approvedAt = new Date();
    const approvedByVendor = new Map();

    await prisma.$transaction(async (tx) => {
      await tx.vendorQuotationItem.updateMany({
        where: { id: { in: allLines.map((line) => line.id) } },
        data: { isSelected: false, approvedAt: null }
      });

      await tx.vendorQuotationItem.updateMany({
        where: { id: { in: quotationItemIds } },
        data: { isSelected: true, approvedAt }
      });

      await tx.purchaseRFQ.update({
        where: { id: rfqId },
        data: { status: 'Approved' }
      });

      await tx.purchaseApproval.create({
        data: {
          indentId: rfq.indentId,
          stage: 'Quotation Approval',
          status: 'Approved',
          remarks: `Approved ${quotationItemIds.length} material line(s) from enquiry ${rfq.rfqNo}.`,
          approvedAt
        }
      });
    });

    const updated = await prisma.vendorQuotationItem.findMany({
      where: { id: { in: quotationItemIds } },
      include: { quotation: { select: { vendorId: true, vendor: { select: { name: true } } } } }
    });

    updated.forEach((line) => {
      const vendorId = line.quotation?.vendorId;
      const vendorName = line.quotation?.vendor?.name || 'Unknown vendor';
      if (vendorId) {
        if (!approvedByVendor.has(vendorId)) {
          approvedByVendor.set(vendorId, { vendorId, vendorName, lineCount: 0 });
        }
        approvedByVendor.get(vendorId).lineCount += 1;
      }
    });

    return NextResponse.json({
      success: true,
      approvedLines: quotationItemIds.length,
      approvedAt,
      byVendor: Array.from(approvedByVendor.values())
    });
  } catch (error) {
    console.error('Error approving quotations:', error);
    return NextResponse.json({ error: error.message || 'Failed to approve the selection.' }, { status: 500 });
  }
}
