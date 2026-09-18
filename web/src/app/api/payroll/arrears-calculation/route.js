import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId');
    const employeeId = searchParams.get('employeeId');

    const whereClause = {
      type: 'arrears',
      amount: { gt: 0 }
    };

    if (cycleId) {
      whereClause.payCycleId = cycleId;
    }
    if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    const arrears = await prisma.bonusIncentive.findMany({
      where: whereClause,
      include: {
        employee: true,
        payCycle: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const data = arrears.map(a => {
      let bdown = {};
      try { if (a.message) bdown = JSON.parse(a.message); } catch(e) {}
      
      const monthStart = bdown.fromDate ? new Date(bdown.fromDate) : new Date(a.payCycle.startDate);
      const mth = monthStart.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      
      return {
        id: a.id,
        name: a.employee.name,
        empId: a.employee.empId,
        dept: a.employee.department,
        branch: a.employee.branch,
        month: mth,
        paidIn: `${new Date(a.payCycle.startDate).toLocaleDateString('en-GB')} To ${new Date(a.payCycle.endDate).toLocaleDateString('en-GB')}`,
        type: bdown.overlapDays ? 'Day-wise Arrears' : 'Month-wise Arrears',
        days: bdown.overlapDays ? bdown.overlapDays : '0',
        earning: a.amount,
        deduction: 0,
        net: a.amount,
        status: a.status,
        message: a.message,
        workingDays: a.payCycle.workingDays || 30
      };
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching arrears records:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
