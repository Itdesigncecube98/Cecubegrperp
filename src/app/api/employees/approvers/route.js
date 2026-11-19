import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '@/lib/authSession';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (readAuthSession(request)?.type !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const employees = await prisma.employee.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, empId: true, name: true },
    });
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching approval employees:', error);
    return NextResponse.json({ error: 'Failed to fetch approval employees.' }, { status: 500 });
  }
}
