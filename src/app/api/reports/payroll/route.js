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

    const employeeIds = [...new Set(payrollRecords.map(record => record.employeeId))];
    const payCycleIds = [...new Set(payrollRecords.map(record => record.payCycleId))];
    const arrearsEntries = employeeIds.length && payCycleIds.length
      ? await prisma.bonusIncentive.findMany({
        where: {
          employeeId: { in: employeeIds },
          payCycleId: { in: payCycleIds },
          type: 'arrears',
          status: 'ADDED_TO_SALARY',
        },
        select: { employeeId: true, payCycleId: true, amount: true },
      })
      : [];
    const arrearsByEmployeeCycle = new Map(
      arrearsEntries.map(entry => [`${entry.employeeId}:${entry.payCycleId}`, Number(entry.amount) || 0])
    );

    return NextResponse.json(payrollRecords.map(record => ({
      ...record,
      arrears: arrearsByEmployeeCycle.get(`${record.employeeId}:${record.payCycleId}`) || 0,
    })));
  } catch (error) {
    console.error('Error fetching payroll records:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
