export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';

const counted = rows => {
  const totals = new Map();
  for (const row of rows) {
    const status = String(row.status || 'Unknown').trim() || 'Unknown';
    totals.set(status, (totals.get(status) || 0) + 1);
  }
  return [...totals].map(([status, count]) => ({ status, count }));
};

function flattenTasks(groups, result = []) {
  for (const group of groups || []) {
    result.push(...(group.tasks || []));
    flattenTasks(group.subgroups, result);
  }
  return result;
}

function readSiteTasks(projectId) {
  try {
    const file = path.join(process.cwd(), '.site_task_status', `project_${projectId}.json`);
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return flattenTasks(data.groups).filter(task => task.source === 'Work Order' || task.workOrderId);
  } catch (error) {
    console.warn(`Could not read site task status for ${projectId}:`, error?.message);
    return [];
  }
}

function workSummary(project, legacyProjectId) {
  const tasks = legacyProjectId ? readSiteTasks(legacyProjectId) : [];
  const summary = { projectId: project.id, projectName: project.name, total: tasks.length, completed: 0, inProgress: 0, onHold: 0, pending: 0, completionPercent: 0 };
  let percentTotal = 0;
  for (const task of tasks) {
    const planned = Number(task.plannedQty ?? task.quantity) || 0;
    const done = Number(task.cumulativeQty ?? task.completedQty ?? task.progressQty) || 0;
    const percent = Math.max(0, Math.min(100, Number(task.workPercent ?? (planned > 0 ? (done / planned) * 100 : 0)) || 0));
    percentTotal += percent;
    const status = String(task.status || 'Tentative').toLowerCase();
    if (status === 'hold') summary.onHold += 1;
    else if (status === 'completed' || status === 'closed' || percent >= 100) summary.completed += 1;
    else if (status === 'started' || status === 'in progress' || percent > 0) summary.inProgress += 1;
    else summary.pending += 1;
  }
  summary.completionPercent = tasks.length ? Math.round(percentTotal / tasks.length) : 0;
  return summary;
}

export async function GET(request) {
  try {
    const session = readAuthSession(request);
    if (!session) return NextResponse.json({ error: 'Please sign in to view the Site dashboard.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const requestedProjectId = searchParams.get('projectId') || 'ALL';

    let projects;
    let grantedLegacyIds = null;
    if (session.type === 'employee') {
      const grants = await prisma.employeeProjectToolAccess.findMany({
        where: {
          employeeId: session.id,
          granted: true,
          tool: { is: { module: 'Site', name: 'Site Dashboard' } },
        },
        select: { projectId: true },
      });
      grantedLegacyIds = grants.map(grant => grant.projectId).filter(Boolean);
      const legacyProjects = grantedLegacyIds.length
        ? await prisma.project.findMany({ where: { id: { in: grantedLegacyIds } }, select: { id: true, name: true } })
        : [];
      const legacyNames = legacyProjects.map(project => project.name).filter(Boolean);
      projects = grantedLegacyIds.length
        ? await prisma.projectMaster.findMany({
            where: { OR: [
              { id: { in: grantedLegacyIds } },
              { projectId: { in: grantedLegacyIds.map(id => `PROJECT-${id}`) } },
              ...(legacyNames.length ? [{ name: { in: legacyNames } }] : []),
            ] },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, status: true, projectId: true },
          })
        : [];
    } else {
      projects = await prisma.projectMaster.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, status: true, projectId: true },
      });
    }

    const selectedProject = requestedProjectId === 'ALL'
      ? null
      : projects.find(project => project.id === requestedProjectId);
    if (requestedProjectId !== 'ALL' && !selectedProject) {
      return NextResponse.json({ error: 'Project not found or you do not have Site Dashboard access.' }, { status: 404 });
    }
    const selectedProjects = selectedProject ? [selectedProject] : projects;
    const projectIds = selectedProjects.map(project => project.id);
    if (!projectIds.length) {
      return NextResponse.json({ projects, selectedProjectId: requestedProjectId, projectStatuses: [], dprStatuses: [], requisitionStatuses: [], taskStatuses: [], workCompletion: [], grnPending: [], gtnPending: [] });
    }

    const [dprs, requisitions, grns, gtns] = await Promise.all([
      prisma.siteDPR.findMany({ where: { projectId: { in: projectIds } }, select: { projectId: true, status: true } }),
      prisma.siteMaterialRequisition.findMany({
        where: { projectId: { in: projectIds } },
        select: { id: true, projectId: true, materialName: true, itemDescription: true, quantityReq: true, unit: true, status: true },
      }),
      prisma.siteGRN.findMany({
        where: { projectId: { in: projectIds } },
        select: { projectId: true, status: true, items: { select: { requisitionId: true, acceptedQty: true } } },
      }),
      prisma.siteGTN.findMany({
        where: { projectId: { in: projectIds } },
        select: { id: true, projectId: true, gtnNo: true, status: true, items: { select: { materialName: true, quantity: true, testStatus: true, testResult: true, requisitionId: true, requisition: { select: { materialName: true } } } } },
      }),
    ]);

    const dprStatuses = counted(dprs);
    const requisitionStatuses = counted(requisitions);
    const projectStatuses = counted(selectedProjects.map(project => ({ status: project.status || 'Unknown' })));

    const acceptedByRequisition = new Map();
    for (const grn of grns) {
      if (!['received', 'accepted', 'approved'].includes(String(grn.status || '').toLowerCase())) continue;
      for (const item of grn.items) {
        acceptedByRequisition.set(item.requisitionId, (acceptedByRequisition.get(item.requisitionId) || 0) + (Number(item.acceptedQty) || 0));
      }
    }
    const projectById = new Map(selectedProjects.map(project => [project.id, project.name]));
    const grnPending = requisitions.map(item => {
      const required = Number(item.quantityReq) || 0;
      const accepted = acceptedByRequisition.get(item.id) || 0;
      return {
        key: item.id,
        projectId: item.projectId,
        projectName: projectById.get(item.projectId) || 'Project',
        material: item.materialName || item.itemDescription || 'Material',
        unit: item.unit || '',
        required,
        accepted,
        pending: Math.max(0, required - accepted),
      };
    }).filter(item => item.pending > 0).sort((a, b) => b.pending - a.pending).slice(0, 25);

    const completeGtnStatuses = new Set(['completed', 'approved']);
    const gtnPending = gtns.flatMap(gtn => gtn.items
      .filter(item => {
        const testStatus = String(item.testStatus || item.testResult || '').trim().toLowerCase();
        return testStatus !== 'pass' || !completeGtnStatuses.has(String(gtn.status || '').trim().toLowerCase());
      })
      .map((item, index) => {
        const testStatus = String(item.testStatus || item.testResult || '').trim();
        return {
          key: `${gtn.id}-${index}`,
          projectId: gtn.projectId,
          projectName: projectById.get(gtn.projectId) || 'Project',
          gtnNo: gtn.gtnNo,
          material: item.materialName || item.requisition?.materialName || 'Material',
          quantity: Number(item.quantity) || 0,
          status: testStatus.toLowerCase() !== 'pass' ? (testStatus || 'Pending test') : `GTN ${gtn.status}`,
        };
      }))
      .sort((a, b) => (a.status.toLowerCase().includes('fail') ? -1 : 0) - (b.status.toLowerCase().includes('fail') ? -1 : 0))
      .slice(0, 25);

    const legacyProjects = await prisma.project.findMany({
      where: { name: { in: selectedProjects.map(project => project.name).filter(Boolean) } },
      select: { id: true, name: true },
    });
    const legacyIdByName = new Map(legacyProjects.map(project => [project.name, project.id]));
    for (const project of selectedProjects) {
      const linkedId = project.projectId?.startsWith('PROJECT-') ? project.projectId.slice('PROJECT-'.length) : null;
      if (linkedId && !legacyIdByName.has(project.name)) legacyIdByName.set(project.name, linkedId);
    }
    const workCompletion = selectedProjects.map(project => workSummary(project, legacyIdByName.get(project.name)));
    const allTasks = workCompletion.flatMap(project => [
      { status: 'Completed', count: project.completed },
      { status: 'In Progress', count: project.inProgress },
      { status: 'On Hold', count: project.onHold },
      { status: 'Pending', count: project.pending },
    ]);
    const taskTotals = new Map();
    allTasks.forEach(row => taskTotals.set(row.status, (taskTotals.get(row.status) || 0) + row.count));
    const taskStatuses = [...taskTotals].map(([status, count]) => ({ status, count }));

    return NextResponse.json({
      projects: projects.map(({ id, name, status }) => ({ id, name, status: status || 'Unknown' })),
      selectedProjectId: requestedProjectId,
      projectStatuses,
      dprStatuses,
      requisitionStatuses,
      taskStatuses,
      workCompletion,
      grnPending,
      gtnPending,
      totals: {
        projects: selectedProjects.length,
        dprs: dprs.length,
        requisitions: requisitions.length,
        incompleteGrnMaterials: grnPending.length,
        incompleteGtnMaterials: gtnPending.length,
      },
    });
  } catch (error) {
    console.error('Failed to build Site dashboard:', error);
    return NextResponse.json({ error: 'Failed to load Site dashboard data.' }, { status: 500 });
  }
}
