export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');
    const opportunityId = searchParams.get('opportunityId');

    let where = {};
    if (leadId) where.leadId = leadId;
    if (opportunityId) where.opportunityId = opportunityId;

    const followups = await prisma.marketingFollowup.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(followups);
  } catch (error) {
    console.error('Error fetching followups:', error);
    return NextResponse.json({ error: 'Failed to fetch followups' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    
    if (!body.createdById) {
      return NextResponse.json({ error: 'Created By ID is required' }, { status: 400 });
    }
    if (!body.leadId && !body.opportunityId) {
      return NextResponse.json({ error: 'Either Lead ID or Opportunity ID is required' }, { status: 400 });
    }

    const followup = await prisma.marketingFollowup.create({
      data: {
        leadId: body.leadId || null,
        opportunityId: body.opportunityId || null,
        activityType: body.activityType,
        discussion: body.discussion,
        commitment: body.commitment,
        statusChangeDate: body.statusChangeDate ? new Date(body.statusChangeDate) : null,
        references: body.references?.trim() || null,
        nextFollowUpDate: body.nextFollowUpDate ? new Date(body.nextFollowUpDate) : null,
        nextAction: body.nextAction,
        createdById: body.createdById
      },
      include: {
        createdBy: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(followup, { status: 201 });
  } catch (error) {
    console.error('Error creating followup:', error);
    return NextResponse.json({ error: error.message || 'Failed to create followup' }, { status: 500 });
  }
}
