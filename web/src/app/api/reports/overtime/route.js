export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');

    const where = {};
    
    if (startDate && endDate) {
      where.date = {
        gte: startDate,
        lte: endDate
      };
    } else if (startDate) {
      where.date = { gte: startDate };
    } else if (endDate) {
      where.date = { lte: endDate };
    }

    if (employeeId && employeeId !== 'all') {
      where.employeeId = employeeId;
    }

    const assignments = await prisma.overtimeAssignment.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            empId: true,
            name: true,
            department: true,
            branch: true,
            designation: true,
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Reports Overtime API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
