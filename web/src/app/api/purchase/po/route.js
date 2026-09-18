export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where = {};
    const VALID_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED'];
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    // PurchaseOrder only has items[] and grns[] as relations
    // Supplier info is stored as flat fields: supplierName, supplierAddress, etc.
    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        items: true,
        grns: {
          select: {
            id: true,
            grnNumber: true,   // field is grnNumber, not grnNo
            status: true,
            items: {
              select: {
                poItemId: true,
                receivedQty: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(pos);
  } catch (error) {
    console.error('Error fetching POs:', error);
    return NextResponse.json({ error: 'Failed to fetch POs' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Generate PO number
    const count = await prisma.purchaseOrder.count();
    const poNumber = body.poNumber || `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // PurchaseOrder schema uses: supplierName, supplierAddress, supplierContact,
    // supplierPhone, supplierEmail, supplierGstin, supplierPan, supplierId (optional)
    // Financial: subTotal, cgstAmount, sgstAmount, igstAmount, totalTaxAmount, totalAmount
    // Workflow: companyId, projectId, projectName, preparedBy, preparedByName, approvedBy, approvedByName
    // Relations: items[], grns[]

    const items = body.items || [];
    let subTotal = 0;
    items.forEach(item => {
      subTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
    });

    const cgstAmount = parseFloat(body.cgstAmount) || 0;
    const sgstAmount = parseFloat(body.sgstAmount) || 0;
    const igstAmount = parseFloat(body.igstAmount) || 0;
    const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;
    const totalAmount = subTotal + totalTaxAmount;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        poDate: body.poDate ? new Date(body.poDate) : new Date(),
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
        status: 'DRAFT',

        // Supplier info (flat fields — no vendor relation on this model)
        supplierId: body.supplierId || null,
        supplierName: body.supplierName || '',
        supplierAddress: body.supplierAddress || '',
        supplierContact: body.supplierContact || null,
        supplierPhone: body.supplierPhone || null,
        supplierEmail: body.supplierEmail || null,
        supplierGstin: body.supplierGstin || null,
        supplierPan: body.supplierPan || null,

        // Delivery
        deliveryAddress: body.deliveryAddress || '',
        deliveryContact: body.deliveryContact || null,
        deliveryPhone: body.deliveryPhone || null,

        // Financials
        subTotal,
        cgstPercent: parseFloat(body.cgstPercent) || 0,
        cgstAmount,
        sgstPercent: parseFloat(body.sgstPercent) || 0,
        sgstAmount,
        igstPercent: parseFloat(body.igstPercent) || 0,
        igstAmount,
        totalTaxAmount,
        roundOff: parseFloat(body.roundOff) || 0,
        totalAmount,
        totalAmountWords: body.totalAmountWords || null,

        // Terms
        paymentTerms: body.paymentTerms || null,
        scopeOfWork: body.scopeOfWork || null,
        deliverySchedule: body.deliverySchedule || null,
        otherTerms: body.otherTerms || null,

        // Workflow
        companyId: body.companyId || '',
        projectId: body.projectId || null,
        projectName: body.projectName || null,
        preparedBy: body.preparedBy || null,
        preparedByName: body.preparedByName || 'Purchase Manager',
        approvedBy: body.approvedBy || null,
        approvedByName: body.approvedByName || 'Director',
        remarks: body.remarks || null,

        items: {
          create: items.map((item, idx) => ({
            sNo: item.sNo || idx + 1,
            description: item.description || item.item || '',
            hsnCode: item.hsnCode || null,
            quantity: parseFloat(item.quantity) || 0,
            unit: item.unit || 'Nos',
            rate: parseFloat(item.rate) || 0,
            discountPercent: parseFloat(item.discountPercent) || 0,
            taxableAmount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0),
            gstPercent: parseFloat(item.gstPercent) || 0,
            gstAmount: ((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)) * ((parseFloat(item.gstPercent) || 0) / 100),
            totalAmount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0) * (1 + (parseFloat(item.gstPercent) || 0) / 100),
            pendingQty: parseFloat(item.quantity) || 0,
            specifications: item.specifications || null,
            remarks: item.remarks || null,
          }))
        }
      },
      include: {
        items: true,
        grns: true
      }
    });

    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    console.error('Error creating PO:', error);
    return NextResponse.json({ error: error.message || 'Failed to create PO' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, action, status } = await req.json();
    if (!id) return NextResponse.json({ error: 'PO id is required' }, { status: 400 });

    const VALID_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED'];

    let newStatus;
    if (action === 'approve') newStatus = 'APPROVED';
    else if (action === 'submit') newStatus = 'PENDING_APPROVAL';
    else if (action === 'reject') newStatus = 'CANCELLED';
    else if (status && VALID_STATUSES.includes(status)) newStatus = status;
    else return NextResponse.json({ error: 'Invalid action or status' }, { status: 400 });

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: newStatus },
      include: { items: true }
    });

    return NextResponse.json(po);
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to update purchase order' }, { status: 500 });
  }
}
