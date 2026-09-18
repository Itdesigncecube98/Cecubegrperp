export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { amount, postJournal } from '@/lib/accounting';

export async function GET(req) {
  try {
    const grns = await prisma.gRN.findMany({
      include: {
        po: { 
          select: { poNo: true, vendor: { select: { name: true } } } 
        },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(grns);
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    return NextResponse.json({ error: 'Failed to fetch GRNs' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const count = await prisma.gRN.count();
    const grnNo = body.grnNo || `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const grn = await prisma.gRN.create({
      data: {
        grnNo,
        grnDate: body.grnDate ? new Date(body.grnDate) : new Date(),
        poId: body.poId,
        challanNo: body.challanNo,
        vehicleNo: body.vehicleNo,
        receivedBy: body.receivedBy,
        status: 'Received',
        items: {
          create: body.items.map(item => ({
            item: item.item,
            poItemId: item.poItemId || null,
            poQuantity: parseFloat(item.poQuantity) || 0,
            receivedQty: parseFloat(item.receivedQty) || 0,
            acceptedQty: 0,
            rejectedQty: 0
          }))
        }
      },
      include: {
        items: true
      }
    });

    const po = await prisma.purchaseOrder.findUnique({ where: { id: body.poId }, include: { vendor: true } });
    if (po?.status === 'Approved') {
      await prisma.$transaction(async (tx) => {
        const total = amount(po.totalValue);
        await postJournal(tx, {
          voucherNo: `PO-${po.id}-PURCHASE`, type: 'Purchase',
          narration: `Purchase received against ${po.poNo}`, project: po.project,
          entries: [
            { ledger: 'Material Purchases', ledgerType: 'Expense', type: 'Dr', amount: total },
            { ledger: `Vendor Payable - ${po.vendor.name}`, ledgerType: 'Liability', type: 'Cr', amount: total }
          ]
        });
        await postJournal(tx, {
          voucherNo: `PO-${po.id}-PAYMENT`, type: 'Payment',
          narration: `Payment made for received purchase order ${po.poNo}`, project: po.project,
          entries: [
            { ledger: `Vendor Payable - ${po.vendor.name}`, ledgerType: 'Liability', type: 'Dr', amount: total },
            { ledger: 'Cash / Bank', ledgerType: 'Asset', type: 'Cr', amount: total }
          ]
        });
        await tx.purchaseOrder.update({ where: { id: body.poId }, data: { status: 'Paid' } });
      });
    } else {
      await prisma.purchaseOrder.update({ where: { id: body.poId }, data: { status: 'Delivered' } });
    }

    return NextResponse.json(grn, { status: 201 });
  } catch (error) {
    console.error('Error creating GRN:', error);
    return NextResponse.json({ error: error.message || 'Failed to create GRN' }, { status: 500 });
  }
}
