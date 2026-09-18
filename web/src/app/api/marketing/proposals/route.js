export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const opportunityId = searchParams.get('opportunityId');

    let where = {};
    if (opportunityId) where.opportunityId = opportunityId;

    const proposals = await prisma.marketingProposal.findMany({
      where,
      include: {
        opportunity: { 
           select: { id: true, lead: { select: { projectName: true } }, client: { select: { companyName: true } } } 
        },
        negotiations: { orderBy: { round: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(proposals);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json({ error: 'Failed to fetch proposals' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    
    if (!body.opportunityId) {
      return NextResponse.json({ error: 'Opportunity ID is required' }, { status: 400 });
    }

    const proposal = await prisma.marketingProposal.create({
      data: {
        opportunityId: body.opportunityId,
        estimatedCost: parseFloat(body.estimatedCost),
        quotedAmount: parseFloat(body.quotedAmount),
        margin: body.margin ? parseFloat(body.margin) : null,
        discount: body.discount ? parseFloat(body.discount) : null,
        finalAmount: parseFloat(body.finalAmount),
        paymentTerms: body.paymentTerms,
        deliveryTerms: body.deliveryTerms,
        validity: body.validity ? new Date(body.validity) : null,
        status: body.status || 'Draft'
      }
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    console.error('Error creating proposal:', error);
    return NextResponse.json({ error: error.message || 'Failed to create proposal' }, { status: 500 });
  }
}
