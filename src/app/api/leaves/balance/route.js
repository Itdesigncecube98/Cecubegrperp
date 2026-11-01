export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { toDateKey } from '../../../../lib/leaveEntitlements';
import { calculateLeaveBalanceSnapshot } from '../../../../lib/leaveBalanceSnapshot';

const pad = value => String(value).padStart(2, '0');
const toKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const normalizeLeaveType = value => String(value || '').trim().toLowerCase();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const currentDate = new Date();
    const targetMonth = month ? Number.parseInt(month, 10) : currentDate.getMonth() + 1;
    const targetYear = year ? Number.parseInt(year, 10) : currentDate.getFullYear();

    if ((month && !year) || (!month && year) ||
        !Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12 ||
        !Number.isInteger(targetYear) || targetYear < 2000 || targetYear > 9999) {
      return NextResponse.json({ error: 'A valid month and year are required.' }, { status: 400 });
    }

    const monthPrefix = `${targetYear}-${pad(targetMonth)}`;
    const monthEnd = toKey(new Date(targetYear, targetMonth, 0));
    const employeeWhere = employeeId ? { id: employeeId } : {};
    const [allEmployees, approvedRequests, savedBalances, encashments] = await Promise.all([
      prisma.employee.findMany({ where: employeeWhere }),
      prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: monthEnd },
          ...(employeeId ? { employeeId } : {}),
        },
      }),
      prisma.leaveBalance.findMany({ where: employeeId ? { employeeId } : {} }),
      prisma.leaveEncashment.findMany({
        where: {
          cancelledAt: null,
          asOnDate: { lte: monthEnd },
          ...(employeeId ? { employeeId } : {}),
        },
        select: {
          employeeId: true,
          leaveType: true,
          asOnDate: true,
          encashedDays: true,
          cancelledAt: true,
        },
      }),
    ]);

    const joinDateKeys = allEmployees.map(employee => toDateKey(employee.joinedDate)).filter(Boolean);
    const earliestJoinDate = joinDateKeys.sort()[0] || '2020-01-01';
    const attendanceRows = await prisma.attendance.findMany({
      where: {
        date: { gte: earliestJoinDate, lte: monthEnd },
        ...(employeeId ? { employeeId } : {}),
      },
      select: { employeeId: true, date: true, status: true },
    });

    const attendanceByEmployee = new Map();
    for (const attendance of attendanceRows) {
      const rows = attendanceByEmployee.get(attendance.employeeId) || [];
      rows.push(attendance);
      attendanceByEmployee.set(attendance.employeeId, rows);
    }
    const requestsByEmployee = new Map();
    for (const leave of approvedRequests) {
      const rows = requestsByEmployee.get(leave.employeeId) || [];
      rows.push(leave);
      requestsByEmployee.set(leave.employeeId, rows);
    }
    const encashmentsByEmployee = new Map();
    for (const encashment of encashments) {
      const rows = encashmentsByEmployee.get(encashment.employeeId) || [];
      rows.push(encashment);
      encashmentsByEmployee.set(encashment.employeeId, rows);
    }
    const compOffByEmployee = new Map(savedBalances.map(balance => [
      balance.employeeId,
      balance,
    ]));

    const results = allEmployees.map(employee => {
      return calculateLeaveBalanceSnapshot({
        employee,
        asOnMonth: monthPrefix,
        approvedRequests: requestsByEmployee.get(employee.id) || [],
        attendance: attendanceByEmployee.get(employee.id) || [],
        encashments: encashmentsByEmployee.get(employee.id) || [],
        savedBalance: compOffByEmployee.get(employee.id),
      });
    });

    if (employeeId) {
      return NextResponse.json(results[0] || {
        casualLeaves: 0,
        casualEntitlement: 0,
        earnedLeaves: 0,
        earnedEntitlement: 0,
        compensatoryLeaves: 0,
      });
    }
    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to calculate leave balances:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { employeeId, casualLeaves, leaveWithoutPay, earnedLeaves } = data;
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
    }

    const balance = await prisma.leaveBalance.upsert({
      where: { employeeId },
      update: { casualLeaves, leaveWithoutPay, earnedLeaves },
      create: { employeeId, casualLeaves, leaveWithoutPay, earnedLeaves },
    });
    return NextResponse.json(balance);
  } catch (error) {
    console.error('Failed to save leave balance:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
