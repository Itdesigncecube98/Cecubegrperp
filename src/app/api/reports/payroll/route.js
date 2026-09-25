import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const payrollRecords = await prisma.payrollRecord.findMany({
      include: {
        employee: true,
        payCycle: true
      },
      orderBy: {
        payCycle: {
          startDate: 'desc'
        }
      }
    });
    
    return NextResponse.json(payrollRecords);
  } catch (error) {
    console.error('Error fetching payroll records:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
