export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();

    if (!data.name) {
      return NextResponse.json({ error: 'Process name is required' }, { status: 400 });
    }

    const weightQ = parseFloat(data.weightQ);
    const weightS = parseFloat(data.weightS);

    const updatedProcess = await prisma.appraisalProcess.update({
      where: { id },
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

    return NextResponse.json(updatedProcess);
  } catch (error) {
    console.error('Error updating appraisal process:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Process not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update process' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await prisma.appraisalProcess.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Process deleted successfully' });
  } catch (error) {
    console.error('Error deleting appraisal process:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Process not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete process' }, { status: 500 });
  }
}
