export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { getEmployeeGrantedLegacyProjectIds } from '@/lib/projectAccess';

const number = value => {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const amountDelta = change => {
  if (!change || typeof change !== 'object') return 0;
  return number(change.new) - number(change.old);
};

const dateKey = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const monthKey = value => dateKey(value).slice(0, 7);

function inDateRange(value, from, to) {
  const key = dateKey(value);
  return Boolean(key && (!from || key >= from) && (!to || key <= to));
}

function displayProject(project) {
  return {
    id: project.id,
    name: project.name,
    company: project.company,
    location: project.state,
    status: project.status || 'Planning',
    startDate: project.startDate,
    completionDate: project.endDate,
    builtUpArea: number(project.builtUpArea),
    saleableArea: number(project.saleableArea),
  };
}

export async function GET(request) {
  const session = readAuthSession(request);
  if (!session) return NextResponse.json({ error: 'Please sign in to view the engineering dashboard.' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const selectedProjectId = searchParams.get('projectId') || 'ALL';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const allowedIds = session.type === 'employee'
      ? await getEmployeeGrantedLegacyProjectIds(prisma, session.id)
      : null;

    const projects = await prisma.project.findMany({
      where: allowedIds ? { id: { in: allowedIds } } : {},
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, company: true, state: true, status: true,
        builtUpArea: true, saleableArea: true, startDate: true, endDate: true,
      },
    });
    if (selectedProjectId !== 'ALL' && !projects.some(project => project.id === selectedProjectId)) {
      return NextResponse.json({ error: 'Project not found or access denied.' }, { status: 404 });
    }

    const selectedProjects = selectedProjectId === 'ALL'
      ? projects
      : projects.filter(project => project.id === selectedProjectId);
    const projectIds = selectedProjects.map(project => project.id);
    if (!projectIds.length) {
      return NextResponse.json({
        projects: projects.map(displayProject), selectedProjectId, fromDate, toDate,
        totals: { approved: 0, estimated: 0, allocated: 0, expended: 0, materialRequired: 0, materialApproved: 0 },
        budgetByHead: [], monthlyMovement: [], estimateVersions: [],
        consumptionHistory: [], wbsGroups: [], materialPerArea: [],
        materialRequisitions: [], projectSummary: [],
      });
    }

    const [budgetTasks, wbsGroups, wbsTasks, requisitions] = await Promise.all([
      prisma.projectWbsTask.findMany({
        where: { projectId: { in: projectIds } },
        select: {
          id: true, projectId: true, taskName: true, budgetHeadCategory: true, wbsGroupId: true, wbsTaskId: true,
          approvedAmount: true, estimateAmount: true, allocatedAmount: true,
          expendedAmount: true, updatedAt: true,
          budgetHistories: { select: { id: true, changes: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
        },
      }),
      prisma.wbsGroup.findMany({
        where: { projectId: { in: projectIds } },
        select: { id: true, projectId: true, name: true, reraStage: true, tasks: { select: { id: true, name: true, materialAmount: true, labourAmount: true, totalAmount: true, volOfWorkMaterial: true, volOfWorkLabour: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.wbsTask.findMany({
        where: { projectId: { in: projectIds } },
        select: { id: true, projectId: true, groupId: true, name: true, materialAmount: true, labourAmount: true, totalAmount: true, volOfWorkMaterial: true, volOfWorkLabour: true },
      }),
      prisma.requisition.findMany({
        where: { projectId: { in: projectIds } },
        select: { id: true, projectId: true, date: true, material: true, unit: true, reqQty: true, appQty: true, status: true },
      }),
    ]);

    // WBS group rows carry the rolled-up budget. Their child task rows are
    // detail-only, so including both would double count a project's totals.
    const budgetRowsByProject = new Map();
    for (const projectId of projectIds) {
      const projectRows = budgetTasks.filter(task => task.projectId === projectId);
      const groupRows = projectRows.filter(task => task.wbsGroupId && !task.wbsTaskId);
      const projectRow = projectRows.find(task => !task.wbsGroupId && !task.wbsTaskId);
      budgetRowsByProject.set(projectId, groupRows.length ? groupRows : (projectRow ? [projectRow] : []));
    }
    const budgetSummaryRows = [...budgetRowsByProject.values()].flat();

    const totals = budgetSummaryRows.reduce((result, task) => {
      result.approved += number(task.approvedAmount);
      result.estimated += number(task.estimateAmount);
      result.allocated += number(task.allocatedAmount);
      result.expended += number(task.expendedAmount);
      return result;
    }, { approved: 0, estimated: 0, allocated: 0, expended: 0 });

    const heads = new Map();
    for (const task of budgetSummaryRows) {
      const name = task.budgetHeadCategory?.trim() || 'Uncategorised';
      const item = heads.get(name) || { name, approved: 0, estimated: 0, actual: 0 };
      item.approved += number(task.approvedAmount);
      item.estimated += number(task.estimateAmount);
      item.actual += number(task.expendedAmount);
      heads.set(name, item);
    }
    const budgetByHead = [...heads.values()].sort((a, b) => b.approved - a.approved);

    const historyEvents = budgetSummaryRows.flatMap(task => (task.budgetHistories || []).map(history => ({
      taskId: task.id,
      taskName: task.taskName,
      projectId: task.projectId,
      date: history.createdAt,
      changes: history.changes && typeof history.changes === 'object' ? history.changes : {},
    }))).sort((a, b) => new Date(a.date) - new Date(b.date));

    const monthlyMap = new Map();
    const consumptionMap = new Map();
    for (const event of historyEvents) {
      if (!inDateRange(event.date, fromDate, toDate)) continue;
      const month = monthKey(event.date);
      if (!month) continue;
      const monthly = monthlyMap.get(month) || { month, allocated: 0, estimated: 0, expended: 0 };
      const allocationDelta = amountDelta(event.changes.allocatedAmount);
      const estimateDelta = amountDelta(event.changes.estimateAmount);
      const expendedDelta = amountDelta(event.changes.expendedAmount);
      monthly.allocated += allocationDelta;
      monthly.estimated += estimateDelta;
      monthly.expended += expendedDelta;
      monthlyMap.set(month, monthly);
      if (event.changes.expendedAmount) {
        const consumption = consumptionMap.get(month) || { month, allocated: 0, released: 0, consumed: 0 };
        consumption.consumed += expendedDelta;
        consumptionMap.set(month, consumption);
      }
      if (event.changes.allocatedAmount) {
        const consumption = consumptionMap.get(month) || { month, allocated: 0, released: 0, consumed: 0 };
        consumption.allocated += Math.max(0, allocationDelta);
        consumption.released += Math.max(0, -allocationDelta);
        consumptionMap.set(month, consumption);
      }
    }
    const monthlyMovement = [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month));
    const consumptionHistory = [...consumptionMap.values()].sort((a, b) => a.month.localeCompare(b.month));

    const allEstimateEvents = historyEvents.filter(event => event.changes.estimateAmount);
    const estimateOpening = totals.estimated - allEstimateEvents.reduce((sum, event) => sum + amountDelta(event.changes.estimateAmount), 0);
    const versionMap = new Map();
    for (const event of allEstimateEvents) {
      const day = dateKey(event.date);
      if (!day) continue;
      versionMap.set(day, (versionMap.get(day) || 0) + amountDelta(event.changes.estimateAmount));
    }
    const sortedVersions = [...versionMap.entries()].sort(([a], [b]) => a.localeCompare(b));
    const initialEstimate = estimateOpening + sortedVersions
      .filter(([date]) => fromDate && date < fromDate)
      .reduce((sum, [, delta]) => sum + delta, 0);
    let estimateRunning = initialEstimate;
    const estimateVersions = [{ version: fromDate ? 'Opening balance' : 'Baseline', date: fromDate || '', estimatedCost: estimateRunning }];
    sortedVersions.forEach(([date, delta], index) => {
      estimateRunning += delta;
      if (inDateRange(date, fromDate, toDate)) {
        estimateVersions.push({ version: `Revision ${index + 1}`, date, estimatedCost: estimateRunning });
      }
    });
    if (estimateVersions.length === 1 && totals.estimated > 0) {
      estimateVersions.push({ version: 'Current estimate', date: '', estimatedCost: totals.estimated });
    }

    const groupMap = new Map(wbsGroups.map(group => [group.id, group]));
    const groupTotals = new Map();
    for (const task of wbsTasks) {
      const group = groupMap.get(task.groupId);
      const name = group?.name || 'Ungrouped';
      const row = groupTotals.get(name) || { name, material: 0, labour: 0, estimatedCost: 0, materialQty: 0, labourQty: 0, taskCount: 0 };
      row.material += number(task.materialAmount);
      row.labour += number(task.labourAmount);
      row.estimatedCost += number(task.totalAmount) || number(task.materialAmount) + number(task.labourAmount);
      row.materialQty += number(task.volOfWorkMaterial);
      row.labourQty += number(task.volOfWorkLabour);
      row.taskCount += 1;
      groupTotals.set(name, row);
    }
    const wbsGroupData = [...groupTotals.values()].sort((a, b) => b.estimatedCost - a.estimatedCost);

    const areaByProject = new Map(selectedProjects.map(project => [project.id, number(project.builtUpArea)]));
    const materialTotals = new Map();
    for (const group of wbsGroups) {
      const row = materialTotals.get(group.name) || { name: group.name, quantity: 0, projectIds: new Set() };
      row.quantity += group.tasks.reduce((sum, task) => sum + number(task.volOfWorkMaterial), 0);
      row.projectIds.add(group.projectId);
      materialTotals.set(group.name, row);
    }
    const materialPerArea = [...materialTotals.values()].map(item => ({
      name: item.name,
      quantity: item.quantity,
      area: [...item.projectIds].reduce((sum, id) => sum + (areaByProject.get(id) || 0), 0),
    })).map(item => ({
      ...item,
      quantityPerSqFt: item.area > 0 ? item.quantity / item.area : null,
    })).sort((a, b) => b.quantity - a.quantity);

    const requisitionMap = new Map();
    let materialRequired = 0;
    let materialApproved = 0;
    for (const item of requisitions) {
      if (!inDateRange(item.date, fromDate, toDate)) continue;
      const name = item.material?.trim() || 'Unspecified material';
      const key = `${name}|${item.unit || ''}`;
      const row = requisitionMap.get(key) || { name, unit: item.unit || '', requested: 0, approved: 0, requests: 0 };
      const requested = number(item.reqQty);
      const approved = number(item.appQty);
      row.requested += requested;
      row.approved += approved;
      row.requests += 1;
      materialRequired += requested;
      materialApproved += approved;
      requisitionMap.set(key, row);
    }
    const materialRequisitions = [...requisitionMap.values()].sort((a, b) => b.requested - a.requested).slice(0, 20);

    const projectSummary = selectedProjects.map(project => {
      const projectBudget = budgetRowsByProject.get(project.id) || [];
      const projectWbs = wbsTasks.filter(task => task.projectId === project.id);
      const approved = projectBudget.reduce((sum, task) => sum + number(task.approvedAmount), 0);
      const estimated = projectBudget.reduce((sum, task) => sum + number(task.estimateAmount), 0);
      const expended = projectBudget.reduce((sum, task) => sum + number(task.expendedAmount), 0);
      return {
        ...displayProject(project),
        approved, estimated, expended,
        progressPct: approved > 0 ? Math.min(100, Math.round(expended / approved * 100)) : null,
        taskCount: projectWbs.length,
      };
    });

    return NextResponse.json({
      projects: projects.map(displayProject), selectedProjectId, fromDate, toDate,
      totals: { ...totals, materialRequired, materialApproved },
      budgetByHead, monthlyMovement, estimateVersions, consumptionHistory,
      wbsGroups: wbsGroupData, materialPerArea, materialRequisitions, projectSummary,
    });
  } catch (error) {
    console.error('Error fetching engineering dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch engineering dashboard data.' }, { status: 500 });
  }
}
