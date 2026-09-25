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

    return NextResponse.json(records, { status: 200 });
  } catch (error) {
    console.error('Error fetching employee payroll records:', error);
    return NextResponse.json({ error: 'Failed to fetch payroll records' }, { status: 500 });
  }
}
