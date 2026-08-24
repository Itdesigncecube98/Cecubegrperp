import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month'); // format: YYYY-MM
    const year = searchParams.get('year');

    let where = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (month) {
      const [y, m] = month.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      where.createdAt = { gte: start, lt: end };
    } else if (year) {
      const y = parseInt(year);
      where.createdAt = {
        gte: new Date(y, 0, 1),
        lt: new Date(y + 1, 0, 1)
      };
    }

    const requests = await prisma.imprestRequest.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, empId: true, department: true, branch: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching imprest reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
