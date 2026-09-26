export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'dpr');

async function resolveProjectMaster(projectId) {
  let projectMaster = await prisma.projectMaster.findUnique({ where: { id: projectId }, select: { id: true, name: true } });
  if (projectMaster || !projectId) return projectMaster;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, company: true, state: true }
  });
  if (!project) return null;

  projectMaster = await prisma.projectMaster.findFirst({ where: { name: project.name }, select: { id: true, name: true } });
  if (projectMaster) return projectMaster;

  return prisma.projectMaster.create({
    data: {
      projectId: `PROJECT-${project.id}`,
      name: project.name,
      clientName: project.company || null,
      location: project.state || null,
      projectType: 'EPC',
      status: 'Active'
    },
    select: { id: true, name: true }
  });
}

async function saveAttachments(files, dprId) {
  if (!Array.isArray(files) || files.length === 0) return [];
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const saved = [];
  for (const [index, file] of files.entries()) {
    if (!file?.data || !file?.name) continue;
    const match = String(file.data).match(/^data:([^;]+);base64,(.+)$/);
    if (!match) continue;
    const extension = path.extname(file.name).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10) || '.bin';
    const safeName = `${dprId}-${index}-${Date.now()}${extension}`;
    await fs.writeFile(path.join(UPLOAD_DIR, safeName), Buffer.from(match[2], 'base64'));
    saved.push({ name: String(file.name).slice(0, 200), type: match[1], url: `/uploads/dpr/${safeName}` });
  }
  return saved;
}

function parseDprDate(value) {
  if (!value) return new Date();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const id = searchParams.get('id');
    
    const where = id ? { id } : projectId ? { projectId } : {};
    
    const dprs = await prisma.siteDPR.findMany({
      where,
      include: { project: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' }
    });
    if (id && !dprs[0]) return NextResponse.json({ error: 'DPR not found' }, { status: 404 });
    return NextResponse.json(id ? dprs[0] : dprs);
  } catch (error) {
    console.error('Error fetching DPRs:', error);
    return NextResponse.json({ error: 'Failed to fetch DPRs' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const dprDate = parseDprDate(body.date);
    if (!dprDate) return NextResponse.json({ error: 'A valid DPR date is required.' }, { status: 400 });
    const projectMaster = await resolveProjectMaster(body.projectId);
    if (!projectMaster) return NextResponse.json({ error: 'Selected project could not be found.' }, { status: 400 });
    const dpr = await prisma.siteDPR.create({
      data: {
        projectId: projectMaster.id,
        date: dprDate,
        shift: body.shift || 'Day',
        preparedById: body.preparedById || undefined,
        weather: body.weather || 'Clear',
        workDescription: body.workDescription || '',
        activitiesExecuted: body.activitiesExecuted || '',
        skilledLabour: parseInt(body.skilledLabour || 0),
        unskilledLabour: parseInt(body.unskilledLabour || 0),
        totalLabour: parseInt(body.skilledLabour || 0) + parseInt(body.unskilledLabour || 0),
        equipmentUsed: body.equipmentUsed || '',
        materialConsumed: body.materialConsumed || '',
        safetyIncidents: body.safetyIncidents || 'None',
        remarks: body.remarks || '',
        preparedByName: body.preparedByName || body.preparedBy || '',
        status: body.status || 'Draft',
        attachments: [],
      }
    });
    const attachments = await saveAttachments(body.attachments, dpr.id);
    const savedDpr = attachments.length > 0
      ? await prisma.siteDPR.update({ where: { id: dpr.id }, data: { attachments }, include: { project: { select: { id: true, name: true } } } })
      : await prisma.siteDPR.findUnique({ where: { id: dpr.id }, include: { project: { select: { id: true, name: true } } } });
    return NextResponse.json(savedDpr, { status: 201 });
  } catch (error) {
    console.error('Error creating DPR:', error);
    return NextResponse.json({ error: 'Failed to create DPR' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'DPR id is required' }, { status: 400 });
    const dpr = await prisma.siteDPR.update({
      where: { id: body.id },
      data: {
        projectId: body.projectId || undefined,
        date: body.date ? parseDprDate(body.date) : undefined,
        shift: body.shift || undefined,
        weather: body.weather || undefined,
        workDescription: body.workDescription ?? undefined,
        activitiesExecuted: body.activitiesExecuted ?? undefined,
        skilledLabour: body.skilledLabour === undefined ? undefined : parseInt(body.skilledLabour || 0),
        unskilledLabour: body.unskilledLabour === undefined ? undefined : parseInt(body.unskilledLabour || 0),
        totalLabour: body.skilledLabour === undefined && body.unskilledLabour === undefined ? undefined : parseInt(body.skilledLabour || 0) + parseInt(body.unskilledLabour || 0),
        equipmentUsed: body.equipmentUsed ?? undefined,
        materialConsumed: body.materialConsumed ?? undefined,
        safetyIncidents: body.safetyIncidents ?? undefined,
        remarks: body.remarks ?? undefined,
        preparedByName: body.preparedByName ?? undefined,
        status: body.status || undefined,
      }
    });
    return NextResponse.json(dpr);
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to update DPR' }, { status: 500 });
  }
}
