import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const cycles = await prisma.payCycle.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { payrollRecords: true }
        }
      }
    });
    return NextResponse.json(cycles);
  } catch (error) {
    console.error('Error fetching pay cycles:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, startDate, endDate, paymentDate, selectedEmployees = [] } = data;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Name, startDate, and endDate are required' }, { status: 400 });
    }

    const newCycle = await prisma.payCycle.create({
      data: {
        name,
        startDate,
        endDate,
        paymentDate,
        selectedEmployees,
        status: 'DRAFT'
      }
    });

    return NextResponse.json(newCycle);
  } catch (error) {
    console.error('Error creating pay cycle:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
