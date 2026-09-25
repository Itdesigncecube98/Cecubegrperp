export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const weekoffTypes = await prisma.weekoffType.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(weekoffTypes, { status: 200 });
  } catch (error) {
    console.error('Error fetching weekoff types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekoff types' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, days, assignedTo } = body;

    if (!name || !days || days.length === 0) {
      return NextResponse.json(
        { error: 'Name and at least one day are required' },
        { status: 400 }
      );
    }

    const newWeekoffType = await prisma.weekoffType.create({
      data: {
        name,
        days,
        assignedTo: assignedTo || 'All Employees',
      },
    });

    return NextResponse.json(newWeekoffType, { status: 201 });
  } catch (error) {
    console.error('Error creating weekoff type:', error);
    return NextResponse.json(
      { error: 'Failed to create weekoff type' },
      { status: 500 }
    );
  }
}
