export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.planning_data');

function getProjectLockStoragePath(projectId) {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  return path.join(STORAGE_DIR, `project_budget_lock_${projectId}.json`);
}

function readLockConfig(projectId) {
  const filePath = getProjectLockStoragePath(projectId);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      console.error('Error reading lock config', err);
    }
  }
  return {
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    remarks: '',
    policies: {
      lockApprovedBudget: true,
      blockNewTasks: true,
      freezeRates: true,
      strictDiscrepancy: true
    },
    history: []
  };
}

function writeLockConfig(projectId, config) {
  const filePath = getProjectLockStoragePath(projectId);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const tasks = await prisma.projectWbsTask.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' }
    });

    let approvedTotal = 0;
    let allocatedTotal = 0;
    let expendedTotal = 0;

    tasks.forEach(t => {
      approvedTotal += (t.approvedAmount || 0);
      allocatedTotal += (t.allocatedAmount || 0);
      expendedTotal += (t.expendedAmount || 0);
    });

    const unallocatedTotal = Math.max(0, approvedTotal - allocatedTotal);
    const lockConfig = readLockConfig(projectId);

    return NextResponse.json({
      summary: {
        approvedTotal,
        allocatedTotal,
        expendedTotal,
        unallocatedTotal,
        taskCount: tasks.length
      },
      lockConfig,
      tasks
    });

  } catch (error) {
    console.error('Error fetching budget lock status:', error);
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const data = await req.json();
    const { projectId, isLocked, lockedDate, lockedBy, remarks, policies } = data;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Update ProjectWbsTask isLocked status for all tasks in this project
    await prisma.projectWbsTask.updateMany({
      where: { projectId },
      data: { isLocked: isLocked }
    });

    const currentConfig = readLockConfig(projectId);
    
    const newConfig = {
      isLocked,
      lockedAt: lockedDate || new Date().toISOString(),
      lockedBy: lockedBy || 'Admin',
      remarks: remarks || '',
      policies: policies || currentConfig.policies,
      history: [
        {
          id: `h-${Date.now()}`,
          date: lockedDate || new Date().toISOString(),
          action: isLocked ? 'Project Budget Locked' : 'Project Budget Unlocked',
          user: lockedBy || 'Admin',
          remarks: remarks || ''
        },
        ...(currentConfig.history || [])
      ]
    };

    writeLockConfig(projectId, newConfig);

    return NextResponse.json({ success: true, lockConfig: newConfig });
  } catch (error) {
    console.error('Error updating budget lock:', error);
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
}
