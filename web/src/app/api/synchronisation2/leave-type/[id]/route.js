import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request, { params }) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    // Remove id from body to avoid update error
    if (body.id) delete body.id;
    
    const data = await prisma.leaveType.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error updating leaveType:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id);
    await prisma.leaveType.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting leaveType:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
