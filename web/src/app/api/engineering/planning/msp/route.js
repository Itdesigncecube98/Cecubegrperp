export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.planning_data');

function getMspStoragePath(projectId) {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  return path.join(STORAGE_DIR, `msp_${projectId}.json`);
}

async function getDefaultScheduleForProject(project, groups) {
  const baseDate = new Date();
  const startStr = (d, offsetDays = 0) => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + offsetDays);
    return copy.toISOString().split('T')[0];
  };

  // Fetch actual Material Library hierarchy (Groups -> Subgroups -> Materials)
  let matGroups = [];
  try {
    matGroups = await prisma.materialLibraryGroup.findMany({
      where: { parentId: null },
      include: {
        materials: true,
        subgroups: {
          include: { materials: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  } catch (err) {
    console.warn('Could not fetch material library groups for MSP schedule', err);
  }

  // If Material Library has items, build authentic 3-tier Group -> Subgroup -> Material schedule
  if (matGroups && matGroups.length > 0) {
    let globalIndex = 1;
    const schedule = [];
    let currentDayOffset = 0;

    matGroups.forEach((grp, gIdx) => {
      const groupWbsCode = `${gIdx + 1}.0`;
      const groupDuration = 45;
      const groupStart = startStr(baseDate, currentDayOffset);
      const groupFinish = startStr(baseDate, currentDayOffset + groupDuration);
      const groupSummaryId = `grp-${grp.id}`;

      // Level 1: GROUP
      schedule.push({
        id: groupSummaryId,
        rowNumber: globalIndex++,
        wbsCode: groupWbsCode,
        type: 'group',
        name: grp.name,
        groupName: grp.name,
        subgroupName: '',
        materialName: '',
        unit: '',
        plannedQty: 0,
        duration: groupDuration,
        startDate: groupStart,
        finishDate: groupFinish,
        predecessors: gIdx === 0 ? '' : `${gIdx}.0`,
        resources: 'Project Head & Execution Team',
        progress: 42,
        isCritical: gIdx === 0,
        isSummary: true,
        isMilestone: false,
        level: 1,
        reraStage: 'Structure / RCC Slab'
      });

      // Level 2: SUBGROUPS
      const subList = grp.subgroups || [];
      if (subList.length > 0) {
        subList.forEach((sub, sIdx) => {
          const subWbsCode = `${gIdx + 1}.${sIdx + 1}.0`;
          const subDuration = 22;
          const subStart = startStr(baseDate, currentDayOffset + (sIdx * 8));
          const subFinish = startStr(baseDate, currentDayOffset + (sIdx * 8) + subDuration);
          const subSummaryId = `sub-${sub.id}`;

          schedule.push({
            id: subSummaryId,
            rowNumber: globalIndex++,
            wbsCode: subWbsCode,
            type: 'subgroup',
            name: sub.name,
            groupName: grp.name,
            subgroupName: sub.name,
            materialName: '',
            unit: '',
            plannedQty: 0,
            duration: subDuration,
            startDate: subStart,
            finishDate: subFinish,
            predecessors: sIdx === 0 ? groupSummaryId : `${gIdx + 1}.${sIdx}.0`,
            resources: 'Site Engineer & Subcontractor',
            progress: sIdx === 0 ? 65 : 20,
            isCritical: gIdx === 0 && sIdx === 0,
            isSummary: true,
            isMilestone: false,
            level: 2,
            reraStage: 'Electrical Fittings'
          });

          // Level 3: MATERIALS
          const matList = sub.materials || [];
          matList.forEach((mat, mIdx) => {
            const matWbsCode = `${gIdx + 1}.${sIdx + 1}.${mIdx + 1}`;
            const matDuration = 6 + (mIdx * 3);
            const matStart = startStr(baseDate, currentDayOffset + (sIdx * 8) + (mIdx * 4));
            const matFinish = startStr(baseDate, currentDayOffset + (sIdx * 8) + (mIdx * 4) + matDuration);

            schedule.push({
              id: `mat-${mat.id}`,
              rowNumber: globalIndex++,
              wbsCode: matWbsCode,
              type: 'material',
              name: `${mat.name} Installation`,
              groupName: grp.name,
              subgroupName: sub.name,
              materialName: mat.name,
              unit: mat.unit || 'Nos',
              plannedQty: 50 + (mIdx * 25),
              duration: matDuration,
              startDate: matStart,
              finishDate: matFinish,
              predecessors: mIdx === 0 ? subSummaryId : `${gIdx + 1}.${sIdx + 1}.${mIdx}`,
              resources: `${mat.name.includes('Wire') || mat.name.includes('Cable') ? 'Electrical Gang' : 'Mechanical Team'}`,
              progress: mIdx === 0 ? 80 : (mIdx === 1 ? 35 : 0),
              isCritical: gIdx === 0 && mIdx === 0,
              isSummary: false,
              isMilestone: false,
              level: 3,
              reraStage: 'Electrical Fittings'
            });
          });
        });
      }

      currentDayOffset += 20;
    });

    // Milestone completion
    schedule.push({
      id: 'milestone-completion',
      rowNumber: globalIndex++,
      wbsCode: `${matGroups.length + 1}.0`,
      type: 'milestone',
      name: 'Final Inspection & Client Handover',
      groupName: 'Handover Phase',
      subgroupName: 'QC Clearance',
      materialName: '',
      unit: '',
      plannedQty: 1,
      duration: 0,
      startDate: startStr(baseDate, currentDayOffset + 30),
      finishDate: startStr(baseDate, currentDayOffset + 30),
      predecessors: `${matGroups.length}.0`,
      resources: 'Client & QC Head',
      progress: 0,
      isCritical: true,
      isSummary: false,
      isMilestone: true,
      level: 1,
      reraStage: 'Handover / Completion'
    });

    return schedule;
  }

  // Fallback if no library groups exist yet
  return [
    {
      id: 'grp-1',
      rowNumber: 1,
      wbsCode: '1.0',
      type: 'group',
      name: 'CeCube Electrical Materials',
      groupName: 'CeCube Electrical Materials',
      subgroupName: '',
      materialName: '',
      unit: '',
      plannedQty: 0,
      duration: 35,
      startDate: startStr(baseDate, 0),
      finishDate: startStr(baseDate, 35),
      predecessors: '',
      resources: 'Electrical Head',
      progress: 55,
      isCritical: true,
      isSummary: true,
      isMilestone: false,
      level: 1,
      reraStage: 'Electrical Fittings'
    },
    {
      id: 'sub-1',
      rowNumber: 2,
      wbsCode: '1.1.0',
      type: 'subgroup',
      name: 'Wires & Cables',
      groupName: 'CeCube Electrical Materials',
      subgroupName: 'Wires & Cables',
      materialName: '',
      unit: '',
      plannedQty: 0,
      duration: 18,
      startDate: startStr(baseDate, 0),
      finishDate: startStr(baseDate, 18),
      predecessors: '1.0',
      resources: 'Wiring Gang A',
      progress: 70,
      isCritical: true,
      isSummary: true,
      isMilestone: false,
      level: 2,
      reraStage: 'Electrical Fittings'
    },
    {
      id: 'mat-1',
      rowNumber: 3,
      wbsCode: '1.1.1',
      type: 'material',
      name: 'Copper Wire 1.5mm Laying',
      groupName: 'CeCube Electrical Materials',
      subgroupName: 'Wires & Cables',
      materialName: 'Copper Wire 1.5mm',
      unit: 'Coil',
      plannedQty: 120,
      duration: 8,
      startDate: startStr(baseDate, 0),
      finishDate: startStr(baseDate, 8),
      predecessors: '1.1.0',
      resources: 'Electricians (4)',
      progress: 100,
      isCritical: true,
      isSummary: false,
      isMilestone: false,
      level: 3,
      reraStage: 'Electrical Fittings'
    },
    {
      id: 'mat-2',
      rowNumber: 4,
      wbsCode: '1.1.2',
      type: 'material',
      name: 'Copper Wire 2.5mm Laying',
      groupName: 'CeCube Electrical Materials',
      subgroupName: 'Wires & Cables',
      materialName: 'Copper Wire 2.5mm',
      unit: 'Coil',
      plannedQty: 80,
      duration: 10,
      startDate: startStr(baseDate, 8),
      finishDate: startStr(baseDate, 18),
      predecessors: '1.1.1',
      resources: 'Electricians (4)',
      progress: 40,
      isCritical: true,
      isSummary: false,
      isMilestone: false,
      level: 3,
      reraStage: 'Electrical Fittings'
    }
  ];
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Check if custom saved schedule exists on disk
    const filePath = getMspStoragePath(projectId);
    if (fs.existsSync(filePath)) {
      try {
        const fileData = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(fileData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json({ schedule: parsed, source: 'saved' });
        }
      } catch (e) {
        console.warn('Could not read saved MSP file, falling back to database', e);
      }
    }

    // Otherwise generate from Material Library and WBS
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    const groups = await prisma.wbsGroup.findMany({
      where: { projectId },
      include: { tasks: true },
      orderBy: { createdAt: 'asc' }
    });

    const schedule = await getDefaultScheduleForProject(project, groups);
    return NextResponse.json({ schedule, source: 'generated', projectName: project?.name });
  } catch (error) {
    console.error('Error fetching MSP schedule:', error);
    return NextResponse.json({ error: error.message || 'Failed to load MSP schedule' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { projectId, schedule } = body;

    if (!projectId || !Array.isArray(schedule)) {
      return NextResponse.json({ error: 'Invalid payload. projectId and schedule array required.' }, { status: 400 });
    }

    const filePath = getMspStoragePath(projectId);
    fs.writeFileSync(filePath, JSON.stringify(schedule, null, 2), 'utf8');

    return NextResponse.json({ success: true, count: schedule.length });
  } catch (error) {
    console.error('Error saving MSP schedule:', error);
    return NextResponse.json({ error: error.message || 'Failed to save MSP schedule' }, { status: 500 });
  }
}
