import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    let weeks = await prisma.workWeek.findMany();
    
    // Seed default if empty
    if (weeks.length === 0) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      for (const day of days) {
        await prisma.workWeek.create({
          data: {
            day,
            isWorking: day !== 'Sunday' // Sunday non-working by default
          }
        });
      }
      weeks = await prisma.workWeek.findMany();
    }
    
    return NextResponse.json(weeks);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json(); // Expect array of { id, isWorking }
    
    for (const item of data) {
      await prisma.workWeek.update({
        where: { id: item.id },
        data: { isWorking: item.isWorking }
      });
    }

    const updated = await prisma.workWeek.findMany();
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
