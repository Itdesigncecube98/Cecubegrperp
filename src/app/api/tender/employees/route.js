export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const EMPLOYEE_CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET() {
  const cachedEmployees = globalThis.tenderEmployeeCache;
  if (cachedEmployees?.employees && cachedEmployees.expiresAt > Date.now()) {
    return NextResponse.json(cachedEmployees.employees);
  }

  try {
    const employees = await prisma.employee.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    globalThis.tenderEmployeeCache = {
      employees,
      expiresAt: Date.now() + EMPLOYEE_CACHE_TTL_MS,
    };
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching tender employees:', error);
    if (cachedEmployees?.employees) {
      const response = NextResponse.json(cachedEmployees.employees);
      response.headers.set('X-Data-Stale', 'true');
      return response;
    }
    if (error?.code === 'P2037' || /too many clients|too many database connections/i.test(error?.message || '')) {
      return NextResponse.json({
        error: 'Employee list is temporarily unavailable because the database connection limit was reached. Retry after the server restarts with the updated connection pool.',
      }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}
