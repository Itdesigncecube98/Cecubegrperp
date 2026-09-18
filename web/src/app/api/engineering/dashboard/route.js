export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const now = new Date();
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const [projectCount, activeProjects, projectAgg, delayedActivities, dprsToday, manpowerAgg, upcomingMilestones, totalActivities] = await Promise.all([
      prisma.projectMaster.count(),
      prisma.projectMaster.count({ where: { status: 'Active' } }),
      prisma.projectMaster.aggregate({ _sum: { contractValue: true } }),
      prisma.projectActivity.count({ where: { plannedFinish: { lt: now } } }),
      prisma.siteDPR.count({ where: { date: { gte: startOfToday, lt: startOfTomorrow } } }),
      prisma.siteDPR.aggregate({
        where: { date: { gte: startOfToday, lt: startOfTomorrow } },
        _sum: { manpowerPresent: true }
      }),
      prisma.projectActivity.findMany({
        where: { plannedFinish: { gte: now } },
        orderBy: { plannedFinish: 'asc' },
        take: 5,
        select: { id: true, name: true, plannedFinish: true }
      }),
      prisma.projectActivity.count()
    ]);

    const planningVariance = totalActivities > 0 
      ? Math.round(((delayedActivities - totalActivities) / totalActivities) * 100)
      : 0;

    return NextResponse.json({
      totalProjects: projectCount,
      activeProjects: activeProjects,
      totalContractValue: projectAgg._sum.contractValue || 0,
      executedValue: 0,
      billedValue: 0,
      certifiedValue: 0,
      
      planningVariance: planningVariance,
      delayedActivities: delayedActivities,
      
      dprsToday: dprsToday,
      manpowerToday: manpowerAgg._sum.manpowerPresent || 0,
      
      upcomingMilestones: upcomingMilestones.map(m => ({
        id: m.id,
        name: m.name,
        date: m.plannedFinish,
        status: 'Upcoming'
      }))
    });
  } catch (error) {
    console.error('Error fetching engineering dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
