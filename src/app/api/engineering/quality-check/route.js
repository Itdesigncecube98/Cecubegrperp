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

function getQualityDataPath(projectId) {
  ensureStorageDir();
  return path.join(STORAGE_DIR, `quality_check_${projectId}.json`);
}

function generateInitialQualityData(projectId, project) {
  const now = new Date();
  const d1 = new Date(now.getTime() - 5 * 86400000).toISOString();
  const d2 = new Date(now.getTime() - 1 * 86400000).toISOString();

  const checklists = [
    {
      id: 'QC-CHK-01',
      title: '33KV Switchyard Transformer Foundation Pre-Pour Inspection',
      category: 'Civil & Foundation',
      projectId,
      taskName: 'Substation Foundation Concrete',
      inspector: 'Rajesh Kulkarni (QA/QC Lead)',
      date: d1,
      status: 'Passed',
      items: [
        { id: 1, check: 'Soil compaction test density >= 95% MDD', passed: true, remarks: 'Field dry density test certified' },
        { id: 2, check: 'PCC level and thickness verified as per drawing Rev C', passed: true, remarks: 'Thickness 100mm uniform' },
        { id: 3, check: 'Reinforcement bar size, spacing, and cover blocks in place', passed: true, remarks: '50mm concrete cover verified' },
        { id: 4, check: 'Earthing conductor grid embedded and continuity verified', passed: true, remarks: 'Resistance < 1.0 Ohm' },
        { id: 5, check: 'Holding-down foundation bolts center-to-center aligned', passed: true, remarks: 'Tolerance within +/- 2mm' }
      ]
    },
    {
      id: 'QC-CHK-02',
      title: 'HT Cable Laying & Conduit Integrity Inspection',
      category: 'Electrical Works',
      projectId,
      taskName: 'Cable laying and Trenching',
      inspector: 'Amitabh Sen (Electrical QA)',
      date: d2,
      status: 'Action Required',
      items: [
        { id: 1, check: 'Trench depth minimum 1.0m from finished ground level', passed: true, remarks: '1.2m depth verified' },
        { id: 2, check: 'Sand cushioning (75mm bottom and top) provided', passed: true, remarks: 'Sieved sand bed inspected' },
        { id: 3, check: 'Protective warning concrete tiles laid above cable', passed: false, remarks: '30m stretch tiles pending placement' },
        { id: 4, check: 'Cable insulation resistance (Megger test 5KV) recorded', passed: true, remarks: '> 1000 Mega Ohms' },
        { id: 5, check: 'Route marker posts installed at 15m intervals', passed: false, remarks: 'Posts to be fixed after backfilling' }
      ]
    }
  ];

  const inspectionReports = [
    {
      id: 'IR-2026-001',
      reportNumber: 'IR/ELEC/2026/01',
      projectId,
      title: 'Transformer Bay Earthing Grid & Earth Pit Resistance Audit',
      checklistId: 'QC-CHK-01',
      inspector: 'Rajesh Kulkarni',
      inspectionDate: d1,
      result: 'Approved with Minor Remarks',
      punchPoints: [
        { point: 'Earthing pit chamber identification tag to be painted', status: 'Open' },
        { point: 'Bentonite slurry topping completed in Pit #3', status: 'Closed' }
      ],
      clientRepresentative: 'Mr. S.P. Khurana (Client QA Head)',
      signedOff: true
    },
    {
      id: 'IR-2026-002',
      reportNumber: 'IR/CIV/2026/04',
      projectId,
      title: 'Control Room Slab Conduiting & Reinforcement Clearance',
      checklistId: 'QC-CHK-02',
      inspector: 'Amitabh Sen',
      inspectionDate: d2,
      result: 'Conditional Clearance',
      punchPoints: [
        { point: 'Fix missing warning tiles along north-west trench sector', status: 'Open' }
      ],
      clientRepresentative: 'Site Resident Engineer',
      signedOff: false
    }
  ];

  const data = {
    projectId,
    projectName: project?.name,
    lastUpdated: new Date().toISOString(),
    checklists,
    inspectionReports
  };

  const filePath = getQualityDataPath(projectId);
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
        checklists: [],
        inspectionReports: [],
        stats: { totalChecklists: 0, passedCount: 0, pendingCount: 0, totalReports: 0 }
      });
    }

    const currentProject = projects.find(p => p.id === targetProjectId);
    const filePath = getQualityDataPath(targetProjectId);

    let data = null;
    if (fs.existsSync(filePath)) {
      try { data = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (_) {}
    }

    if (!data || !Array.isArray(data.checklists)) {
      data = generateInitialQualityData(targetProjectId, currentProject);
    }

    const checklists = data.checklists || [];
    const inspectionReports = data.inspectionReports || [];

    return NextResponse.json({
      companies,
      projects,
      selectedProjectId: targetProjectId,
      currentProject,
      checklists,
      inspectionReports,
      stats: {
        totalChecklists: checklists.length,
        passedCount: checklists.filter(c => c.status === 'Passed').length,
        pendingCount: checklists.filter(c => c.status !== 'Passed').length,
        totalReports: inspectionReports.length
      }
    });
  } catch (error) {
    console.error('Error in quality check GET:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { type, projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const filePath = getQualityDataPath(projectId);
    let data = { projectId, checklists: [], inspectionReports: [] };
    if (fs.existsSync(filePath)) {
      try { data = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (_) {}
    }

    const now = new Date();

    if (type === 'NEW_CHECKLIST') {
      const newChk = {
        id: `QC-CHK-${Date.now().toString().slice(-4)}`,
        title: body.title || 'Quality Inspection Checklist',
        category: body.category || 'General Quality',
        projectId,
        taskName: body.taskName || 'Project Execution Task',
        inspector: body.inspector || 'Site QA Inspector',
        date: now.toISOString(),
        status: body.status || 'In Progress',
        items: body.items || [
          { id: 1, check: 'Dimensions & alignment verified against approved drawings', passed: true, remarks: 'Verified' },
          { id: 2, check: 'Material test certificates (MTC) received and verified', passed: true, remarks: 'Certified' },
          { id: 3, check: 'Workmanship and surface finish conforms to IS/BS standards', passed: true, remarks: 'Conforms' }
        ]
      };

      data.checklists = data.checklists || [];
      data.checklists.unshift(newChk);
      data.lastUpdated = now.toISOString();

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return NextResponse.json({ success: true, checklist: newChk });
    }

    if (type === 'NEW_INSPECTION_REPORT') {
      const newReport = {
        id: `IR-${Date.now().toString().slice(-4)}`,
        reportNumber: `IR/${now.getFullYear()}/${(data.inspectionReports || []).length + 1}`,
        projectId,
        title: body.title || 'Site Inspection & Clearance Report',
        checklistId: body.checklistId || null,
        inspector: body.inspector || 'Senior Quality Engineer',
        inspectionDate: now.toISOString(),
        result: body.result || 'Approved',
        punchPoints: body.punchPoints || [],
        clientRepresentative: body.clientRepresentative || 'Client QA Representative',
        signedOff: body.signedOff !== false
      };

      data.inspectionReports = data.inspectionReports || [];
      data.inspectionReports.unshift(newReport);
      data.lastUpdated = now.toISOString();

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return NextResponse.json({ success: true, report: newReport });
    }

    return NextResponse.json({ error: 'Invalid quality check type' }, { status: 400 });
  } catch (error) {
    console.error('Error in quality check POST:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { projectId, checklistId, itemId, passed, itemRemarks, status } = body;

    const filePath = getQualityDataPath(projectId);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Quality records not found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const chk = (data.checklists || []).find(c => c.id === checklistId);
    if (!chk) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
    }

    if (itemId !== undefined) {
      const item = (chk.items || []).find(i => i.id === itemId);
      if (item) {
        if (passed !== undefined) item.passed = passed;
        if (itemRemarks !== undefined) item.remarks = itemRemarks;
      }
      // Re-evaluate checklist status
      const allPassed = chk.items.every(i => i.passed === true);
      chk.status = allPassed ? 'Passed' : 'Action Required';
    }

    if (status) chk.status = status;
    data.lastUpdated = new Date().toISOString();

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return NextResponse.json({ success: true, checklist: chk });
  } catch (error) {
    console.error('Error updating quality checklist:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
