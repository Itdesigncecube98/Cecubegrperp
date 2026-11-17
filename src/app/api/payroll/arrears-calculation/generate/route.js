import { prisma } from '@/lib/prisma';
import { calculateSalaryRevisionArrears, generateSalaryRevisionArrears } from '@/lib/payrollArrears';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee ID is required' }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: { OR: [{ id: employeeId }, { empId: employeeId }] },
      select: { id: true },
    });
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    const calculation = await calculateSalaryRevisionArrears(prisma, employee.id);
    if (calculation.status === 'no_revision') {
      return NextResponse.json({ success: false, error: 'No valid salary revision found for this employee.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: calculation });
  } catch (error) {
    console.error('[ARREARS PREVIEW ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee ID is required' }, { status: 400 });
    }

    const result = await generateSalaryRevisionArrears(prisma, employeeId);
    if (result.status === 'generated') {
      return NextResponse.json({ success: true, data: result.record });
    }
    if (result.status === 'blocked') {
      return NextResponse.json({ success: false, error: result.reason }, { status: 409 });
    }
    if (result.status === 'no_revision') {
      return NextResponse.json({ success: false, error: 'No salary revision found for this employee.' }, { status: 404 });
    }
    if (result.status === 'no_open_pay_cycle') {
      return NextResponse.json({ success: false, error: 'No open pay cycle exists to attach the arrears to.' }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: 'No positive arrears calculated.' }, { status: 400 });
  } catch (error) {
    console.error('[ARREARS GENERATE ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
