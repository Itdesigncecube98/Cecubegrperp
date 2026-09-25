import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request, { params }) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);
    const body = await request.json();
    if (!body.shiftName || !body.startTime || !body.endTime) {
      return NextResponse.json({ error: 'Shift name, start time, and end time are required' }, { status: 400 });
    }
    
    const data = await prisma.shift.update({
      where: { id },
      data: {
        shiftName: String(body.shiftName).trim(),
        shortName: body.shortName ? String(body.shortName).trim() : null,
        startTime: String(body.startTime).trim(),
        endTime: String(body.endTime).trim(),
        timeInHalfDay: body.timeInHalfDay || null,
        timeOutHalfDay: body.timeOutHalfDay || null,
        latemarkAllow: body.latemarkAllow || '0',
        gracePeriod: body.gracePeriod || '0',
        latemarkUpto: body.latemarkUpto || '0',
        remark: body.remark || null
      },
    });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error updating shift:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);
    await prisma.shift.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting shift:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
