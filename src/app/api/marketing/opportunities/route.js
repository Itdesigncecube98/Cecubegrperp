export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const ownerId = searchParams.get('ownerId');

    let where = {};
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;

    const opportunities = await prisma.marketingOpportunity.findMany({
      where,
      include: {
        lead: { select: { id: true, leadId: true, projectName: true, requirement: true } },
        client: { select: { id: true, companyName: true, contactPerson: true } },
        owner: { select: { id: true, name: true } },
        proposals: {
            orderBy: { createdAt: 'desc' },
            take: 1
        },
        followups: {
            include: { createdBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(opportunities);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const opportunity = await prisma.marketingOpportunity.create({
      data: {
        leadId: body.leadId,
        clientId: body.clientId,
        estimatedValue: parseFloat(body.estimatedValue),
        probabilityPercent: parseFloat(body.probabilityPercent),
        expectedClosingDate: new Date(body.expectedClosingDate),
        salesStage: body.salesStage,
        ownerId: body.ownerId,
        competitor: body.competitor,
        status: body.status || 'Open',
        documents: Array.isArray(body.documents) ? body.documents : null
      }
    });

    // If opportunity created, update lead status to Opportunity
    if (opportunity.leadId) {
      await prisma.marketingLead.update({
        where: { id: opportunity.leadId },
        data: { leadStatus: 'Opportunity' }
      });
    }

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    console.error('Error creating opportunity:', error);
    return NextResponse.json({ error: error.message || 'Failed to create opportunity' }, { status: 500 });
  }
}
