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

function getImportHistoryPath(projectId) {
  ensureStorageDir();
  return path.join(STORAGE_DIR, `import_history_${projectId}.json`);
}

function isProjectLocked(projectId) {
  try {
    const lockPath = path.join(STORAGE_DIR, `project_budget_lock_${projectId}.json`);
    if (fs.existsSync(lockPath)) {
      const config = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      return config.isLocked === true;
    }
  } catch (_) {}
  return false;
}

// GET: Fetch project tasks, companies, and import/export logs
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const [companies, projects] = await Promise.all([
      prisma.company.findMany({ orderBy: { name: 'asc' } }),
      prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
    ]);

    const targetProjectId = projectId && projectId !== 'ALL' ? projectId : (projects.length > 0 ? projects[0].id : null);

    if (!targetProjectId) {
      return NextResponse.json({
        companies,
        projects,
        tasks: [],
        history: [],
        isLocked: false
      });
    }

    const currentProject = projects.find(p => p.id === targetProjectId);
    const locked = isProjectLocked(targetProjectId);

    const tasks = await prisma.projectWbsTask.findMany({
      where: { projectId: targetProjectId },
      orderBy: { createdAt: 'asc' }
    });

    // Read import history
    const historyPath = getImportHistoryPath(targetProjectId);
    let history = [];
    if (fs.existsSync(historyPath)) {
      try {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      } catch (_) {}
    }

    return NextResponse.json({
      companies,
      projects,
      selectedProjectId: targetProjectId,
      currentProject,
      tasks,
      history,
      isLocked: locked,
      stats: {
        totalTasks: tasks.length,
        approvedTotal: tasks.reduce((sum, t) => sum + (t.approvedAmount || 0), 0),
        estimateTotal: tasks.reduce((sum, t) => sum + (t.estimateAmount || 0), 0),
        importHistoryCount: history.length
      }
    });
  } catch (error) {
    console.error('Error in task import/export GET:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

// POST: Handle imports, bulk uploads, template generation, or exports
export async function POST(req) {
  try {
    const body = await req.json();
    const { action, projectId, tasksToImport, fileName, importedBy } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (isProjectLocked(projectId)) {
      return NextResponse.json({
        error: 'Project budget and tasks are locked. Release lock in Set Budget Lock tool to import tasks.'
      }, { status: 403 });
    }

    if (action === 'IMPORT_TASKS') {
      if (!Array.isArray(tasksToImport) || tasksToImport.length === 0) {
        return NextResponse.json({ error: 'No tasks provided for import' }, { status: 400 });
      }

      const createdTasks = [];
      const now = new Date();

      for (const item of tasksToImport) {
        const taskName = (item.taskName || item['Task Name'] || item.name || '').trim();
        if (!taskName) continue;

        const builtUpArea = parseFloat(item.approvedBuiltUpArea || item['Built Up Area'] || item.builtUpArea || 1) || 1;
        const appRate = parseFloat(item.approvedRate || item['Approved Rate'] || 0) || 0;
        const appAmt = parseFloat(item.approvedAmount || item['Approved Amount'] || (appRate * builtUpArea)) || 0;
        
        const estRate = parseFloat(item.estimateRate || item['Estimate Rate'] || appRate) || 0;
        const estAmt = parseFloat(item.estimateAmount || item['Estimate Amount'] || (estRate * builtUpArea)) || 0;

        const allocRate = parseFloat(item.allocatedRate || item['Allocated Rate'] || 0) || 0;
        const allocAmt = parseFloat(item.allocatedAmount || item['Allocated Amount'] || (allocRate * builtUpArea)) || 0;

        const created = await prisma.projectWbsTask.create({
          data: {
            projectId,
            taskName,
            approvedBuiltUpArea: builtUpArea,
            approvedRate: appRate,
            approvedAmount: appAmt,
            allocatedRate: allocRate,
            allocatedAmount: allocAmt,
            allocatedEstimateRate: estRate,
            allocatedEstimateAmount: estAmt,
            unallocatedRate: appRate > allocRate ? appRate - allocRate : 0,
            unallocatedAmount: appAmt > allocAmt ? appAmt - allocAmt : 0,
            estimateRate: estRate,
            estimateAmount: estAmt,
            expendedRate: 0,
            expendedAmount: 0,
            budgetHeadCategory: item.budgetHeadCategory || item['Category'] || 'Civil & Structural',
            remark: item.remark || item['Remarks'] || 'Imported via Task Import Export Tool'
          }
        });

        createdTasks.push(created);
      }

      // Record to import history
      const historyPath = getImportHistoryPath(projectId);
      let history = [];
      if (fs.existsSync(historyPath)) {
        try {
          history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
        } catch (_) {}
      }

      const historyEntry = {
        id: `imp-${Date.now()}`,
        fileName: fileName || 'Tasks_Upload.csv',
        importedAt: now.toISOString(),
        formattedDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        importedBy: importedBy || 'Site Engineer',
        count: createdTasks.length,
        status: 'Successful'
      };

      history.unshift(historyEntry);
      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');

      return NextResponse.json({
        success: true,
        importedCount: createdTasks.length,
        historyEntry
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error in task import/export POST:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
