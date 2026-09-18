export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    
    const where = projectId ? { projectId } : {};
    
    const dprs = await prisma.siteDPR.findMany({
      where,
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(dprs);
  } catch (error) {
    console.error('Error fetching DPRs:', error);
    return NextResponse.json({ error: 'Failed to fetch DPRs' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const dpr = await prisma.siteDPR.create({
      data: {
        projectId: body.projectId,
        date: body.date,
        shift: body.shift || 'Day',
        preparedBy: body.preparedBy,
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
        status: body.status || 'Draft',
      }
    });
    return NextResponse.json(dpr, { status: 201 });
  } catch (error) {
    console.error('Error creating DPR:', error);
    return NextResponse.json({ error: 'Failed to create DPR' }, { status: 500 });
  }
}
