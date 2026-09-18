export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const data = await prisma.shift.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching shift:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.shiftName || !body.startTime || !body.endTime) {
      return NextResponse.json({ error: 'Shift name, start time, and end time are required' }, { status: 400 });
    }
    const data = {
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
    };
    const shift = await prisma.shift.create({ data });
    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
