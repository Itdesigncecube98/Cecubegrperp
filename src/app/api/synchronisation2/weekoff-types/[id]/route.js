import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request, { params }) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { name, days, assignedTo } = body;

    if (!name || !days || days.length === 0) {
      return NextResponse.json(
        { error: 'Name and at least one day are required' },
        { status: 400 }
      );
    }

    const updatedWeekoffType = await prisma.weekoffType.update({
      where: { id },
      data: {
        name,
        days,
        assignedTo: assignedTo || 'All Employees',
      },
    });

    return NextResponse.json(updatedWeekoffType, { status: 200 });
  } catch (error) {
    console.error('Error updating weekoff type:', error);
    return NextResponse.json(
      { error: 'Failed to update weekoff type' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id);

    await prisma.weekoffType.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Weekoff type deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting weekoff type:', error);
    return NextResponse.json(
      { error: 'Failed to delete weekoff type' },
      { status: 500 }
    );
  }
}
