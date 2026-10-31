import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import {
  calculateAvailableEarnedLeave,
  getMonthEndDateString,
} from '../../../../lib/earnedLeaveAccrual';
import { findApplicableSalaryRevision } from '../../../../lib/payrollDates';

export const dynamic = 'force-dynamic';

function calculateGrossSalary(employee, revision = employee.salaryRevisions?.[0]) {
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
    const requestedMonth = searchParams.get('asOnDate');
    const asOnMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth || '')
      ? requestedMonth
      : new Date().toISOString().slice(0, 7);

    const whereClause = {
      role: { not: 'SUPER_ADMIN' }
    };

    if (department) whereClause.department = department;
    if (employeeId) whereClause.id = employeeId;

    const employees = await prisma.employee.findMany({
      where: whereClause,
      select: {
        id: true,
        empId: true,
        name: true,
        department: true,
        joinedDate: true,
        basicSalary: true,
        leaveBalance: {
          select: {
            earnedLeaves: true,
            casualLeaves: true,
            leaveWithoutPay: true,
            compensatoryLeaves: true,
          },
        },
        leaveEncashments: {
          select: {
            id: true,
            leaveType: true,
            asOnDate: true,
            encashedDays: true,
            amountPerDay: true,
            totalAmount: true,
            isProcessed: true,
            payCycleId: true,
            cancelledAt: true,
          },
          orderBy: { createdAt: 'desc' }
        },
        leaveRequests: {
          where: { status: 'APPROVED' },
          select: { leaveType: true, startDate: true, endDate: true, isHalfDay: true },
        },
        salaryRevisions: {
          orderBy: { createdAt: 'desc' },
          include: {
             components: { include: { salaryHead: { include: { headType: true } } } }
          },
        }
      },
      orderBy: { name: 'asc' }
    });

    const employeeIds = employees.map(employee => employee.id);
    const attendance = employeeIds.length
      ? await prisma.attendance.findMany({
          where: {
            employeeId: { in: employeeIds },
            status: { in: ['EL'] },
            date: { lte: getMonthEndDateString(asOnMonth) },
          },
          select: { employeeId: true, date: true, status: true },
        })
      : [];
    const attendanceByEmployee = new Map();
    attendance.forEach(record => {
      const records = attendanceByEmployee.get(record.employeeId) || [];
      records.push(record);
      attendanceByEmployee.set(record.employeeId, records);
    });

    const enrichedEmployees = employees.map(emp => {
      const salaryRevision = findApplicableSalaryRevision(
        emp.salaryRevisions || [],
        getMonthEndDateString(asOnMonth),
      );
      const grossSalary = calculateGrossSalary(emp, salaryRevision);

      const earnedLeaveBalance = calculateAvailableEarnedLeave({
        joinedDate: emp.joinedDate,
        asOnMonth,
        leaveRequests: emp.leaveRequests || [],
        encashments: emp.leaveEncashments || [],
        attendance: attendanceByEmployee.get(emp.id) || [],
      });
      const maxEncashable = earnedLeaveBalance.availableLeaves;

      return {
        id: emp.id,
        empId: emp.empId,
        name: emp.name,
        department: emp.department,
        joinedDate: emp.joinedDate,
        leaveBalance: {
          ...emp.leaveBalance,
          earnedLeaves: earnedLeaveBalance.availableLeaves,
        },
        leaveEncashments: emp.leaveEncashments,
        grossSalary,
        salaryRevisionEffectiveFrom: salaryRevision?.effectiveFrom || null,
        monthsSinceJoining: earnedLeaveBalance.monthsSinceJoining,
        earnedLeaveQuota: earnedLeaveBalance.accruedLeaves,
        earnedLeavesTaken: earnedLeaveBalance.leavesTaken,
        earnedLeavesEncashed: earnedLeaveBalance.leavesEncashed,
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
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee is required.' }, { status: 400 });
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(asOnDate || ''))) {
      return NextResponse.json({ error: 'Select a valid salary month for encashment.' }, { status: 400 });
    }
    if (!Number.isFinite(numericEncashedDays) || numericEncashedDays <= 0) {
      return NextResponse.json({ error: 'Encashed days must be greater than zero.' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        leaveBalance: true,
        salaryRevisions: {
          orderBy: { createdAt: 'desc' },
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
    if (!balanceField) {
      return NextResponse.json({ error: 'Invalid leave type for encashment.' }, { status: 400 });
    }

    // if (currentBalance < encashedDays) {
    //  return NextResponse.json({ error: `Insufficient ${type} balance` }, { status: 400 });
    // }
    // User wants to be able to just fill amount even for Leave without pay (which might be 0 balance).
    // Let's allow negative balance or encashment for LWP.

    const applicableRevision = findApplicableSalaryRevision(
      employee.salaryRevisions || [],
      getMonthEndDateString(asOnDate),
    );
    const grossSalary = calculateGrossSalary(employee, applicableRevision);
    const calculatedAmountPerDay = Math.round((grossSalary / 26) * 100) / 100;
    const totalAmount = Math.round((grossSalary * numericEncashedDays / 26) * 100) / 100;

    // Use a transaction to deduct the balance and create the encashment record
    const transaction = await prisma.$transaction(async tx => {
      const leaveRequests = await tx.leaveRequest.findMany({
        where: { employeeId, status: 'APPROVED' },
        select: { leaveType: true, startDate: true, endDate: true, isHalfDay: true },
      });
      const encashments = await tx.leaveEncashment.findMany({
        where: { employeeId },
        select: { leaveType: true, asOnDate: true, encashedDays: true, isProcessed: true, payCycleId: true, cancelledAt: true },
      });
      const currentMonth = new Date().toISOString().slice(0, 7);
      const attendanceThroughMonth = asOnDate > currentMonth ? asOnDate : currentMonth;
      const attendance = await tx.attendance.findMany({
        where: {
          employeeId,
          status: { in: ['EL'] },
          date: { lte: getMonthEndDateString(attendanceThroughMonth) },
        },
        select: { date: true, status: true },
      });
      if (encashments.some(record => record.asOnDate === asOnDate && !record.cancelledAt && (record.isProcessed || record.payCycleId))) {
        const error = new Error('Salary calculation has already started for this employee and month.');
        error.code = 'ENCASHMENT_LOCKED';
        throw error;
      }
      const monthCycles = await tx.payCycle.findMany({
        where: {
          endDate: { startsWith: asOnDate },
          status: { in: ['PROCESSING', 'COMPLETED'] },
        },
        select: { id: true },
      });
      if (monthCycles.length > 0) {
        const existingPayrollRecord = await tx.payrollRecord.findFirst({
          where: {
            employeeId,
            payCycleId: { in: monthCycles.map(cycle => cycle.id) },
          },
          select: { id: true },
        });
        if (existingPayrollRecord) {
          const error = new Error('Salary calculation has already started for this employee and month.');
          error.code = 'ENCASHMENT_LOCKED';
          throw error;
        }
      }

      const availableBalance = type === 'Earned Leave'
        ? calculateAvailableEarnedLeave({
            joinedDate: employee.joinedDate,
            asOnMonth: asOnDate,
            leaveRequests,
            encashments,
            attendance,
          }).availableLeaves
        : currentBalance;
      if (numericEncashedDays > availableBalance) {
        const error = new Error(`Only ${availableBalance} ${type} day(s) are available to encash.`);
        error.code = 'INSUFFICIENT_LEAVE';
        throw error;
      }
      const record = await tx.leaveEncashment.create({
        data: {
          employeeId,
          asOnDate,
          leaveType: type,
          balanceBefore: availableBalance,
          encashedDays: numericEncashedDays,
          amountPerDay: calculatedAmountPerDay,
          totalAmount,
          message,
          isProcessed: false
        }
      });
      if (type === 'Earned Leave') {
        const currentBalanceAfterEncashment = calculateAvailableEarnedLeave({
          joinedDate: employee.joinedDate,
          asOnMonth: currentMonth,
          leaveRequests,
          encashments: [
            ...encashments,
              { asOnDate, encashedDays: numericEncashedDays, cancelledAt: null },
          ],
          attendance,
        }).availableLeaves;
        await tx.leaveBalance.upsert({
          where: { employeeId },
          create: { employeeId, earnedLeaves: currentBalanceAfterEncashment },
          update: { earnedLeaves: currentBalanceAfterEncashment },
        });
      } else {
        await tx.leaveBalance.upsert({
          where: { employeeId },
          create: {
            employeeId,
            [balanceField]: currentBalance - numericEncashedDays,
          },
          update: {
            [balanceField]: currentBalance - numericEncashedDays,
          },
        });
      }
      return [record];
    }, { isolationLevel: 'Serializable' });

    return NextResponse.json({ success: true, record: transaction[0] });

  } catch (error) {
    console.error('Error saving leave encashment:', error);
    if (error.code === 'ENCASHMENT_LOCKED' || error.code === 'INSUFFICIENT_LEAVE') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error.code === 'P2034') {
      return NextResponse.json({ error: 'Leave balance changed during encashment. Refresh and retry.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
