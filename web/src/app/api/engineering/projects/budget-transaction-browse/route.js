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

function getTransactionsPath(projectId) {
  ensureStorageDir();
  return path.join(STORAGE_DIR, `budget_txns_${projectId}.json`);
}

function generateInitialTransactions(projectId, project, tasks) {
  const now = new Date();
  const txns = [];
  let txnCounter = 5001;

  const vendors = [
    'L&T Construction Materials Ltd',
    'Polycab Electricals India Pvt Ltd',
    'UltraTech Cement Supply Co',
    'Tata Steel Infrastructure Ltd',
    'Schneider Power Solutions',
    'Voltas MEP Contractors'
  ];

  tasks.forEach((t, i) => {
    const area = t.approvedBuiltUpArea || 1;
    const baseAmt = t.approvedAmount || 50000;
    const allocAmt = t.allocatedAmount || (baseAmt * 0.85);
    const expAmt = t.expendedAmount || (baseAmt * 0.45);

    // Txn 1: Initial Baseline Allocation
    const d1 = new Date(now.getTime() - (30 - i * 3) * 86400000).toISOString();
    txns.push({
      id: `TXN-${txnCounter++}`,
      voucherNo: `VCH-${8000 + txnCounter}`,
      projectId,
      projectName: project?.name || 'Project',
      company: project?.company || 'Company',
      taskId: t.id,
      taskName: t.taskName,
      category: t.budgetHeadCategory || 'Civil & Structural',
      type: 'Budget Allocation',
      direction: 'CREDIT',
      amount: Math.round(allocAmt),
      vendor: 'Internal Head Office Allocation',
      reference: `BGT-APPR-${project?.name?.slice(0, 4).toUpperCase() || 'PROJ'}-01`,
      date: d1,
      approvedBy: 'Director of Finance',
      status: 'Approved',
      remarks: 'Baseline budget allocation ceiling approved for execution'
    });

    // Txn 2: Material / Contractor Expenditure
    if (expAmt > 0) {
      const d2 = new Date(now.getTime() - (15 - i * 2) * 86400000).toISOString();
      txns.push({
        id: `TXN-${txnCounter++}`,
        voucherNo: `VCH-${8000 + txnCounter}`,
        projectId,
        projectName: project?.name || 'Project',
        company: project?.company || 'Company',
        taskId: t.id,
        taskName: t.taskName,
        category: t.budgetHeadCategory || 'Electrical Works',
        type: 'Expenditure / Payment',
        direction: 'DEBIT',
        amount: Math.round(expAmt),
        vendor: vendors[i % vendors.length],
        reference: `PO-2026-${4000 + i}`,
        date: d2,
        approvedBy: 'Project Manager & Sr. Accounts Officer',
        status: 'Reconciled',
        remarks: `Running bill RA-${i + 1} certified against material delivery`
      });
    }

    // Txn 3: Recent Imprest or Advance
    const d3 = new Date(now.getTime() - (4 - i) * 86400000).toISOString();
    txns.push({
      id: `TXN-${txnCounter++}`,
      voucherNo: `VCH-${8000 + txnCounter}`,
      projectId,
      projectName: project?.name || 'Project',
      company: project?.company || 'Company',
      taskId: t.id,
      taskName: t.taskName,
      category: t.budgetHeadCategory || 'Site Logistics',
      type: 'Site Imprest Advance',
      direction: 'DEBIT',
      amount: Math.round(15000 + (i * 4500)),
      vendor: 'Site Office Petty Cash Head',
      reference: `IMP-ADV-${100 + i}`,
      date: d3,
      approvedBy: 'Site In-charge',
      status: 'Approved',
      remarks: 'Local crane mobilization and labour overtime disbursement'
    });
  });

  // Sort descending by date
  txns.sort((a, b) => new Date(b.date) - new Date(a.date));

  const data = {
    projectId,
    projectName: project?.name,
    company: project?.company,
    lastUpdated: new Date().toISOString(),
    transactions: txns
  };

  const filePath = getTransactionsPath(projectId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const typeFilter = searchParams.get('type');

    const [companies, projects] = await Promise.all([
      prisma.company.findMany({ orderBy: { name: 'asc' } }),
      prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
    ]);

    const targetProjectId = projectId && projectId !== 'ALL' ? projectId : (projects.length > 0 ? projects[0].id : null);

    if (!targetProjectId) {
      return NextResponse.json({
        companies,
        projects,
        transactions: [],
        stats: { totalTxns: 0, totalCredits: 0, totalDebits: 0, netBalance: 0 }
      });
    }

    const currentProject = projects.find(p => p.id === targetProjectId);
    const tasks = await prisma.projectWbsTask.findMany({ where: { projectId: targetProjectId } });

    const filePath = getTransactionsPath(targetProjectId);
    let data = null;

    if (fs.existsSync(filePath)) {
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (_) {}
    }

    if (!data || !Array.isArray(data.transactions)) {
      data = generateInitialTransactions(targetProjectId, currentProject, tasks);
    }

    let txns = data.transactions || [];

    // Fetch actual budget revision history from Prisma
    const histories = await prisma.projectWbsBudgetHistory.findMany({
      where: {
        task: { projectId: targetProjectId }
      },
      include: {
        task: { select: { taskName: true, budgetHeadCategory: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const historyTxns = histories.map(h => {
      // Create a summary of changes
      const changes = h.changes || {};
      let remarks = 'Budget Revision';
      const keys = Object.keys(changes);
      if (keys.length > 0) {
        remarks = keys.map(k => {
          const oldV = changes[k].old;
          const newV = changes[k].new;
          return `${k}: ${oldV} -> ${newV}`;
        }).join(', ');
      }

      return {
        id: h.id,
        voucherNo: `REV-${h.id.slice(-6).toUpperCase()}`,
        projectId: targetProjectId,
        projectName: currentProject?.name || 'Project',
        company: currentProject?.company || 'Company',
        taskId: h.projectWbsTaskId,
        taskName: h.task.taskName,
        category: h.task.budgetHeadCategory || 'Revision',
        type: 'Budget Revision',
        direction: 'CREDIT', // Revisions are tracked as credits or informative
        amount: 0, // They don't change net balance directly in this view, just history
        vendor: 'System',
        reference: `REV-${new Date(h.createdAt).getTime().toString().slice(-6)}`,
        date: h.createdAt,
        approvedBy: 'System (Auto-Tracked)',
        status: 'Recorded',
        remarks: remarks
      };
    });

    // Combine simulated txns with actual budget revisions
    txns = [...historyTxns, ...txns];
    if (typeFilter && typeFilter !== 'ALL') {
      txns = txns.filter(t => t.type === typeFilter);
    }

    const totalCredits = txns.filter(t => t.direction === 'CREDIT').reduce((s, t) => s + (t.amount || 0), 0);
    const totalDebits = txns.filter(t => t.direction === 'DEBIT').reduce((s, t) => s + (t.amount || 0), 0);

    return NextResponse.json({
      companies,
      projects,
      selectedProjectId: targetProjectId,
      currentProject,
      transactions: txns,
      stats: {
        totalTxns: txns.length,
        totalCredits,
        totalDebits,
        netBalance: totalCredits - totalDebits
      }
    });
  } catch (error) {
    console.error('Error in budget transaction browse GET:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { projectId, taskName, type, direction, amount, vendor, reference, remarks, approvedBy } = body;

    if (!projectId || !amount) {
      return NextResponse.json({ error: 'Project ID and Amount are required' }, { status: 400 });
    }

    const filePath = getTransactionsPath(projectId);
    let data = { projectId, transactions: [] };
    if (fs.existsSync(filePath)) {
      try { data = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (_) {}
    }
    if (!Array.isArray(data.transactions)) data.transactions = [];

    const now = new Date();
    const newTxn = {
      id: `TXN-${5000 + data.transactions.length + 1}`,
      voucherNo: `VCH-${9000 + data.transactions.length + 1}`,
      projectId,
      taskName: taskName || 'General Project Budget',
      category: body.category || 'General Operations',
      type: type || 'Expenditure / Payment',
      direction: direction || 'DEBIT',
      amount: Number(amount) || 0,
      vendor: vendor || 'Vendor / Contractor',
      reference: reference || `REF-${Date.now().toString().slice(-6)}`,
      date: now.toISOString(),
      approvedBy: approvedBy || 'Finance Controller',
      status: 'Approved',
      remarks: remarks || 'Manual budget transaction entry'
    };

    data.transactions.unshift(newTxn);
    data.lastUpdated = now.toISOString();

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true, transaction: newTxn, count: data.transactions.length });
  } catch (error) {
    console.error('Error in budget transaction browse POST:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
