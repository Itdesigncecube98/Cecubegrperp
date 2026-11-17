export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const records = await prisma.payrollRecord.findMany({
      where: {
        employeeId: employeeId,
      },
      include: {
        payCycle: true,
        employee: {
          select: {
            id: true,
            name: true,
            empId: true,
            department: true,
            designation: true,
            branch: true,
            grade: true,
            bankAccountNo: true,
            bankName: true,
            pan: true,
            pfEmployee: true,
            esicNo: true,
            uan: true
          }
        }
      },
      orderBy: {
        payCycle: {
          createdAt: 'desc'
        }
      }
    });

    const payCycleIds = [...new Set(records.map(record => record.payCycleId))];
    const arrearsEntries = payCycleIds.length
      ? await prisma.bonusIncentive.findMany({
        where: {
          employeeId,
          payCycleId: { in: payCycleIds },
          type: 'arrears',
          status: 'ADDED_TO_SALARY',
        },
        select: { payCycleId: true, amount: true },
      })
      : [];
    const arrearsByCycle = new Map(
      arrearsEntries.map(entry => [entry.payCycleId, Number(entry.amount) || 0])
    );

    return NextResponse.json(records.map(record => ({
      ...record,
      arrears: arrearsByCycle.get(record.payCycleId) || 0,
    })), { status: 200 });
  } catch (error) {
    console.error('Error fetching employee payroll records:', error);
    return NextResponse.json({ error: 'Failed to fetch payroll records' }, { status: 500 });
  }
}
