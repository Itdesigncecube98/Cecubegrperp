import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - List POs pending accounts approval (Vendor Payables)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING_APPROVAL';

    const VALID_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED', 'REJECTED'];
    const where = {};
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    const payables = await prisma.purchaseOrder.findMany({
      where,
      include: {
        items: true,
        grns: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(payables);
  } catch (error) {
    console.error('Error fetching vendor payables:', error);
    return NextResponse.json({ error: 'Failed to fetch vendor payables' }, { status: 500 });
  }
}

// POST - Approve or Reject PO from accounts
export async function POST(request) {
  try {
    const body = await request.json();
    const { poId, action, remarks, approvedById } = body;

    if (!poId || !action) {
      return NextResponse.json({ error: 'PO ID and action are required' }, { status: 400 });
    }

    const updateData = {
      accountsRemarks: remarks || null,
      accountsApprovedById: approvedById || null
    };

    if (action === 'APPROVE') {
      updateData.status = 'APPROVED';
      updateData.accountsApprovedAt = new Date();
    } else if (action === 'REJECT') {
      updateData.status = 'REJECTED';
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = remarks || 'Rejected by accounts';
    } else {
      return NextResponse.json({ error: 'Invalid action. Use APPROVE or REJECT' }, { status: 400 });
    }

    const po = await prisma.$transaction(async tx => {
      const current = await tx.purchaseOrder.findUnique({ where: { id: poId }, select: { id: true, status: true, preparedByName: true } });
      if (!current) throw new Error('Purchase order not found');
      const updated = await tx.purchaseOrder.update({
        where: { id: poId },
        data: updateData,
        include: { items: true, grns: true }
      });
      if (current.status !== updateData.status) {
        await tx.purchaseOrderStatusHistory.create({
          data: {
            purchaseOrderId: poId,
            fromStatus: current.status,
            toStatus: updateData.status,
            actorName: body.approvedByName || body.actorName || approvedById || 'Accounts User',
            note: action === 'APPROVE' ? 'Approved by accounts' : (remarks || 'Rejected by accounts'),
          },
        });
      }
      return updated;
    });

    return NextResponse.json(po);
  } catch (error) {
    console.error('Error processing vendor payable:', error);
    return NextResponse.json({ error: 'Failed to process vendor payable' }, { status: 500 });
  }
}
