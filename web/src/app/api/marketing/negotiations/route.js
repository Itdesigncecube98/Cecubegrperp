export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req) {
  try {
    const body = await req.json();
    
    if (!body.proposalId) {
      return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 });
    }

    const negotiation = await prisma.marketingNegotiation.create({
      data: {
        proposalId: body.proposalId,
        round: parseInt(body.round),
        clientOffer: parseFloat(body.clientOffer),
        companyOffer: parseFloat(body.companyOffer),
        discount: body.discount ? parseFloat(body.discount) : null,
        finalOffer: body.finalOffer ? parseFloat(body.finalOffer) : null,
        status: body.status || 'Negotiation'
      }
    });

    return NextResponse.json(negotiation, { status: 201 });
  } catch (error) {
    console.error('Error creating negotiation:', error);
    return NextResponse.json({ error: error.message || 'Failed to create negotiation' }, { status: 500 });
  }
}
