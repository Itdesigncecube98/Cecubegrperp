export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const tender = await prisma.tender.findUnique({
      where: { id },
      include: {
        evaluations: true,
        documents: true,
        boqItems: true,
        costing: true,
        bids: true,
        approvals: true,
        submission: true,
        result: true,
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
        owner: { select: { id: true, name: true } }
      }
    });

    if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    return NextResponse.json(tender);
  } catch (error) {
    console.error('Error fetching tender details:', error);
    return NextResponse.json({ error: 'Failed to fetch tender' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const currentTender = await prisma.tender.findUnique({ where: { id } });
    if (!currentTender) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const tender = await prisma.tender.update({
      where: { id },
      data: {
        status: body.status !== undefined ? body.status : undefined,
        tenderValue: body.tenderValue !== undefined ? parseFloat(body.tenderValue) : undefined,
      }
    });

    // Log the change
    if (body.status && body.status !== currentTender.status) {
        await prisma.tenderAuditLog.create({
            data: {
                tenderId: id,
                action: 'StatusChanged',
                oldValue: currentTender.status,
                newValue: body.status,
                remarks: body.remarks || 'Status updated via API',
                userId: body.userId
            }
        });
    }

    return NextResponse.json(tender);
  } catch (error) {
    console.error('Error updating tender:', error);
    return NextResponse.json({ error: error.message || 'Failed to update tender' }, { status: 500 });
  }
}
