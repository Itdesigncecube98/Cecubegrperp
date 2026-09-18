export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function averageHours(values) {
  if (!values.length) return 0;
  const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
  return total / values.length;
}

function formatDaysHours(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return '0d 0h';
  const totalHours = Math.round(hours);
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  return `${days}d ${remainingHours}h`;
}

export async function GET() {
  try {
    const [leads, opportunities, followups, employees] = await Promise.all([
      prisma.marketingLead.findMany({
        select: {
          id: true,
          leadDate: true,
          leadSource: true,
          leadStatus: true,
          createdAt: true,
          opportunities: {
            select: { id: true, createdAt: true, expectedClosingDate: true, status: true, owner: { select: { id: true, name: true } } }
          },
          followups: {
            select: { id: true, createdAt: true, createdBy: { select: { id: true, name: true } } }
          }
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.marketingOpportunity.findMany({
        select: {
          id: true,
          createdAt: true,
          expectedClosingDate: true,
          status: true,
          owner: { select: { id: true, name: true } },
          lead: { select: { id: true, leadDate: true } },
          followups: { select: { id: true, createdAt: true } }
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.marketingFollowup.findMany({
        select: {
          id: true,
          createdById: true,
          createdBy: { select: { id: true, name: true } },
          createdAt: true,
          leadId: true,
          opportunityId: true,
          activityType: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.employee.findMany({
        select: { id: true, name: true }
      })
    ]);

    const employeeMap = new Map(employees.map((emp) => [emp.id, emp.name]));

    const leadSourceSummary = leads.reduce((acc, lead) => {
      const key = lead.leadSource || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const inquiryBreakdown = Object.entries(leadSourceSummary).map(([name, count]) => ({
      name,
      value: count,
      percentage: leads.length ? (count / leads.length) * 100 : 0,
    }));

    const followupLeaderMap = new Map();
    for (const followup of followups) {
      const ownerName = followup.createdBy?.name || employeeMap.get(followup.createdById) || 'Unknown';
      followupLeaderMap.set(ownerName, (followupLeaderMap.get(ownerName) || 0) + 1);
    }

    const bestPerformers = [...followupLeaderMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const leadDurationHours = [];
    for (const lead of leads) {
      if (!lead.leadDate) continue;
      const created = new Date(lead.createdAt || lead.leadDate).getTime();
      const firstFollowup = lead.followups?.length
        ? new Date(Math.min(...lead.followups.map(f => new Date(f.createdAt).getTime()))).getTime()
        : null;
      if (lead.leadDate && firstFollowup) {
        leadDurationHours.push((firstFollowup - new Date(lead.leadDate).getTime()) / (1000 * 60 * 60));
      }
    }

    const opportunityDurationHours = [];
    for (const opp of opportunities) {
      if (opp.createdAt && opp.expectedClosingDate) {
        opportunityDurationHours.push(
          (new Date(opp.expectedClosingDate).getTime() - new Date(opp.createdAt).getTime()) / (1000 * 60 * 60)
        );
      }
    }

    const closeTimeHours = [];
    for (const opp of opportunities) {
      if (opp.status === 'Won' || opp.status === 'Lost') {
        const start = opp.createdAt ? new Date(opp.createdAt).getTime() : null;
        const end = opp.expectedClosingDate ? new Date(opp.expectedClosingDate).getTime() : null;
        if (start && end) {
          closeTimeHours.push((end - start) / (1000 * 60 * 60));
        }
      }
    }

    const leadCloseTimeHours = [];
    for (const lead of leads) {
      if (!lead.leadDate || !lead.opportunities?.length) continue;
      const firstOpp = lead.opportunities
        .filter((opp) => opp.status === 'Won' || opp.status === 'Lost' || opp.expectedClosingDate)
        .sort((a, b) => new Date(a.createdAt || a.expectedClosingDate) - new Date(b.createdAt || b.expectedClosingDate))[0];
      if (!firstOpp || !firstOpp.expectedClosingDate) continue;
      const diffHours = (new Date(firstOpp.expectedClosingDate).getTime() - new Date(lead.leadDate).getTime()) / (1000 * 60 * 60);
      if (Number.isFinite(diffHours)) {
        leadCloseTimeHours.push(diffHours);
      }
    }

    return NextResponse.json({
      inquiryBreakdown,
      bestPerformers,
      avgLeadDurationHours: averageHours(leadDurationHours),
      avgOpportunityDurationHours: averageHours(opportunityDurationHours),
      avgCloseTimeHours: averageHours(closeTimeHours.length ? closeTimeHours : leadCloseTimeHours),
      totals: {
        leads: leads.length,
        opportunities: opportunities.length,
        won: opportunities.filter((opp) => opp.status === 'Won').length,
        lost: opportunities.filter((opp) => opp.status === 'Lost').length,
        followups: followups.length,
      },
      metrics: {
        avgLeadDuration: formatDaysHours(averageHours(leadDurationHours)),
        avgOpportunityDuration: formatDaysHours(averageHours(opportunityDurationHours)),
        avgCloseTime: formatDaysHours(averageHours(closeTimeHours.length ? closeTimeHours : leadCloseTimeHours)),
      },
      leadDurationHours,
      opportunityDurationHours,
      closeTimeHours,
    });
  } catch (error) {
    console.error('Marketing analytics fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch marketing analytics' }, { status: 500 });
  }
}
