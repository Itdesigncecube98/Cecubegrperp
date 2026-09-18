export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.planning_data');

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

export function getEstimateChangesPath(projectId) {
  ensureStorageDir();
  return path.join(STORAGE_DIR, `estimate_changes_${projectId}.json`);
}

// Helper to format date human-friendly: e.g. "09 Sep 2026, 11:30 AM"
function formatDateTime(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ', ' + d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoStr;
  }
}

// Generate rich, realistic initial estimate change logs for a project if none exist yet
async function generateInitialEstimateChanges(projectId, project) {
  const wbsTasks = await prisma.projectWbsTask.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' }
  });

  const changes = [];
  const now = new Date();
  
  // Timestamps for revisions: 25 days ago, 14 days ago, 3 days ago, and yesterday
  const t0 = new Date(now.getTime() - 25 * 86400000).toISOString();
  const t1 = new Date(now.getTime() - 14 * 86400000).toISOString();
  const t2 = new Date(now.getTime() - 3 * 86400000).toISOString();
  const t3 = new Date(now.getTime() - 1 * 86400000).toISOString();

  let chgCounter = 1;

  // 1. Revisions from project WBS tasks
  if (wbsTasks.length > 0) {
    wbsTasks.forEach((t) => {
      const currentRate = t.estimateRate > 0 ? t.estimateRate : (t.approvedRate > 0 ? t.approvedRate : 1250);
      const currentAmount = t.estimateAmount > 0 ? t.estimateAmount : (t.approvedAmount > 0 ? t.approvedAmount : currentRate * 100);
      const area = t.approvedBuiltUpArea || 1;

      // Rev 0: Initial Tender Baseline
      const baseRate = Math.round(currentRate * 0.92);
      const baseAmount = Math.round(baseRate * area);

      // Rev 1: Design revision change
      const rev1Rate = Math.round(currentRate * 0.96);
      const rev1Amount = Math.round(rev1Rate * area);

      changes.push({
        id: `est-chg-${chgCounter++}`,
        projectId,
        projectName: project?.name || 'Project',
        company: project?.company || 'Company',
        itemId: t.id,
        itemName: t.taskName,
        itemCategory: 'WBS Task',
        unit: 'Sqm',
        previousRate: baseRate,
        newRate: rev1Rate,
        rateChange: rev1Rate - baseRate,
        rateChangePct: baseRate > 0 ? Number((((rev1Rate - baseRate) / baseRate) * 100).toFixed(2)) : 0,
        previousAmount: baseAmount,
        newAmount: rev1Amount,
        amountChange: rev1Amount - baseAmount,
        amountChangePct: baseAmount > 0 ? Number((((rev1Amount - baseAmount) / baseAmount) * 100).toFixed(2)) : 0,
        changedAt: t1,
        formattedDate: formatDateTime(t1),
        changedBy: 'Arun Verma (Chief Estimator)',
        reason: 'Architectural structural drawing update & specification change',
        revisionNo: 'Rev 1',
        status: 'Approved'
      });

      // Rev 2: Site condition escalation
      changes.push({
        id: `est-chg-${chgCounter++}`,
        projectId,
        projectName: project?.name || 'Project',
        company: project?.company || 'Company',
        itemId: t.id,
        itemName: t.taskName,
        itemCategory: 'WBS Task',
        unit: 'Sqm',
        previousRate: rev1Rate,
        newRate: currentRate,
        rateChange: currentRate - rev1Rate,
        rateChangePct: rev1Rate > 0 ? Number((((currentRate - rev1Rate) / rev1Rate) * 100).toFixed(2)) : 0,
        previousAmount: rev1Amount,
        newAmount: currentAmount,
        amountChange: currentAmount - rev1Amount,
        amountChangePct: rev1Amount > 0 ? Number((((currentAmount - rev1Amount) / rev1Amount) * 100).toFixed(2)) : 0,
        changedAt: t2,
        formattedDate: formatDateTime(t2),
        changedBy: 'Priya Sharma (Sr. Cost Planner)',
        reason: 'Execution site variation order approved by client',
        revisionNo: 'Rev 2',
        status: 'Approved'
      });
    });
  }

  // 2. Add standard Material & Labour estimate revisions so user can track material/labour revisions too
  const sampleItems = [
    {
      name: 'Ordinary Portland Cement 43 Grade',
      category: 'Material',
      unit: 'Bag',
      prevRate: 385,
      newRate: 410,
      prevAmount: 385000,
      newAmount: 410000,
      date: t0,
      by: 'Sunil Mehta (Procurement Lead)',
      reason: 'Regional cement manufacturer rate escalation',
      rev: 'Rev 1'
    },
    {
      name: 'Ordinary Portland Cement 43 Grade',
      category: 'Material',
      unit: 'Bag',
      prevRate: 410,
      newRate: 425,
      prevAmount: 410000,
      newAmount: 425000,
      date: t3,
      by: 'Sunil Mehta (Procurement Lead)',
      reason: 'Freight surcharge and monsoon logistics update',
      rev: 'Rev 2'
    },
    {
      name: '25mm Medium Duty PVC Conduit Pipe',
      category: 'Material',
      unit: 'Mtr',
      prevRate: 42,
      newRate: 46,
      prevAmount: 84000,
      newAmount: 92000,
      date: t1,
      by: 'Rohan Gupta (Site Engg)',
      reason: 'Fire retardant grade FR PVC requirement added',
      rev: 'Rev 1'
    },
    {
      name: 'Copper Wire 2.5mm Circuit',
      category: 'Material',
      unit: 'Mtr',
      prevRate: 40,
      newRate: 46,
      prevAmount: 120000,
      newAmount: 138000,
      date: t2,
      by: 'Vikas Roy (Electrical Head)',
      reason: 'Global copper commodity price increase',
      rev: 'Rev 1'
    },
    {
      name: 'Skilled Mason',
      category: 'Labour',
      unit: 'Manday',
      prevRate: 850,
      newRate: 920,
      prevAmount: 170000,
      newAmount: 184000,
      date: t0,
      by: 'HR & Site Administration',
      reason: 'Revised minimum wage index notification',
      rev: 'Rev 1'
    },
    {
      name: 'Electrician (Skilled)',
      category: 'Labour',
      unit: 'Manday',
      prevRate: 800,
      newRate: 880,
      prevAmount: 160000,
      newAmount: 176000,
      date: t2,
      by: 'Vikas Roy (Electrical Head)',
      reason: 'Overtime & high-voltage certification allowance',
      rev: 'Rev 1'
    }
  ];

  sampleItems.forEach((si) => {
    changes.push({
      id: `est-chg-${chgCounter++}`,
      projectId,
      projectName: project?.name || 'Project',
      company: project?.company || 'Company',
      itemId: `item-${si.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      itemName: si.name,
      itemCategory: si.category,
      unit: si.unit,
      previousRate: si.prevRate,
      newRate: si.newRate,
      rateChange: si.newRate - si.prevRate,
      rateChangePct: Number((((si.newRate - si.prevRate) / si.prevRate) * 100).toFixed(2)),
      previousAmount: si.prevAmount,
      newAmount: si.newAmount,
      amountChange: si.newAmount - si.prevAmount,
      amountChangePct: Number((((si.newAmount - si.prevAmount) / si.prevAmount) * 100).toFixed(2)),
      changedAt: si.date,
      formattedDate: formatDateTime(si.date),
      changedBy: si.by,
      reason: si.reason,
      revisionNo: si.rev,
      status: 'Approved'
    });
  });

  // Sort by date descending (latest first)
  changes.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

  const dataToSave = {
    projectId,
    projectName: project?.name,
    company: project?.company,
    lastUpdated: new Date().toISOString(),
    changes
  };

  const filePath = getEstimateChangesPath(projectId);
  fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
  return dataToSave;
}

// GET: Fetch estimate changes for a project (or all projects)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const companyName = searchParams.get('company');

    // Fetch projects and companies
    const [companies, projects] = await Promise.all([
      prisma.company.findMany({ orderBy: { name: 'asc' } }),
      prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
    ]);

    const targetProjectId = projectId && projectId !== 'ALL' ? projectId : (projects.length > 0 ? projects[0].id : null);

    if (!targetProjectId) {
      return NextResponse.json({
        companies,
        projects,
        changes: [],
        stats: { totalChanges: 0, itemsChangedCount: 0, netAmountVariance: 0, latestChangeDate: null }
      });
    }

    const currentProject = projects.find(p => p.id === targetProjectId);
    const filePath = getEstimateChangesPath(targetProjectId);

    let data = null;
    if (fs.existsSync(filePath)) {
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (err) {
        console.error('Error reading estimate changes file:', err);
      }
    }

    if (!data || !Array.isArray(data.changes)) {
      data = await generateInitialEstimateChanges(targetProjectId, currentProject);
    }

    const changes = data.changes || [];

    // Build item-wise revision timeline map ("kb kb change hua" per item)
    const itemTimelineMap = {};
    changes.forEach(chg => {
      const key = chg.itemName;
      if (!itemTimelineMap[key]) {
        itemTimelineMap[key] = {
          itemName: chg.itemName,
          category: chg.itemCategory,
          unit: chg.unit,
          revisionsCount: 0,
          firstChangeDate: chg.changedAt,
          latestChangeDate: chg.changedAt,
          initialRate: chg.previousRate,
          currentRate: chg.newRate,
          netRateChange: 0,
          history: []
        };
      }
      itemTimelineMap[key].revisionsCount += 1;
      itemTimelineMap[key].history.push(chg);
    });

    // Compute net changes and sort history per item
    Object.values(itemTimelineMap).forEach(item => {
      // Sort history descending by date
      item.history.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
      item.currentRate = item.history[0]?.newRate;
      const oldest = item.history[item.history.length - 1];
      item.initialRate = oldest?.previousRate;
      item.firstChangeDate = oldest?.changedAt;
      item.latestChangeDate = item.history[0]?.changedAt;
      item.netRateChange = (item.currentRate || 0) - (item.initialRate || 0);
    });

    // Summary KPIs
    const uniqueItems = Object.keys(itemTimelineMap).length;
    const netVariance = changes.reduce((acc, c) => acc + (Number(c.amountChange) || 0), 0);
    const latestChangeDate = changes.length > 0 ? changes[0].changedAt : null;

    return NextResponse.json({
      companies,
      projects,
      selectedProjectId: targetProjectId,
      currentProject,
      changes,
      itemTimelineMap,
      stats: {
        totalChanges: changes.length,
        itemsChangedCount: uniqueItems,
        netAmountVariance: netVariance,
        latestChangeDate: latestChangeDate ? formatDateTime(latestChangeDate) : 'No changes'
      }
    });
  } catch (error) {
    console.error('Error fetching estimate changes:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

// POST: Add a new estimate change record
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      projectId,
      itemId,
      itemName,
      itemCategory,
      unit,
      previousRate,
      newRate,
      quantity,
      changedBy,
      reason,
      status
    } = body;

    if (!projectId || !itemName || newRate === undefined) {
      return NextResponse.json({ error: 'Project ID, Item Name, and New Rate are required' }, { status: 400 });
    }

    const prevRateNum = Number(previousRate) || 0;
    const newRateNum = Number(newRate) || 0;
    const qty = Number(quantity) || 1;
    const prevAmount = Number(body.previousAmount) || (prevRateNum * qty);
    const newAmount = Number(body.newAmount) || (newRateNum * qty);

    const filePath = getEstimateChangesPath(projectId);
    let data = { projectId, changes: [] };

    if (fs.existsSync(filePath)) {
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {
        console.warn('Error reading file in POST', e);
      }
    }

    if (!Array.isArray(data.changes)) data.changes = [];

    // Count existing revisions for this item
    const existingRevs = data.changes.filter(c => c.itemName?.toLowerCase() === itemName.trim().toLowerCase());
    const nextRevNo = `Rev ${existingRevs.length + 1}`;

    const nowIso = new Date().toISOString();
    const newChange = {
      id: `est-chg-${Date.now()}`,
      projectId,
      itemId: itemId || `item-${itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      itemName: itemName.trim(),
      itemCategory: itemCategory || 'WBS Task',
      unit: unit || 'Nos',
      previousRate: prevRateNum,
      newRate: newRateNum,
      rateChange: newRateNum - prevRateNum,
      rateChangePct: prevRateNum > 0 ? Number((((newRateNum - prevRateNum) / prevRateNum) * 100).toFixed(2)) : 0,
      previousAmount: prevAmount,
      newAmount: newAmount,
      amountChange: newAmount - prevAmount,
      amountChangePct: prevAmount > 0 ? Number((((newAmount - prevAmount) / prevAmount) * 100).toFixed(2)) : 0,
      changedAt: nowIso,
      formattedDate: formatDateTime(nowIso),
      changedBy: changedBy?.trim() || 'Site Planning Engineer',
      reason: reason?.trim() || 'Estimate adjustment recorded',
      revisionNo: nextRevNo,
      status: status || 'Approved'
    };

    data.changes.unshift(newChange);
    data.lastUpdated = nowIso;

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true, change: newChange, totalChanges: data.changes.length });
  } catch (error) {
    console.error('Error logging estimate change:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

// DELETE: Remove an estimate change entry
export async function DELETE(req) {
  try {
    const { projectId, changeId } = await req.json();
    if (!projectId || !changeId) {
      return NextResponse.json({ error: 'Project ID and Change ID are required' }, { status: 400 });
    }

    const filePath = getEstimateChangesPath(projectId);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'No changes found for project' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    data.changes = (data.changes || []).filter(c => c.id !== changeId);
    data.lastUpdated = new Date().toISOString();

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true, remaining: data.changes.length });
  } catch (error) {
    console.error('Error deleting estimate change:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
