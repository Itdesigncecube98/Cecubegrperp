export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req) {
  try {
    // Purchase Indents (status is plain String on PurchaseIndent)
    const totalPrs = await prisma.purchaseIndent.count();
    const pendingPrs = await prisma.purchaseIndent.count({
      where: { status: 'Pending Approval' }
    });

    // Purchase Orders — status uses POStatus enum
    const openPos = await prisma.purchaseOrder.count({
      where: {
        status: {
          notIn: ['CLOSED', 'CANCELLED']
        }
      }
    });

    // Sum totalAmount (not totalValue — PurchaseOrder uses totalAmount)
    const pos = await prisma.purchaseOrder.findMany({
      select: { totalAmount: true }
    });
    const totalPoValue = pos.reduce((acc, po) => acc + (po.totalAmount || 0), 0);

    // Pending GRNs = POs that are SENT (dispatched but not yet received)
    const pendingGrns = await prisma.purchaseOrder.count({
      where: { status: 'SENT' }
    });

    // Recent Purchase Indents
    const recentPrs = await prisma.purchaseIndent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        requestedBy: { select: { name: true } }
      }
    });

    return NextResponse.json({
      totalPrs,
      pendingPrs,
      openPos,
      totalPoValue,
      pendingGrns,
      recentPrs
    });
  } catch (error) {
    console.error('Error fetching purchase dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
