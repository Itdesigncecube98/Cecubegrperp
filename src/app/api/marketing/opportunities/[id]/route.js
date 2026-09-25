export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const opportunity = await prisma.marketingOpportunity.findUnique({
      where: { id },
      include: {
        lead: true,
        client: true,
        owner: { select: { id: true, name: true } },
        proposals: {
            include: { negotiations: { orderBy: { round: 'asc' } } },
            orderBy: { createdAt: 'desc' }
        },
        followups: {
            include: { createdBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    return NextResponse.json(opportunity);
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunity' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const opportunity = await prisma.marketingOpportunity.update({
      where: { id },
      data: {
        estimatedValue: body.estimatedValue !== undefined ? parseFloat(body.estimatedValue) : undefined,
        probabilityPercent: body.probabilityPercent !== undefined ? parseFloat(body.probabilityPercent) : undefined,
        expectedClosingDate: body.expectedClosingDate ? new Date(body.expectedClosingDate) : undefined,
        salesStage: body.salesStage,
        ownerId: body.ownerId,
        competitor: body.competitor,
        status: body.status,
        lostReason: body.lostReason,
        documents: body.documents !== undefined ? body.documents : undefined
      }
    });

    return NextResponse.json(opportunity);
  } catch (error) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json({ error: error.message || 'Failed to update opportunity' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await prisma.marketingOpportunity.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Opportunity deleted successfully' });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    return NextResponse.json({ error: 'Failed to delete opportunity' }, { status: 500 });
  }
}
