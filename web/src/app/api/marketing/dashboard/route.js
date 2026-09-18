export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    // Basic counts
    const totalLeads = await prisma.marketingLead.count();
    const qualifiedLeads = await prisma.marketingLead.count({ where: { leadStatus: 'Approved' } });
    
    const totalOpportunities = await prisma.marketingOpportunity.count();
    const wonOpportunities = await prisma.marketingOpportunity.count({ where: { status: 'Won' } });
    const lostOpportunities = await prisma.marketingOpportunity.count({ where: { status: 'Lost' } });

    // Pipeline Value (weighted value)
    const activeOpps = await prisma.marketingOpportunity.findMany({
        where: { status: 'Open' },
        select: { estimatedValue: true, probabilityPercent: true }
    });
    const pipelineValue = activeOpps.reduce((acc, opp) => acc + (opp.estimatedValue * (opp.probabilityPercent / 100)), 0);

    // Won Value
    const wonOpps = await prisma.marketingOpportunity.findMany({
        where: { status: 'Won' },
        select: { estimatedValue: true }
    });
    const wonValue = wonOpps.reduce((acc, opp) => acc + opp.estimatedValue, 0);

    // Lead Sources Aggregation
    const leadsBySource = await prisma.marketingLead.groupBy({
        by: ['leadSource'],
        _count: { leadSource: true }
    });

    // Funnel Data
    const funnel = [
        { stage: 'Total Leads', count: totalLeads },
        { stage: 'Qualified', count: qualifiedLeads },
        { stage: 'Opportunities', count: totalOpportunities },
        { stage: 'Won', count: wonOpportunities }
    ];

    return NextResponse.json({
      totalLeads,
      qualifiedLeads,
      totalOpportunities,
      wonOpportunities,
      lostOpportunities,
      pipelineValue,
      wonValue,
      leadsBySource,
      funnel
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
