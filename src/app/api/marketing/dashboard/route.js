export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    // Basic counts
    const totalLeads = await prisma.marketingLead.count();
    const qualifiedLeads = await prisma.marketingLead.count({ where: { leadStatus: 'Approved' } });

    // Lead Sources Aggregation
    const leadsBySource = await prisma.marketingLead.groupBy({
        by: ['leadSource'],
        _count: { leadSource: true }
    });

    const leadsByStatus = await prisma.marketingLead.groupBy({
        by: ['leadStatus'],
        _count: { leadStatus: true }
    });

    return NextResponse.json({
      totalLeads,
      qualifiedLeads,
      leadsBySource,
        leadsByStatus: leadsByStatus.map(({ leadStatus, _count }) => ({
          stage: leadStatus,
          count: _count.leadStatus,
        })),
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
