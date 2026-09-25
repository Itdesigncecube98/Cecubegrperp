export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const types = await prisma.leaveType.findMany();
    return NextResponse.json(types);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const newType = await prisma.leaveType.create({
      data: {
        name: data.name,
        isPaid: data.isPaid,
        isActive: data.isActive,
        includeWeeklyOff: data.includeWeeklyOff,
        includeHoliday: data.includeHoliday,
        considerAsPresent: data.considerAsPresent
      }
    });
    return NextResponse.json(newType);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const updatedType = await prisma.leaveType.update({
      where: { id: data.id },
      data: {
        name: data.name,
        isPaid: data.isPaid,
        isActive: data.isActive,
        includeWeeklyOff: data.includeWeeklyOff,
        includeHoliday: data.includeHoliday,
        considerAsPresent: data.considerAsPresent
      }
    });
    return NextResponse.json(updatedType);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    
    await prisma.leaveType.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
