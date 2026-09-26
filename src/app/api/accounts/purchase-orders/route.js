import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

async function generatePONumber() {
  const count = await prisma.purchaseOrder.count();
  const num = String(count + 1).padStart(5, '0');
  const year = new Date().getFullYear();
  return `PO-${year}-${num}`;
}

// Recalculate PO totals from line items
function calcTotals(lineItems) {
  let subtotal = 0;
  let taxAmount = 0;
  const items = lineItems.map(item => {
    const qty       = parseFloat(item.quantity)  || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const taxRate   = parseFloat(item.taxRate)   || 0;
    const lineTotal = qty * unitPrice;
    const lineTax   = lineTotal * (taxRate / 100);
    const total     = lineTotal + lineTax;
    subtotal  += lineTotal;
    taxAmount += lineTax;
    return {
      itemCode:    item.itemCode    || null,
      description: item.description,
      unit:        item.unit        || 'Nos',
      quantity:    qty,
      unitPrice,
      taxRate,
      taxAmount:   lineTax,
      totalAmount: total,
      receivedQty: item.receivedQty ? parseFloat(item.receivedQty) : 0,
      remarks:     item.remarks     || null
    };
  });
  const discount = 0;
  const total = subtotal + taxAmount - discount;
  return { items, subtotal, taxAmount, discountAmount: discount, totalAmount: total };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id                = searchParams.get('id');
    const vendorId          = searchParams.get('vendorId');
    const materialRequestId = searchParams.get('materialRequestId');
    const status            = searchParams.get('status');
    const raisedById        = searchParams.get('raisedById');

    if (id) {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: parseInt(id) },
        include: {
          vendor:          true,
          materialRequest: { include: { items: true } },
          raisedBy:        { select: { id: true, name: true, designation: true } },
          lineItems:       true
        }
      });
      if (!po) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
      return NextResponse.json(po);
    }

    const where = {};
    if (vendorId)          where.vendorId          = parseInt(vendorId);
    if (materialRequestId) where.materialRequestId = parseInt(materialRequestId);
    if (status)            where.status            = status;
    if (raisedById)        where.raisedById        = raisedById;

    const pos = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor:    { select: { id: true, vendorCode: true, name: true } },
        raisedBy:  { select: { id: true, name: true } },
        lineItems: true,
        _count: { select: { expenses: true } }
      }
    });

    return NextResponse.json(pos);
  } catch (error) {
    console.error('GET /api/accounts/purchase-orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      vendorId, materialRequestId, raisedById, poDate,
      expectedDelivery, deliveryAddress, paymentTerms,
      currency, terms, remarks, lineItems, poNumber, discountAmount
    } = data;

    if (!vendorId || !poDate) {
      return NextResponse.json({ error: 'vendorId and poDate are required' }, { status: 400 });
    }
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
    }

    const { items, subtotal, taxAmount, totalAmount } = calcTotals(lineItems);
    const discount = discountAmount ? parseFloat(discountAmount) : 0;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber:          poNumber          || await generatePONumber(),
        vendorId:          parseInt(vendorId),
        materialRequestId: materialRequestId ? parseInt(materialRequestId) : null,
        raisedById:        raisedById        || null,
        status:            'DRAFT',
        poDate,
        expectedDelivery:  expectedDelivery  || null,
        deliveryAddress:   deliveryAddress   || null,
        paymentTerms:      paymentTerms      || null,
        currency:          currency          || 'INR',
        subtotal,
        taxAmount,
        discountAmount:    discount,
        totalAmount:       totalAmount - discount,
        terms:             terms             || null,
        remarks:           remarks           || null,
        lineItems: { create: items }
      },
      include: {
        vendor:    { select: { id: true, vendorCode: true, name: true } },
        raisedBy:  { select: { id: true, name: true } },
        lineItems: true
      }
    });

    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    console.error('POST /api/accounts/purchase-orders:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'PO number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, action, lineItems, approvedById, ...updates } = data;

    if (!id) return NextResponse.json({ error: 'Purchase order id is required' }, { status: 400 });

    const poId = parseInt(id);

    if (action === 'SUBMIT') {
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { status: 'SUBMITTED' }
      });
      return NextResponse.json(po);
    }

    if (action === 'APPROVE') {
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: {
          status:      'APPROVED',
          approvedById: approvedById || null,
          approvedAt:  new Date()
        }
      });
      return NextResponse.json(po);
    }

    if (action === 'CANCEL') {
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { status: 'CANCELLED' }
      });
      return NextResponse.json(po);
    }

    if (action === 'MARK_RECEIVED') {
      const po = await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { status: 'RECEIVED' }
      });
      return NextResponse.json(po);
    }

    // Update line items if provided
    if (lineItems && Array.isArray(lineItems)) {
      const { items, subtotal, taxAmount, totalAmount } = calcTotals(lineItems);
      const discount = updates.discountAmount ? parseFloat(updates.discountAmount) : 0;

      await prisma.$transaction([
        prisma.pOLineItem.deleteMany({ where: { purchaseOrderId: poId } }),
        prisma.purchaseOrder.update({
          where: { id: poId },
          data: {
            ...updates,
            subtotal,
            taxAmount,
            discountAmount: discount,
            totalAmount:    totalAmount - discount,
            lineItems: { create: items }
          }
        })
      ]);

      const po = await prisma.purchaseOrder.findUnique({
        where: { id: poId },
        include: {
          vendor:    { select: { id: true, name: true } },
          lineItems: true
        }
      });
      return NextResponse.json(po);
    }

    if (updates.vendorId  !== undefined) updates.vendorId  = parseInt(updates.vendorId);
    if (updates.paidAmount !== undefined) updates.paidAmount = parseFloat(updates.paidAmount);

    const po = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: updates,
      include: {
        vendor:    { select: { id: true, name: true } },
        lineItems: true
      }
    });

    return NextResponse.json(po);
  } catch (error) {
    console.error('PUT /api/accounts/purchase-orders:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Purchase order id is required' }, { status: 400 });

    const po = await prisma.purchaseOrder.findUnique({ where: { id: parseInt(id) } });
    if (!po) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });

    if (!['DRAFT', 'CANCELLED'].includes(po.status)) {
      return NextResponse.json(
        { error: 'Only DRAFT or CANCELLED purchase orders can be deleted' },
        { status: 400 }
      );
    }

    await prisma.purchaseOrder.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/accounts/purchase-orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
