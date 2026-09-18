import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const poId = searchParams.get('poId');
    const vendorId = searchParams.get('vendorId');

    const where = {};
    if (status) where.status = status;
    if (poId) where.purchaseOrderId = parseInt(poId);
    if (vendorId) where.vendorId = parseInt(vendorId);

    const grns = await prisma.goodsReceiptNote.findMany({
      where,
      include: {
        purchaseOrder: {
          include: {
            vendor: true
          }
        },
        items: {
          include: {
            poItem: true
          }
        }
      },
      orderBy: { grnDate: 'desc' }
    });

    return NextResponse.json(grns);
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    return NextResponse.json({ error: 'Failed to fetch GRNs' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { purchaseOrderId, grnDate, receivedBy, remarks, items } = body;

    // Generate GRN number
    const lastGRN = await prisma.goodsReceiptNote.findFirst({
      orderBy: { grnNumber: 'desc' }
    });
    
    let grnNumber = 'GRN001';
    if (lastGRN) {
      const num = parseInt(lastGRN.grnNumber.replace('GRN', '')) + 1;
      grnNumber = `GRN${num.toString().padStart(3, '0')}`;
    }

    // Get PO details
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true }
    });

    if (!po) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    // Create GRN with items
    const grn = await prisma.goodsReceiptNote.create({
      data: {
        grnNumber,
        grnDate: new Date(grnDate),
        purchaseOrderId,
        vendorId: po.vendorId,
        receivedBy,
        remarks,
        status: 'PENDING',
        items: {
          create: items.map(item => ({
            poItemId: item.poItemId,
            receivedQuantity: parseFloat(item.receivedQuantity),
            acceptedQuantity: parseFloat(item.acceptedQuantity),
            rejectedQuantity: parseFloat(item.rejectedQuantity),
            remarks: item.remarks || null
          }))
        }
      },
      include: {
        purchaseOrder: {
          include: {
            vendor: true
          }
        },
        items: {
          include: {
            poItem: true
          }
        }
      }
    });

    // Update PO status based on received quantities
    const allItemsReceived = await checkIfPOFullyReceived(purchaseOrderId);
    if (allItemsReceived) {
      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: 'RECEIVED' }
      });
    } else {
      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: 'PARTIAL_RECEIVED' }
      });
    }

    return NextResponse.json(grn, { status: 201 });
  } catch (error) {
    console.error('Error creating GRN:', error);
    return NextResponse.json({ error: 'Failed to create GRN' }, { status: 500 });
  }
}

async function checkIfPOFullyReceived(poId) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      items: true,
      grns: {
        include: { items: true }
      }
    }
  });

  for (const poItem of po.items) {
    const totalReceived = po.grns.reduce((sum, grn) => {
      const grnItems = grn.items.filter(item => item.poItemId === poItem.id);
      return sum + grnItems.reduce((itemSum, grnItem) => itemSum + grnItem.acceptedQuantity, 0);
    }, 0);

    if (totalReceived < poItem.quantity) {
      return false;
    }
  }

  return true;
}
