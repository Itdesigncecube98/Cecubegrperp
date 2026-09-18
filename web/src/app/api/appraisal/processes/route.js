export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const processes = await prisma.appraisalProcess.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(processes);
  } catch (error) {
    console.error('Error fetching appraisal processes:', error);
    return NextResponse.json({ error: 'Failed to fetch processes' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();

    if (!data.name) {
      return NextResponse.json({ error: 'Process name is required' }, { status: 400 });
    }

    const weightQ = parseFloat(data.weightQ);
    const weightS = parseFloat(data.weightS);

    const newProcess = await prisma.appraisalProcess.create({
      data: {
        name: data.name,
        startDate: data.start || null,
        endDate: data.end || null,
        submissionDate: data.sub || null,
        weightageQuestion: isNaN(weightQ) ? 100 : weightQ,
        weightageSkill: isNaN(weightS) ? 100 : weightS,
        status: data.status || 'Active',
      },
    });

    return NextResponse.json(newProcess, { status: 201 });
  } catch (error) {
    console.error('Error creating appraisal process:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A process with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create process' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const data = await request.json();
    
    // Expecting { ids: ['id1', 'id2'] }
    if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided for deletion' }, { status: 400 });
    }

    await prisma.appraisalProcess.deleteMany({
      where: {
        id: { in: data.ids }
      }
    });

    return NextResponse.json({ message: 'Processes deleted successfully' });
  } catch (error) {
    console.error('Error bulk deleting processes:', error);
    return NextResponse.json({ error: 'Failed to delete processes' }, { status: 500 });
  }
}
