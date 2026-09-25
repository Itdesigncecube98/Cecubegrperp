export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const opportunityId = searchParams.get('opportunityId');

    let where = {};
    if (opportunityId) where.opportunityId = opportunityId;

    const tenders = await prisma.marketingTender.findMany({
      where,
      include: {
        opportunity: { select: { id: true, lead: { select: { projectName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(tenders);
  } catch (error) {
    console.error('Error fetching tenders:', error);
    return NextResponse.json({ error: 'Failed to fetch tenders' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    
    if (!body.opportunityId) {
      return NextResponse.json({ error: 'Opportunity ID is required' }, { status: 400 });
    }

    const tender = await prisma.marketingTender.create({
      data: {
        opportunityId: body.opportunityId,
        referenceNo: body.referenceNo,
        status: body.status || 'Draft'
      }
    });

    return NextResponse.json(tender, { status: 201 });
  } catch (error) {
    console.error('Error creating tender:', error);
    return NextResponse.json({ error: error.message || 'Failed to create tender' }, { status: 500 });
  }
}
