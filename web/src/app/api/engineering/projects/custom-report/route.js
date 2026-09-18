export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.planning_data');

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const company = searchParams.get('company');
    const reportType = searchParams.get('reportType') || 'BUDGET_VS_ACTUAL';

    const [companies, projects] = await Promise.all([
      prisma.company.findMany({ orderBy: { name: 'asc' } }),
      prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
    ]);

    const targetProjectId = projectId && projectId !== 'ALL' ? projectId : null;

    let whereTask = {};
    if (targetProjectId) {
      whereTask.projectId = targetProjectId;
    }

    const tasks = await prisma.projectWbsTask.findMany({
      where: whereTask,
      include: {
        project: {
          select: { id: true, name: true, company: true, status: true, builtUpArea: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Filter by company if requested
    const filteredTasks = company && company !== 'ALL'
      ? tasks.filter(t => t.project?.company?.toLowerCase() === company.toLowerCase())
      : tasks;

    let reportRows = [];
    let summary = {
      totalApproved: 0,
      totalAllocated: 0,
      totalEstimate: 0,
      totalExpended: 0,
      totalVariance: 0,
      rowCount: 0
    };

    if (reportType === 'BUDGET_VS_ACTUAL') {
      reportRows = filteredTasks.map(t => {
        const approved = Number(t.approvedAmount) || 0;
        const allocated = Number(t.allocatedAmount) || 0;
        const expended = Number(t.expendedAmount) || 0;
        const variance = approved - expended;
        const variancePct = approved > 0 ? ((variance / approved) * 100).toFixed(1) : 0;
        const burnRate = approved > 0 ? ((expended / approved) * 100).toFixed(1) : 0;

        summary.totalApproved += approved;
        summary.totalAllocated += allocated;
        summary.totalExpended += expended;
        summary.totalVariance += variance;

        return {
          id: t.id,
          project: t.project?.name || 'Project',
          company: t.project?.company || 'Company',
          taskName: t.taskName,
          category: t.budgetHeadCategory || 'Civil Works',
          area: t.approvedBuiltUpArea || 1,
          approvedAmount: approved,
          allocatedAmount: allocated,
          expendedAmount: expended,
          varianceAmount: variance,
          variancePct: `${variancePct}%`,
          burnRate: `${burnRate}%`,
          status: expended > approved ? 'Over Budget' : expended > 0 ? 'In Progress' : 'Planned'
        };
      });
    } else if (reportType === 'MATERIAL_SCHEDULE') {
      // Pull material rates and tasks
      const sampleMaterials = [
        { name: 'Portland Pozzolana Cement', unit: 'Bag', stdRate: 380, projRate: 395, requiredQty: 1200 },
        { name: 'Steel Binding Wire', unit: 'Kg', stdRate: 68, projRate: 70, requiredQty: 850 },
        { name: '25mm PVC Conduit Pipe', unit: 'Mtr', stdRate: 45, projRate: 48, requiredQty: 3200 },
        { name: 'Copper Wire 1.5mm FR', unit: 'Mtr', stdRate: 28, projRate: 30, requiredQty: 4500 },
        { name: 'Solid Concrete Block 150mm', unit: 'Nos', stdRate: 75, projRate: 78, requiredQty: 6000 }
      ];

      reportRows = sampleMaterials.map((m, idx) => {
        const estCost = m.projRate * m.requiredQty;
        const stdCost = m.stdRate * m.requiredQty;
        summary.totalEstimate += estCost;
        summary.totalApproved += stdCost;

        return {
          id: `mat-rep-${idx}`,
          project: targetProjectId ? (projects.find(p => p.id === targetProjectId)?.name || 'Project') : 'All Projects',
          company: company || 'All Companies',
          taskName: m.name,
          category: 'Material Procurement',
          unit: m.unit,
          requiredQty: m.requiredQty,
          benchmarkRate: m.stdRate,
          projectRate: m.projRate,
          totalEstimatedCost: estCost,
          procurementVariance: estCost - stdCost,
          status: 'Procurement Scheduled'
        };
      });
    } else {
      // General Task Variance
      reportRows = filteredTasks.map(t => {
        const appRate = Number(t.approvedRate) || 0;
        const estRate = Number(t.estimateRate) || appRate;
        const diff = estRate - appRate;

        summary.totalApproved += Number(t.approvedAmount) || 0;
        summary.totalEstimate += Number(t.estimateAmount) || 0;

        return {
          id: t.id,
          project: t.project?.name || 'Project',
          company: t.project?.company || 'Company',
          taskName: t.taskName,
          category: t.budgetHeadCategory || 'General',
          approvedRate: appRate,
          estimateRate: estRate,
          rateVariance: diff,
          rateVariancePct: appRate > 0 ? `${(((diff) / appRate) * 100).toFixed(1)}%` : '0%',
          status: diff > 0 ? 'Escalated' : diff < 0 ? 'Discounted' : 'On Par'
        };
      });
    }

    summary.rowCount = reportRows.length;

    return NextResponse.json({
      companies,
      projects,
      reportType,
      selectedProjectId: targetProjectId || 'ALL',
      summary,
      reportRows
    });
  } catch (error) {
    console.error('Error in custom report GET:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
