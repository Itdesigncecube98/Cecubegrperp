import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    // Fetch Gratuity Setup from Database
    const setup = await prisma.gratuitySetup.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    const denominator = setup?.denominator || 26;
    const minServedLimit = setup?.minServedLimit || 5;
    const maxPayableLimit = setup?.maxPayableLimit || 2000000;
    const monthsRoundOff = setup?.monthsRoundOff || 'No';

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

    const results = employeesToProcess.map(employee => {
      let basicSalary = 0;
      if (employee.basicSalary) {
        basicSalary = parseFloat(employee.basicSalary.replace(/,/g, ''));
      }

      let yearsOfService = 0;
      let exactYears = 0;
      
      const isTerminated = !!employee.terminationDate || !!employee.leavingReasonId || employee.employmentStatus === 'TERMINATED' || employee.employmentStatus === 'RESIGNED';
      const endDate = employee.terminationDate ? new Date(employee.terminationDate) : new Date();

      if (employee.joinedDate) {
        const joinDate = new Date(employee.joinedDate);
        
        if (!isNaN(joinDate)) {
          const diffTime = Math.abs(endDate - joinDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          exactYears = diffDays / 365.25;
          yearsOfService = exactYears;
        }
      }

      let gratuityAmount = (basicSalary * 15 * yearsOfService) / denominator;

      if (gratuityAmount > maxPayableLimit) {
        gratuityAmount = maxPayableLimit;
      }

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
        roundedYearsOfService: yearsOfService,
        gratuityAmount: gratuityAmount.toFixed(2),
        isEligible: exactYears > 4.6,
        status: isTerminated ? 'Pending Settlement' : 'Active'
      };
    });

    if (employeeId) {
      return NextResponse.json(results[0]);
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error calculating gratuity:', error);
    return NextResponse.json({ error: 'Failed to calculate gratuity' }, { status: 500 });
  }
}
