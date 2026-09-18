export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();

    // Check if name is taken by another record
    if (data.name) {
      const existing = await prisma.leavingReason.findFirst({
        where: { 
          name: data.name,
          NOT: { id: id }
        }
      });
      if (existing) {
        return NextResponse.json({ error: 'Leaving reason with this name already exists' }, { status: 400 });
      }
    }

    const reason = await prisma.leavingReason.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive
      }
    });

    return NextResponse.json(reason);
  } catch (error) {
    console.error('Error updating leaving reason:', error);
    return NextResponse.json({ error: 'Failed to update leaving reason' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Check if used by any employee
    const inUse = await prisma.employee.findFirst({
      where: { leavingReasonId: id }
    });

    if (inUse) {
      return NextResponse.json({ error: 'Cannot delete because it is assigned to one or more employees' }, { status: 400 });
    }

    await prisma.leavingReason.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting leaving reason:', error);
    return NextResponse.json({ error: 'Failed to delete leaving reason' }, { status: 500 });
  }
}
