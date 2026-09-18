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

    const po = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: updateData,
      include: {
        items: true,
        grns: true
      }
    });

    return NextResponse.json(po);
  } catch (error) {
    console.error('Error processing vendor payable:', error);
    return NextResponse.json({ error: 'Failed to process vendor payable' }, { status: 500 });
  }
}
