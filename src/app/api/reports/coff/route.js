import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = startDate;
    }
    if (endDate) {
      dateFilter.lte = endDate;
    }

    const leaveRequestsWhere = {
      leaveType: 'COFF',
      ...(Object.keys(dateFilter).length > 0 ? { startDate: dateFilter } : {})
    };

    if (employeeId) {
      // Individual COff Report
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          leaveBalance: true,
          leaveRequests: {
            where: leaveRequestsWhere,
            orderBy: { appliedOn: 'desc' }
          }
        }
      });
      return NextResponse.json(employee);
    } else {
      // Team COff Report
      const employees = await prisma.employee.findMany({
        include: {
          leaveBalance: true,
          leaveRequests: {
            where: leaveRequestsWhere
          }
        }
      });
      
      const teamReport = employees.map(emp => {
        const coffRequests = emp.leaveRequests || [];
        const totalCoffTaken = coffRequests
          .filter(r => r.status === 'APPROVED')
          .reduce((acc, curr) => acc + (curr.isHalfDay ? 0.5 : 1), 0);
        
        const pendingCoff = coffRequests
          .filter(r => r.status.includes('PENDING'))
          .reduce((acc, curr) => acc + (curr.isHalfDay ? 0.5 : 1), 0);

        return {
          id: emp.id,
          empId: emp.empId,
          name: emp.name,
          department: emp.department,
          balance: emp.leaveBalance?.compensatoryLeaves || 0,
          taken: totalCoffTaken,
          pending: pendingCoff
        };
      });

      return NextResponse.json(teamReport);
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
