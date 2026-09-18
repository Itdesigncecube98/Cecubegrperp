export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const projects = await prisma.projectMaster.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    
    // Convert dates to DateTime if provided
    let startDate = null;
    let completionDate = null;
    
    if (body.startDate) {
      startDate = new Date(body.startDate);
    }
    if (body.endDate) {
      completionDate = new Date(body.endDate);
    }
    
    const project = await prisma.projectMaster.create({
      data: {
        projectId: body.projectId || `PRJ-${Date.now()}`,
        name: body.name,
        clientName: body.clientName || null,
        location: body.location || null,
        contractValue: body.contractValue ? parseFloat(body.contractValue) : 0,
        projectType: body.projectType || 'EPC',
        startDate: startDate,
        completionDate: completionDate,
        status: body.status || 'Active',
      }
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: error.message || 'Failed to create project' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    
    // Convert dates if provided
    const updateData = { ...data };
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    if (data.endDate) {
      updateData.completionDate = new Date(data.endDate);
    }
    if (data.contractValue) {
      updateData.contractValue = parseFloat(data.contractValue);
    }
    
    const project = await prisma.projectMaster.update({
      where: { id },
      data: updateData
    });
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}
