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

function getProjectRatesPath(projectId) {
  ensureStorageDir();
  return path.join(STORAGE_DIR, `project_rates_${projectId}.json`);
}

function getTaskOperationPath(projectId) {
  ensureStorageDir();
  return path.join(STORAGE_DIR, `task_operation_${projectId}.json`);
}

// Generate default material and labour rates for a project based on its tasks & libraries
async function generateDefaultProjectRates(projectId, project) {
  const todayStr = new Date().toISOString().split('T')[0];

  // Try to read existing task operation data to pull project's active materials & labours
  const taskOpPath = getTaskOperationPath(projectId);
  const foundMaterials = new Map();
  const foundLabours = new Map();

  if (fs.existsSync(taskOpPath)) {
    try {
      const taskOpData = JSON.parse(fs.readFileSync(taskOpPath, 'utf8'));
      const collect = (node) => {
        if (!node) return;
        if (node.type === 'task') {
          if (Array.isArray(node.materials)) {
            node.materials.forEach(m => {
              if (m.name && !foundMaterials.has(m.name.trim().toLowerCase())) {
                foundMaterials.set(m.name.trim().toLowerCase(), {
                  name: m.name.trim(),
                  unit: m.unit || 'Nos',
                  rate: m.rate || 0
                });
              }
            });
          }
          if (Array.isArray(node.labours)) {
            node.labours.forEach(l => {
              if (l.name && !foundLabours.has(l.name.trim().toLowerCase())) {
                foundLabours.set(l.name.trim().toLowerCase(), {
                  name: l.name.trim(),
                  unit: l.unit || 'Manday',
                  rate: l.rate || 0
                });
              }
            });
          }
        }
        if (Array.isArray(node.children)) {
          node.children.forEach(collect);
        }
      };
      collect(taskOpData.rootNode);
    } catch (e) {
      console.warn('Error reading task operation file for default rates', e);
    }
  }

  // Pull materials and labours from Material & Labour libraries in DB
  try {
    const dbMaterials = await prisma.materialLibraryItem.findMany({
      include: {
        group: {
          include: { library: true }
        }
      }
    });
    dbMaterials.forEach(dm => {
      const k = (dm.name || '').trim().toLowerCase();
      if (k && !foundMaterials.has(k)) {
        foundMaterials.set(k, {
          name: dm.name.trim(),
          unit: dm.unit || 'Nos',
          rate: 0
        });
      }
    });

    const [dbTaskMaterials, dbTaskLabours] = await Promise.all([
      prisma.taskLibraryMaterial.findMany(),
      prisma.taskLibraryLabour.findMany()
    ]);
    dbTaskMaterials.forEach(tm => {
      const k = (tm.name || '').trim().toLowerCase();
      if (k && !foundMaterials.has(k)) {
        foundMaterials.set(k, {
          name: tm.name.trim(),
          unit: tm.unit || 'Nos',
          rate: 0
        });
      }
    });
    dbTaskLabours.forEach(tl => {
      const k = (tl.name || '').trim().toLowerCase();
      if (k && !foundLabours.has(k)) {
        foundLabours.set(k, {
          name: tl.name.trim(),
          unit: tl.unit || 'Manday',
          rate: 0
        });
      }
    });
  } catch (err) {
    console.warn('Error reading library items from DB in project-wise-rate:', err);
  }

  // Baseline market price benchmark database for materials and labour
  const BENCHMARKS = {
    'portland pozzolana cement': { standard: 380, unit: 'Bag' },
    'ordinary portland cement 43': { standard: 410, unit: 'Bag' },
    'cement opc 43 grade': { standard: 410, unit: 'Bag' },
    'river sand coarse': { standard: 65, unit: 'Bag' },
    '25mm medium duty pvc conduit pipe': { standard: 45, unit: 'Mtr' },
    'laying 25mm pvc conduit in slab': { standard: 95, unit: 'Rmt' },
    'copper wire 1.5mm fr': { standard: 28, unit: 'Mtr' },
    'copper wire 2.5mm circuit': { standard: 46, unit: 'Mtr' },
    'modular switch 6a one-way': { standard: 85, unit: 'Nos' },
    '6a combined socket with shutter': { standard: 135, unit: 'Nos' },
    'deep junction box 25mm': { standard: 32, unit: 'Nos' },
    'solid concrete block 150mm': { standard: 75, unit: 'Nos' },
    'steel binding': { standard: 68, unit: 'Kg' },
    'rcc trench making, size 1500 x 2600': { standard: 1850, unit: 'RM' },
    'electrician (skilled)': { standard: 850, unit: 'Manday' },
    'senior electrician': { standard: 950, unit: 'Manday' },
    'electrician': { standard: 800, unit: 'Manday' },
    'electrical helper': { standard: 550, unit: 'Manday' },
    'skilled mason': { standard: 900, unit: 'Manday' },
    'mason': { standard: 850, unit: 'Manday' },
    'mason helper': { standard: 550, unit: 'Manday' },
    'unskilled labour': { standard: 500, unit: 'Manday' }
  };

  const rates = [];
  let itemCounter = 101;

  // Add Materials
  foundMaterials.forEach(m => {
    const key = m.name.toLowerCase();
    const bench = BENCHMARKS[key] || { standard: 150, unit: m.unit || 'Nos' };
    const std = bench.standard;
    // Project rate: slight realistic variance
    const projRate = Math.round(std * (1 + ((itemCounter % 5) - 2) * 0.03));

    rates.push({
      id: `rate-m-${itemCounter}`,
      itemCode: `MAT-${itemCounter}`,
      name: m.name,
      type: 'Material',
      unit: m.unit || bench.unit || 'Nos',
      standardRate: std,
      projectRate: projRate,
      effectiveDate: todayStr,
      remarks: `Project rate for ${project?.company || 'Company'} site agreement`,
      status: projRate !== std ? 'Custom Project Rate' : 'Standard Rate',
      lastUpdated: new Date().toISOString()
    });
    itemCounter++;
  });

  // If found materials were sparse, add core industry standards
  if (rates.length < 5) {
    const standardMats = [
      { name: 'Portland Pozzolana Cement', unit: 'Bag', std: 380, proj: 395 },
      { name: 'Cement OPC 43 Grade', unit: 'Bag', std: 410, proj: 410 },
      { name: '25mm Medium Duty PVC Conduit Pipe', unit: 'Mtr', std: 45, proj: 48 },
      { name: 'Copper Wire 1.5mm FR', unit: 'Mtr', std: 28, proj: 30 },
      { name: 'Copper Wire 2.5mm Circuit', unit: 'Mtr', std: 46, proj: 46 },
      { name: 'Modular Switch 6A One-Way', unit: 'Nos', std: 85, proj: 82 },
      { name: 'Solid Concrete Block 150mm', unit: 'Nos', std: 75, proj: 78 }
    ];
    standardMats.forEach(sm => {
      if (!rates.some(r => r.name.toLowerCase() === sm.name.toLowerCase())) {
        rates.push({
          id: `rate-m-${itemCounter}`,
          itemCode: `MAT-${itemCounter}`,
          name: sm.name,
          type: 'Material',
          unit: sm.unit,
          standardRate: sm.std,
          projectRate: sm.proj,
          effectiveDate: todayStr,
          remarks: `Standard procurement rate for ${project?.name}`,
          status: sm.std !== sm.proj ? 'Custom Project Rate' : 'Standard Rate',
          lastUpdated: new Date().toISOString()
        });
        itemCounter++;
      }
    });
  }

  // Add Labours
  foundLabours.forEach(l => {
    const key = l.name.toLowerCase();
    const bench = BENCHMARKS[key] || { standard: 650, unit: l.unit || 'Manday' };
    const std = bench.standard;
    const projRate = Math.round(std * (1 + ((itemCounter % 4) - 1) * 0.04));

    rates.push({
      id: `rate-l-${itemCounter}`,
      itemCode: `LAB-${itemCounter}`,
      name: l.name,
      type: 'Labour',
      unit: l.unit || bench.unit || 'Manday',
      standardRate: std,
      projectRate: projRate,
      effectiveDate: todayStr,
      remarks: `Contract wage schedule for ${project?.name}`,
      status: projRate !== std ? 'Custom Project Rate' : 'Standard Rate',
      lastUpdated: new Date().toISOString()
    });
    itemCounter++;
  });

  if (!rates.some(r => r.type === 'Labour')) {
    const standardLabs = [
      { name: 'Skilled Mason', unit: 'Manday', std: 900, proj: 950 },
      { name: 'Electrician (Skilled)', unit: 'Manday', std: 850, proj: 880 },
      { name: 'Electrical Helper', unit: 'Manday', std: 550, proj: 550 },
      { name: 'Unskilled Labour', unit: 'Manday', std: 500, proj: 520 }
    ];
    standardLabs.forEach(sl => {
      rates.push({
        id: `rate-l-${itemCounter}`,
        itemCode: `LAB-${itemCounter}`,
        name: sl.name,
        type: 'Labour',
        unit: sl.unit,
        standardRate: sl.std,
        projectRate: sl.proj,
        effectiveDate: todayStr,
        remarks: `Site labour wage schedule`,
        status: sl.std !== sl.proj ? 'Custom Project Rate' : 'Standard Rate',
        lastUpdated: new Date().toISOString()
      });
      itemCounter++;
    });
  }

  const initialData = {
    projectId,
    projectName: project?.name,
    company: project?.company,
    library: project?.library,
    lastUpdated: new Date().toISOString(),
    rates
  };

  const filePath = getProjectRatesPath(projectId);
  fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), 'utf8');
  return initialData;
}

// GET: Fetch project-wise rates, companies, and projects
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const sync = searchParams.get('sync') === 'true';

    // Fetch all companies and projects for dropdowns
    const [companies, projects] = await Promise.all([
      prisma.company.findMany({ orderBy: { name: 'asc' } }),
      prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
    ]);

    const targetProjectId = projectId || (projects.length > 0 ? projects[0].id : null);

    if (!targetProjectId) {
      return NextResponse.json({
        rates: [],
        companies,
        projects,
        error: 'No projects found in system'
      });
    }

    const currentProject = projects.find(p => p.id === targetProjectId);
    const ratesPath = getProjectRatesPath(targetProjectId);
    let projectRatesData = null;

    if (!sync && fs.existsSync(ratesPath)) {
      try {
        projectRatesData = JSON.parse(fs.readFileSync(ratesPath, 'utf8'));
      } catch (err) {
        console.warn('Could not read project rates file, regenerating', err);
      }
    }

    if (!projectRatesData || !Array.isArray(projectRatesData.rates)) {
      projectRatesData = await generateDefaultProjectRates(targetProjectId, currentProject);
    }

    const rates = projectRatesData.rates || [];
    const materialCount = rates.filter(r => r.type === 'Material').length;
    const labourCount = rates.filter(r => r.type === 'Labour').length;
    const customRateCount = rates.filter(r => Number(r.projectRate) !== Number(r.standardRate)).length;

    return NextResponse.json({
      projectId: targetProjectId,
      projectName: currentProject?.name,
      company: currentProject?.company,
      library: currentProject?.library,
      companies,
      projects,
      rates,
      stats: {
        totalItems: rates.length,
        materialCount,
        labourCount,
        customRateCount
      }
    });
  } catch (error) {
    console.error('Error in Project Wise Rate GET:', error);
    return NextResponse.json({ error: error.message || 'Failed to load project rates' }, { status: 500 });
  }
}

// POST: Update, bulk adjust, or add project-specific rates
export async function POST(req) {
  try {
    const body = await req.json();
    const { action, projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const ratesPath = getProjectRatesPath(projectId);
    let projectRatesData;

    if (fs.existsSync(ratesPath)) {
      try {
        projectRatesData = JSON.parse(fs.readFileSync(ratesPath, 'utf8'));
      } catch (e) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        projectRatesData = await generateDefaultProjectRates(projectId, project);
      }
    } else {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      projectRatesData = await generateDefaultProjectRates(projectId, project);
    }

    // 1. UPDATE SINGLE RATE
    if (action === 'UPDATE_RATE') {
      const { id, projectRate, effectiveDate, remarks } = body;
      const rateItem = projectRatesData.rates.find(r => r.id === id);

      if (!rateItem) {
        return NextResponse.json({ error: 'Rate item not found' }, { status: 404 });
      }

      const numRate = parseFloat(projectRate) || 0;
      rateItem.projectRate = numRate;
      if (effectiveDate) rateItem.effectiveDate = effectiveDate;
      if (remarks !== undefined) rateItem.remarks = remarks;
      rateItem.status = numRate !== Number(rateItem.standardRate) ? 'Custom Project Rate' : 'Standard Rate';
      rateItem.lastUpdated = new Date().toISOString();

      projectRatesData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(ratesPath, JSON.stringify(projectRatesData, null, 2), 'utf8');

      return NextResponse.json({
        success: true,
        message: `Updated rate for "${rateItem.name}" to ₹${numRate}`,
        updatedItem: rateItem,
        rates: projectRatesData.rates
      });
    }

    // 2. BULK ESCALATE / ADJUST RATES BY PERCENTAGE
    if (action === 'BULK_ADJUST') {
      const { percentChange, applyTo = 'ALL' } = body; // 'ALL' | 'MATERIAL' | 'LABOUR'
      const pct = parseFloat(percentChange) || 0;
      let adjustedCount = 0;

      projectRatesData.rates.forEach(r => {
        if (applyTo === 'ALL' || r.type.toUpperCase() === applyTo.toUpperCase()) {
          const newRate = Math.round(Number(r.projectRate) * (1 + pct / 100));
          r.projectRate = newRate;
          r.status = newRate !== Number(r.standardRate) ? 'Custom Project Rate' : 'Standard Rate';
          r.lastUpdated = new Date().toISOString();
          adjustedCount++;
        }
      });

      projectRatesData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(ratesPath, JSON.stringify(projectRatesData, null, 2), 'utf8');

      return NextResponse.json({
        success: true,
        message: `Applied ${pct >= 0 ? '+' : ''}${pct}% adjustment to ${adjustedCount} ${applyTo.toLowerCase()} rate items.`,
        rates: projectRatesData.rates
      });
    }

    // 3. RESET ALL TO STANDARD MASTER RATES
    if (action === 'RESET_TO_MASTER') {
      const { applyTo = 'ALL' } = body;
      let resetCount = 0;

      projectRatesData.rates.forEach(r => {
        if (applyTo === 'ALL' || r.type.toUpperCase() === applyTo.toUpperCase()) {
          r.projectRate = r.standardRate;
          r.status = 'Standard Rate';
          r.lastUpdated = new Date().toISOString();
          resetCount++;
        }
      });

      projectRatesData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(ratesPath, JSON.stringify(projectRatesData, null, 2), 'utf8');

      return NextResponse.json({
        success: true,
        message: `Reset ${resetCount} items to standard baseline rates.`,
        rates: projectRatesData.rates
      });
    }

    // 4. ADD NEW PROJECT RATE ITEM
    if (action === 'ADD_RATE_ITEM') {
      const { name, type = 'Material', unit = 'Nos', standardRate = 0, projectRate = 0, remarks } = body;

      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
      }

      const pRate = parseFloat(projectRate) || 0;
      const sRate = parseFloat(standardRate) || pRate;
      const newItemId = `rate-${Date.now()}`;
      const prefix = type === 'Labour' ? 'LAB' : 'MAT';

      const newItem = {
        id: newItemId,
        itemCode: `${prefix}-${Math.floor(100 + Math.random() * 900)}`,
        name: name.trim(),
        type: type === 'Labour' ? 'Labour' : 'Material',
        unit: unit || 'Nos',
        standardRate: sRate,
        projectRate: pRate,
        effectiveDate: new Date().toISOString().split('T')[0],
        remarks: remarks || `Custom site rate item`,
        status: pRate !== sRate ? 'Custom Project Rate' : 'Standard Rate',
        lastUpdated: new Date().toISOString()
      };

      projectRatesData.rates.unshift(newItem);
      projectRatesData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(ratesPath, JSON.stringify(projectRatesData, null, 2), 'utf8');

      return NextResponse.json({
        success: true,
        message: `Added new ${type.toLowerCase()} rate item "${newItem.name}".`,
        newItem,
        rates: projectRatesData.rates
      });
    }

    // 5. DELETE RATE ITEM
    if (action === 'DELETE_RATE_ITEM') {
      const { id } = body;
      const beforeLen = projectRatesData.rates.length;
      projectRatesData.rates = projectRatesData.rates.filter(r => r.id !== id);

      if (projectRatesData.rates.length === beforeLen) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      projectRatesData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(ratesPath, JSON.stringify(projectRatesData, null, 2), 'utf8');

      return NextResponse.json({
        success: true,
        message: 'Rate item removed from project rate list.',
        rates: projectRatesData.rates
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Error in Project Wise Rate POST:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
