import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

async function generateInvoiceNumber(type = 'SALES') {
  const prefix = type === 'PURCHASE' ? 'PINV' : 'INV';
  const count = await prisma.invoice.count({ where: { invoiceType: type } });
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
}

function calcInvoiceTotals(lineItems, cgstRate = 0, sgstRate = 0, igstRate = 0, tds = 0, discount = 0) {
  let subtotal = 0;
  const items = lineItems.map(item => {
    const qty       = parseFloat(item.quantity)  || 1;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const taxRate   = parseFloat(item.taxRate)   || 0;
    const lineBase  = qty * unitPrice;
    const lineTax   = lineBase * (taxRate / 100);
    subtotal += lineBase;
    return {
      description: item.description,
      unit:        item.unit    || 'Nos',
      quantity:    qty,
      unitPrice,
      taxRate,
      taxAmount:   lineTax,
      totalAmount: lineBase + lineTax,
      hsnSac:      item.hsnSac || null
    };
  });
  const cgst     = subtotal * (cgstRate / 100);
  const sgst     = subtotal * (sgstRate / 100);
  const igst     = subtotal * (igstRate / 100);
  const totalTax = cgst + sgst + igst;
  const total    = subtotal + totalTax - discount - tds;
  return { items, subtotal, cgst, sgst, igst, totalAmount: total };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id          = searchParams.get('id');
    const invoiceType = searchParams.get('invoiceType');
    const projectId   = searchParams.get('projectId');
    const vendorId    = searchParams.get('vendorId');
    const status      = searchParams.get('status');
    const startDate   = searchParams.get('startDate');
    const endDate     = searchParams.get('endDate');
    const overdue     = searchParams.get('overdue');

    if (id) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: parseInt(id) },
        include: {
          project:   { select: { id: true, projectCode: true, name: true } },
          vendor:    { select: { id: true, vendorCode: true, name: true } },
          lineItems: true
        }
      });
      if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      return NextResponse.json(invoice);
    }

    const where = {};
    if (invoiceType) where.invoiceType = invoiceType;
    if (projectId)   where.projectId   = parseInt(projectId);
    if (vendorId)    where.vendorId    = parseInt(vendorId);
    if (status)      where.status      = status;
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = startDate;
      if (endDate)   where.invoiceDate.lte = endDate;
    }
    if (overdue === 'true') {
      const today = new Date().toISOString().split('T')[0];
      where.dueDate = { lt: today };
      where.status  = { notIn: ['PAID', 'CANCELLED'] };
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      include: {
        project:   { select: { id: true, projectCode: true, name: true } },
        vendor:    { select: { id: true, vendorCode: true, name: true } },
        lineItems: true
      }
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('GET /api/accounts/invoices:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      invoiceType, projectId, vendorId, clientName,
      clientGstin, clientAddress, invoiceDate, dueDate,
      currency, cgstRate, sgstRate, igstRate, tds,
      discountAmount, lineItems, paymentMode, paymentDate,
      paymentRef, notes, createdById, invoiceNumber
    } = data;

    if (!invoiceDate) {
      return NextResponse.json({ error: 'invoiceDate is required' }, { status: 400 });
    }
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
    }

    const type     = invoiceType    || 'SALES';
    const cgstR    = cgstRate       ? parseFloat(cgstRate) : 0;
    const sgstR    = sgstRate       ? parseFloat(sgstRate) : 0;
    const igstR    = igstRate       ? parseFloat(igstRate) : 0;
    const tdsAmt   = tds            ? parseFloat(tds) : 0;
    const discount = discountAmount ? parseFloat(discountAmount) : 0;

    const { items, subtotal, cgst, sgst, igst, totalAmount } =
      calcInvoiceTotals(lineItems, cgstR, sgstR, igstR, tdsAmt, discount);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber:  invoiceNumber || await generateInvoiceNumber(type),
        invoiceType:    type,
        projectId:      projectId     ? parseInt(projectId) : null,
        vendorId:       vendorId      ? parseInt(vendorId)  : null,
        clientName:     clientName    || null,
        clientGstin:    clientGstin   || null,
        clientAddress:  clientAddress || null,
        invoiceDate,
        dueDate:        dueDate       || null,
        currency:       currency      || 'INR',
        subtotal,
        cgst,
        sgst,
        igst,
        tds:            tdsAmt,
        discountAmount: discount,
        totalAmount,
        status:         'DRAFT',
        paymentMode:    paymentMode   || null,
        paymentDate:    paymentDate   || null,
        paymentRef:     paymentRef    || null,
        notes:          notes         || null,
        createdById:    createdById   || null,
        lineItems: { create: items }
      },
      include: {
        project:   { select: { id: true, projectCode: true, name: true } },
        vendor:    { select: { id: true, name: true } },
        lineItems: true
      }
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('POST /api/accounts/invoices:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Invoice number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, action, lineItems, paidAmount, paymentMode, paymentDate, paymentRef, ...updates } = data;

    if (!id) return NextResponse.json({ error: 'Invoice id is required' }, { status: 400 });

    const invId = parseInt(id);

    if (action === 'SEND') {
      const inv = await prisma.invoice.update({
        where: { id: invId },
        data: { status: 'SENT' }
      });
      return NextResponse.json(inv);
    }

    if (action === 'RECORD_PAYMENT') {
      const inv = await prisma.invoice.findUnique({
        where: { id: invId },
        select: { totalAmount: true, paidAmount: true }
      });
      if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

      const newPaid = (inv.paidAmount || 0) + (parseFloat(paidAmount) || 0);
      const newStatus = newPaid >= inv.totalAmount ? 'PAID' : 'PARTIALLY_PAID';

      const updated = await prisma.invoice.update({
        where: { id: invId },
        data: {
          paidAmount:  newPaid,
          status:      newStatus,
          paymentMode: paymentMode || null,
          paymentDate: paymentDate || null,
          paymentRef:  paymentRef  || null
        }
      });
      return NextResponse.json(updated);
    }

    if (action === 'CANCEL') {
      const inv = await prisma.invoice.update({
        where: { id: invId },
        data: { status: 'CANCELLED' }
      });
      return NextResponse.json(inv);
    }

    if (action === 'MARK_OVERDUE') {
      const inv = await prisma.invoice.update({
        where: { id: invId },
        data: { status: 'OVERDUE' }
      });
      return NextResponse.json(inv);
    }

    if (updates.projectId  !== undefined) updates.projectId  = updates.projectId ? parseInt(updates.projectId) : null;
    if (updates.vendorId   !== undefined) updates.vendorId   = updates.vendorId  ? parseInt(updates.vendorId)  : null;
    if (updates.totalAmount !== undefined) updates.totalAmount = parseFloat(updates.totalAmount);

    const inv = await prisma.invoice.update({
      where: { id: invId },
      data: updates,
      include: {
        project:   { select: { id: true, projectCode: true, name: true } },
        vendor:    { select: { id: true, name: true } },
        lineItems: true
      }
    });

    return NextResponse.json(inv);
  } catch (error) {
    console.error('PUT /api/accounts/invoices:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Invoice id is required' }, { status: 400 });

    const inv = await prisma.invoice.findUnique({ where: { id: parseInt(id) } });
    if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    if (!['DRAFT', 'CANCELLED'].includes(inv.status)) {
      return NextResponse.json(
        { error: 'Only DRAFT or CANCELLED invoices can be deleted' },
        { status: 400 }
      );
    }

    await prisma.invoice.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/accounts/invoices:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
