export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    
    const where = projectId ? { projectId } : {};
    
    const activities = await prisma.projectActivity.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const activity = await prisma.projectActivity.create({
      data: {
        projectId: body.projectId,
        activityCode: body.activityCode || `ACT-${Date.now()}`,
        activityName: body.activityName,
        wbsCode: body.wbsCode || '',
        startDate: body.startDate,
        endDate: body.endDate,
        duration: parseInt(body.duration || 0),
        plannedQty: parseFloat(body.plannedQty || 0),
        unit: body.unit || 'LS',
        responsiblePerson: body.responsiblePerson || '',
        status: body.status || 'Not Started',
        isMilestone: body.isMilestone || false,
        actualStart: body.actualStart || null,
        actualEnd: body.actualEnd || null,
        completedQty: 0,
        progressPercent: 0,
      }
    });
    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}
