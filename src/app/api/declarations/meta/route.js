export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' }
    });

    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        empId: true,
        name: true,
        department: true,
        pan: true,
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ departments, employees });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
