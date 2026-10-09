import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

function calculateGrossSalary(employee) {
  const revision = employee.salaryRevisions?.[0];
  const grossSalaryHead = revision?.components?.find((component) => {
    const headName = String(component.salaryHead?.description || '').trim().toLowerCase();
    const headType = String(component.salaryHead?.headType?.name || '').trim().toLowerCase();
    return headName === 'gross salary' || (headType === 'ctc' && headName.includes('gross'));
  });
  const explicitGrossSalary = Number(grossSalaryHead?.amount) || 0;
  if (explicitGrossSalary > 0) return explicitGrossSalary;

  const revisionGross = revision?.components?.reduce((sum, component) => {
    const headType = String(component.salaryHead?.headType?.name || '').trim().toLowerCase();
    return headType === 'earning' ? sum + (Number(component.amount) || 0) : sum;
  }, 0) || 0;

  return revisionGross || Number.parseFloat(employee.basicSalary) || 0;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const employeeId = searchParams.get('employeeId');

    const whereClause = {
      role: { not: 'SUPER_ADMIN' }
    };

    if (department) whereClause.department = department;
    if (employeeId) whereClause.id = employeeId;

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        leaveBalance: true,
        leaveEncashments: {
          orderBy: { createdAt: 'desc' }
        },
        leaveRequests: {
          where: { 
            status: 'APPROVED', 
            leaveType: 'Earned' 
          }
        },
        salaryRevisions: {
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
          include: {
             components: { include: { salaryHead: { include: { headType: true } } } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const enrichedEmployees = employees.map(emp => {
      // 1. Calculate Gross Salary
      const grossSalary = calculateGrossSalary(emp);

      // 2. Calculate Tenure
      let monthsSinceJoining = 0;
      if (emp.joinedDate) {
        const join = new Date(emp.joinedDate);
        const now = new Date();
        monthsSinceJoining = (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth());
      }
      
      const earnedLeaveQuota = monthsSinceJoining >= 8 ? 18 : 0;

      // 3. Calculate Earned Leaves Taken
      let earnedLeavesTaken = 0;
      if (emp.leaveRequests) {
        emp.leaveRequests.forEach(lr => {
          const start = new Date(lr.startDate);
          const end = new Date(lr.endDate);
          let days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
          if (lr.isHalfDay) days = 0.5;
          earnedLeavesTaken += days;
        });
      }

      const maxEncashable = Math.max(0, earnedLeaveQuota - earnedLeavesTaken);

      return {
        ...emp,
        grossSalary,
        monthsSinceJoining,
        earnedLeaveQuota,
        earnedLeavesTaken,
        maxEncashable
      };
    });

    return NextResponse.json(enrichedEmployees);
  } catch (error) {
    console.error('Error fetching employees for leave encashment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { employeeId, asOnDate, encashedDays, message, leaveType } = await request.json();
    const numericEncashedDays = Number(encashedDays);
    if (!Number.isFinite(numericEncashedDays) || numericEncashedDays <= 0) {
      return NextResponse.json({ error: 'Encashed days must be greater than zero.' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        leaveBalance: true,
        salaryRevisions: {
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
          include: {
            components: {
              include: { salaryHead: { include: { headType: true } } }
            }
          }
        }
      }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const type = leaveType || 'Earned Leave';
    
    let currentBalance = 0;
    let balanceField = '';
    
    if (type === 'Earned Leave') {
       currentBalance = employee.leaveBalance?.earnedLeaves || 0;
       balanceField = 'earnedLeaves';
    } else if (type === 'Casual Leave') {
       currentBalance = employee.leaveBalance?.casualLeaves || 0;
       balanceField = 'casualLeaves';
    } else if (type === 'Leave Without Pay') {
       currentBalance = employee.leaveBalance?.leaveWithoutPay || 0;
       balanceField = 'leaveWithoutPay';
    } else if (type === 'Compensatory Leave') {
       currentBalance = employee.leaveBalance?.compensatoryLeaves || 0;
       balanceField = 'compensatoryLeaves';
    }

    // if (currentBalance < encashedDays) {
    //  return NextResponse.json({ error: `Insufficient ${type} balance` }, { status: 400 });
    // }
    // User wants to be able to just fill amount even for Leave without pay (which might be 0 balance).
    // Let's allow negative balance or encashment for LWP.

    const grossSalary = calculateGrossSalary(employee);
    const calculatedAmountPerDay = Math.round((grossSalary / 26) * 100) / 100;
    const totalAmount = Math.round((grossSalary * numericEncashedDays / 26) * 100) / 100;

    // Use a transaction to deduct the balance and create the encashment record
    const transaction = await prisma.$transaction([
      prisma.leaveEncashment.create({
        data: {
          employeeId,
          asOnDate,
          leaveType: type,
          balanceBefore: currentBalance,
          encashedDays: numericEncashedDays,
          amountPerDay: calculatedAmountPerDay,
          totalAmount,
          message,
          isProcessed: false
        }
      }),
      prisma.leaveBalance.update({
        where: { employeeId },
        data: {
          [balanceField]: currentBalance - numericEncashedDays
        }
      })
    ]);

    return NextResponse.json({ success: true, record: transaction[0] });

  } catch (error) {
    console.error('Error saving leave encashment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
