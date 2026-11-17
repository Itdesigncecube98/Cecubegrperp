import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

function calculateGratuity(employee, setup) {
  const denominator = setup?.denominator || 26;
  const maxPayableLimit = setup?.maxPayableLimit || 2000000;
  const basicSalary = Number.parseFloat(String(employee.basicSalary || '0').replace(/,/g, '')) || 0;
  const isTerminated = !!employee.terminationDate ||
    !!employee.leavingReasonId ||
    employee.employmentStatus === 'TERMINATED' ||
    employee.employmentStatus === 'RESIGNED';
  const endDate = employee.terminationDate ? new Date(employee.terminationDate) : new Date();
  let exactYears = 0;

  if (employee.joinedDate) {
    const joinDate = new Date(employee.joinedDate);
    if (!isNaN(joinDate)) {
      exactYears = Math.ceil(Math.abs(endDate - joinDate) / (1000 * 60 * 60 * 24)) / 365.25;
    }
  }

  const gratuityAmount = Math.min((basicSalary * 15 * exactYears) / denominator, maxPayableLimit);
  return {
    employeeId: employee.id,
    employeeName: employee.name,
    employeeCode: employee.empId,
    department: employee.department,
    joinedDate: employee.joinedDate,
    terminationDate: employee.terminationDate,
    isTerminated,
    basicSalary,
    exactYearsOfService: exactYears.toFixed(2),
    roundedYearsOfService: exactYears,
    gratuityAmount: gratuityAmount.toFixed(2),
    isEligible: exactYears > 4.6,
    status: isTerminated ? 'Pending Settlement' : 'Active'
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    // Fetch Gratuity Setup from Database
    const setup = await prisma.gratuitySetup.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    let employeesToProcess = [];

    if (employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          empId: true,
          name: true,
          joinedDate: true,
          basicSalary: true,
          terminationDate: true,
          leavingReasonId: true,
          employmentStatus: true,
        }
      });

      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
      employeesToProcess = [employee];
    } else {
      employeesToProcess = await prisma.employee.findMany({
        select: {
          id: true,
          empId: true,
          name: true,
          department: true,
          joinedDate: true,
          basicSalary: true,
          terminationDate: true,
          leavingReasonId: true,
          employmentStatus: true,
        }
      });
    }

    const results = employeesToProcess.map(employee => calculateGratuity(employee, setup));

    if (employeeId) {
      return NextResponse.json(results[0]);
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error calculating gratuity:', error);
    return NextResponse.json({ error: 'Failed to calculate gratuity' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { employeeId, cycleId } = await request.json();
    if (!employeeId || !cycleId) {
      return NextResponse.json({ error: 'Employee and pay cycle are required.' }, { status: 400 });
    }

    const [employee, setup] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          empId: true,
          name: true,
          joinedDate: true,
          basicSalary: true,
          terminationDate: true,
          leavingReasonId: true,
          employmentStatus: true,
        },
      }),
      prisma.gratuitySetup.findFirst({ orderBy: { createdAt: 'desc' } }),
    ]);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const gratuity = calculateGratuity(employee, setup);
    if (!gratuity.isEligible || Number(gratuity.gratuityAmount) <= 0) {
      return NextResponse.json({ error: 'This employee is not eligible for gratuity.' }, { status: 409 });
    }

    const result = await prisma.$transaction(async tx => {
      const cycle = await tx.payCycle.findUnique({ where: { id: cycleId } });
      if (!cycle) return { error: 'Pay cycle not found.', status: 404 };
      if (cycle.status === 'COMPLETED') {
        return { error: 'Gratuity cannot be added to a completed pay cycle.', status: 409 };
      }

      const record = await tx.payrollRecord.findFirst({
        where: { employeeId, payCycleId: cycleId },
      });
      if (!record) {
        return { error: 'No salary calculation exists for this employee in the selected cycle. Calculate payroll first.', status: 409 };
      }
      if (record.status !== 'PENDING') {
        return { error: 'Gratuity cannot be changed after the salary is approved or posted.', status: 409 };
      }

      const key = { employeeId_payCycleId_type: { employeeId, payCycleId: cycleId, type: 'gratuity' } };
      const previous = await tx.bonusIncentive.findUnique({ where: key });
      const previousAmount = previous?.status === 'ADDED_TO_SALARY' ? Number(previous.amount) || 0 : 0;
      const amount = Math.round(Number(gratuity.gratuityAmount) * 100) / 100;
      const delta = Math.round((amount - previousAmount) * 100) / 100;
      const item = await tx.bonusIncentive.upsert({
        where: key,
        update: {
          basis: gratuity.basicSalary,
          percent: Math.round((15 * gratuity.roundedYearsOfService / (setup?.denominator || 26)) * 10000) / 100,
          amount,
          message: `Eligible service: ${gratuity.exactYearsOfService} years`,
          status: 'ADDED_TO_SALARY',
        },
        create: {
          employeeId,
          payCycleId: cycleId,
          type: 'gratuity',
          basis: gratuity.basicSalary,
          percent: Math.round((15 * gratuity.roundedYearsOfService / (setup?.denominator || 26)) * 10000) / 100,
          amount,
          message: `Eligible service: ${gratuity.exactYearsOfService} years`,
          status: 'ADDED_TO_SALARY',
        },
      });

      const updatedRecord = delta === 0
        ? record
        : await tx.payrollRecord.update({
          where: { id: record.id },
          data: {
            grossPay: Math.round((Number(record.grossPay) + delta) * 100) / 100,
            netPay: Math.round((Number(record.netPay) + delta) * 100) / 100,
          },
        });
      return { item, record: updatedRecord };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error adding gratuity to payroll:', error);
    return NextResponse.json({ error: error.message || 'Failed to add gratuity to payroll.' }, { status: 500 });
  }
}
