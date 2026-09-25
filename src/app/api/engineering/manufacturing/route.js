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

function getManufacturingPath(projectId) {
  ensureStorageDir();
  return path.join(STORAGE_DIR, `manufacturing_orders_${projectId}.json`);
}

function generateInitialOrders(projectId, project) {
  const now = new Date();
  const d1 = new Date(now.getTime() - 10 * 86400000).toISOString();
  const d2 = new Date(now.getTime() - 4 * 86400000).toISOString();
  const d3 = new Date(now.getTime() + 12 * 86400000).toISOString();

  const orders = [
    {
      id: 'WO-MFG-101',
      orderNumber: 'WO-2026-FAB-01',
      projectId,
      projectName: project?.name || 'Project',
      assemblyName: '33KV Outdoor Busduct Trunking Section (3m)',
      category: 'Busduct Assembly',
      targetQty: 24,
      completedQty: 18,
      unit: 'Sections',
      stage: 'Assembly & Wiring',
      stagesProgress: { cutting: true, fabrication: true, assembly: true, fatTesting: false, dispatched: false },
      assignedEngineer: 'Deepak Saxena',
      startDate: d1,
      targetDate: d3,
      status: 'In Progress',
      bom: [
        { material: 'Electrolytic Copper Busbar 100x10mm', qty: '144 Mtr', unit: 'Mtr' },
        { material: 'Epoxy Insulator 33KV', qty: '48 Nos', unit: 'Nos' },
        { material: 'GI Enclosure Sheet 2mm', qty: '72 Sqm', unit: 'Sqm' }
      ],
      remarks: 'Primary feeder busduct section fabrication for switchyard'
    },
    {
      id: 'WO-MFG-102',
      orderNumber: 'WO-2026-PNL-02',
      projectId,
      projectName: project?.name || 'Project',
      assemblyName: 'Main LT Distribution Control Panel (Form 4b)',
      category: 'Control Panels',
      targetQty: 4,
      completedQty: 4,
      unit: 'Panels',
      stage: 'FAT Testing & Inspection',
      stagesProgress: { cutting: true, fabrication: true, assembly: true, fatTesting: true, dispatched: false },
      assignedEngineer: 'Kavita Menon',
      startDate: d2,
      targetDate: d3,
      status: 'Quality Cleared',
      bom: [
        { material: 'Air Circuit Breaker 1600A 4P', qty: '4 Nos', unit: 'Nos' },
        { material: 'Digital Multifunction Energy Meter', qty: '8 Nos', unit: 'Nos' },
        { material: 'Control Wiring Copper 1.5mm', qty: '500 Mtr', unit: 'Mtr' }
      ],
      remarks: 'Factory acceptance test passed. Awaiting site dispatch clearance.'
    }
  ];

  const data = {
    projectId,
    projectName: project?.name,
    lastUpdated: new Date().toISOString(),
    orders
  };

  const filePath = getManufacturingPath(projectId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

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
        orders: [],
        stats: { totalOrders: 0, completedOrders: 0, inProgressOrders: 0 }
      });
    }

    const currentProject = projects.find(p => p.id === targetProjectId);
    const filePath = getManufacturingPath(targetProjectId);

    let data = null;
    if (fs.existsSync(filePath)) {
      try { data = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (_) {}
    }

    if (!data || !Array.isArray(data.orders)) {
      data = generateInitialOrders(targetProjectId, currentProject);
    }

    const orders = data.orders || [];

    return NextResponse.json({
      companies,
      projects,
      selectedProjectId: targetProjectId,
      currentProject,
      orders,
      stats: {
        totalOrders: orders.length,
        completedOrders: orders.filter(o => o.status === 'Completed' || o.status === 'Quality Cleared').length,
        inProgressOrders: orders.filter(o => o.status === 'In Progress').length
      }
    });
  } catch (error) {
    console.error('Error in manufacturing GET:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { projectId, assemblyName, category, targetQty, unit, assignedEngineer, targetDate, remarks } = body;

    if (!projectId || !assemblyName || !targetQty) {
      return NextResponse.json({ error: 'Project ID, Assembly Name, and Target Qty are required' }, { status: 400 });
    }

    const filePath = getManufacturingPath(projectId);
    let data = { projectId, orders: [] };
    if (fs.existsSync(filePath)) {
      try { data = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (_) {}
    }
    if (!Array.isArray(data.orders)) data.orders = [];

    const now = new Date();
    const newOrder = {
      id: `WO-MFG-${Date.now().toString().slice(-4)}`,
      orderNumber: `WO-${now.getFullYear()}-FAB-${data.orders.length + 1}`,
      projectId,
      assemblyName: assemblyName.trim(),
      category: category || 'Custom Assembly',
      targetQty: Number(targetQty) || 1,
      completedQty: 0,
      unit: unit || 'Nos',
      stage: 'Cutting & Fabrication',
      stagesProgress: { cutting: true, fabrication: false, assembly: false, fatTesting: false, dispatched: false },
      assignedEngineer: assignedEngineer || 'Manufacturing Supervisor',
      startDate: now.toISOString(),
      targetDate: targetDate || now.toISOString(),
      status: 'In Progress',
      bom: body.bom || [],
      remarks: remarks || 'New manufacturing work order released'
    };

    data.orders.unshift(newOrder);
    data.lastUpdated = now.toISOString();

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true, order: newOrder, count: data.orders.length });
  } catch (error) {
    console.error('Error in manufacturing POST:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { projectId, orderId, completedQty, stage, status } = body;

    if (!projectId || !orderId) {
      return NextResponse.json({ error: 'Project ID and Order ID are required' }, { status: 400 });
    }

    const filePath = getManufacturingPath(projectId);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Orders not found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const order = (data.orders || []).find(o => o.id === orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (completedQty !== undefined) order.completedQty = Number(completedQty);
    if (stage) order.stage = stage;
    if (status) order.status = status;
    data.lastUpdated = new Date().toISOString();

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Error in manufacturing PUT:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
