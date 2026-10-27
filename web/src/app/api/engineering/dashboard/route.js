export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const numeric = value => Number(value || 0);
const isCertified = status => String(status || '').toLowerCase() === 'certified';
const isBillable = status => !['draft', 'rejected', 'cancelled', 'canceled'].includes(String(status || '').toLowerCase());

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedProjectId = searchParams.get('projectId');
    const projects = await prisma.projectMaster.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        projectId: true,
        name: true,
        location: true,
        status: true,
        contractValue: true,
        startDate: true,
        completionDate: true
      }
    });

    if (selectedProjectId && selectedProjectId !== 'ALL' && !projects.some(project => project.id === selectedProjectId)) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const selectedProjects = selectedProjectId && selectedProjectId !== 'ALL'
      ? projects.filter(project => project.id === selectedProjectId)
      : projects;
    const projectIds = selectedProjects.map(project => project.id);

    if (!projectIds.length) {
      return NextResponse.json({
        projects,
        selectedProjectId: selectedProjectId || 'ALL',
        activeProjects: 0,
        totalProjects: 0,
        delayedActivities: 0,
        dprsToday: 0,
        manpowerToday: 0,
        overallProgressPct: null,
        financials: { contractValue: 0, certifiedValue: 0, billedValue: 0, netPayable: 0 },
        projectSummary: [],
        upcomingMilestones: []
      });
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const [activities, todayDprs, measurementBooks, raBills, workOrderBills] = await Promise.all([
      prisma.projectActivity.findMany({
        where: { projectId: { in: projectIds } },
        select: {
          id: true,
          projectId: true,
          name: true,
          quantity: true,
          weightage: true,
          plannedFinish: true,
          dprItems: { select: { actualQty: true } }
        }
      }),
      prisma.siteDPR.findMany({
        where: { projectId: { in: projectIds }, date: { gte: startOfToday, lt: startOfTomorrow } },
        select: { projectId: true, manpowerPresent: true }
      }),
      prisma.projectMB.findMany({
        where: { projectId: { in: projectIds } },
        select: { projectId: true, status: true, items: { select: { amount: true } } }
      }),
      prisma.projectRABill.findMany({
        where: { projectId: { in: projectIds } },
        select: { projectId: true, currentBill: true, netPayable: true, status: true }
      }),
      prisma.workOrderRABill.findMany({
        where: { projectId: { in: projectIds } },
        select: { projectId: true, currentBill: true, netPayable: true, status: true }
      })
    ]);

    const byProject = new Map(selectedProjects.map(project => [project.id, {
      contractValue: numeric(project.contractValue),
      certifiedValue: 0,
      billedValue: 0,
      netPayable: 0,
      progressWeightedSum: 0,
      progressWeightTotal: 0,
      activityCount: 0,
      delayedActivities: 0,
      manpowerToday: 0,
      dprsToday: 0
    }]));

    for (const activity of activities) {
      const metrics = byProject.get(activity.projectId);
      if (!metrics) continue;
      const plannedQuantity = numeric(activity.quantity);
      const actualQuantity = activity.dprItems.reduce((sum, item) => sum + numeric(item.actualQty), 0);
      metrics.activityCount += 1;
      if (plannedQuantity > 0) {
        const progressPct = Math.min(100, actualQuantity / plannedQuantity * 100);
        const weight = numeric(activity.weightage) > 0 ? numeric(activity.weightage) : 1;
        metrics.progressWeightedSum += progressPct * weight;
        metrics.progressWeightTotal += weight;
      }
      if (activity.plannedFinish && activity.plannedFinish < now && plannedQuantity > 0 && actualQuantity < plannedQuantity) {
        metrics.delayedActivities += 1;
      }
    }

    for (const dpr of todayDprs) {
      const metrics = byProject.get(dpr.projectId);
      if (!metrics) continue;
      metrics.dprsToday += 1;
      metrics.manpowerToday += numeric(dpr.manpowerPresent);
    }

    for (const book of measurementBooks) {
      if (!isCertified(book.status)) continue;
      const metrics = byProject.get(book.projectId);
      if (metrics) metrics.certifiedValue += book.items.reduce((sum, item) => sum + numeric(item.amount), 0);
    }

    for (const bill of [...raBills, ...workOrderBills]) {
      if (!isBillable(bill.status)) continue;
      const metrics = byProject.get(bill.projectId);
      if (!metrics) continue;
      metrics.billedValue += numeric(bill.currentBill);
      metrics.netPayable += numeric(bill.netPayable);
    }

    const projectSummary = selectedProjects.map(project => {
      const metrics = byProject.get(project.id);
      const { progressWeightedSum, progressWeightTotal, ...summaryMetrics } = metrics;
      return {
        id: project.id,
        projectId: project.projectId,
        name: project.name,
        location: project.location,
        status: project.status,
        completionDate: project.completionDate,
        ...summaryMetrics,
        physicalProgressPct: progressWeightTotal > 0
          ? Math.round(progressWeightedSum / progressWeightTotal)
          : null
      };
    });

    const activityProgress = activities.reduce((result, activity) => {
      const plannedQuantity = numeric(activity.quantity);
      if (plannedQuantity <= 0) return result;
      const actualQuantity = activity.dprItems.reduce((sum, item) => sum + numeric(item.actualQty), 0);
      const weight = numeric(activity.weightage) > 0 ? numeric(activity.weightage) : 1;
      result.weightedProgress += Math.min(100, actualQuantity / plannedQuantity * 100) * weight;
      result.totalWeight += weight;
      return result;
    }, { weightedProgress: 0, totalWeight: 0 });

    const upcomingMilestones = activities
      .filter(activity => activity.plannedFinish && activity.plannedFinish >= startOfToday)
      .sort((a, b) => a.plannedFinish - b.plannedFinish)
      .slice(0, 6)
      .map(activity => ({
        id: activity.id,
        name: activity.name,
        projectName: selectedProjects.find(project => project.id === activity.projectId)?.name || '',
        date: activity.plannedFinish
      }));

    const financials = projectSummary.reduce((result, project) => {
      result.contractValue += project.contractValue;
      result.certifiedValue += project.certifiedValue;
      result.billedValue += project.billedValue;
      result.netPayable += project.netPayable;
      return result;
    }, { contractValue: 0, certifiedValue: 0, billedValue: 0, netPayable: 0 });

    return NextResponse.json({
      projects,
      selectedProjectId: selectedProjectId || 'ALL',
      totalProjects: selectedProjects.length,
      activeProjects: selectedProjects.filter(project => ['active', 'in progress'].includes(String(project.status || '').toLowerCase())).length,
      delayedActivities: projectSummary.reduce((sum, project) => sum + project.delayedActivities, 0),
      dprsToday: todayDprs.length,
      manpowerToday: todayDprs.reduce((sum, dpr) => sum + numeric(dpr.manpowerPresent), 0),
      overallProgressPct: activityProgress.totalWeight > 0
        ? Math.round(activityProgress.weightedProgress / activityProgress.totalWeight)
        : null,
      financials,
      projectSummary,
      upcomingMilestones
    });
  } catch (error) {
    console.error('Error fetching engineering dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data.' }, { status: 500 });
  }
}
