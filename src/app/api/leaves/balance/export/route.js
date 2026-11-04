export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { toDateKey } from '../../../../../lib/leaveEntitlements';
import { calculateLeaveBalanceSnapshot } from '../../../../../lib/leaveBalanceSnapshot';
import * as XLSX from 'xlsx';

const pad = value => String(value).padStart(2, '0');
const toKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    if ((month && !year) || (!month && year)) {
      return NextResponse.json({ error: 'A valid month and year are required.' }, { status: 400 });
    }

    const now = new Date();
    const targetMonth = month ? Number.parseInt(month, 10) : now.getMonth() + 1;
    const targetYear = year ? Number.parseInt(year, 10) : now.getFullYear();
    if (!Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12 ||
        !Number.isInteger(targetYear) || targetYear < 2000 || targetYear > 9999) {
      return NextResponse.json({ error: 'A valid month and year are required.' }, { status: 400 });
    }

    const asOnMonth = `${targetYear}-${pad(targetMonth)}`;
    const monthEnd = toKey(new Date(targetYear, targetMonth, 0));
    const employees = await prisma.employee.findMany({
      select: { id: true, name: true, empId: true, department: true, joinedDate: true },
    });
    const earliestJoinDate = employees
      .map(employee => toDateKey(employee.joinedDate))
      .filter(Boolean)
      .sort()[0] || '2020-01-01';
    const [approvedRequests, attendanceRows, savedBalances, encashments] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { status: 'APPROVED', startDate: { lte: monthEnd } },
      }),
      prisma.attendance.findMany({
        where: { date: { gte: earliestJoinDate, lte: monthEnd } },
        select: { employeeId: true, date: true, status: true },
      }),
      prisma.leaveBalance.findMany(),
      prisma.leaveEncashment.findMany({
        where: { cancelledAt: null, asOnDate: { lte: monthEnd } },
        select: {
          employeeId: true,
          leaveType: true,
          asOnDate: true,
          encashedDays: true,
          cancelledAt: true,
          createdAt: true,
        },
      }),
    ]);

    const indexByEmployee = rows => {
      const index = new Map();
      for (const row of rows) {
        const values = index.get(row.employeeId) || [];
        values.push(row);
        index.set(row.employeeId, values);
      }
      return index;
    };
    const requestsByEmployee = indexByEmployee(approvedRequests);
    const attendanceByEmployee = indexByEmployee(attendanceRows);
    const encashmentsByEmployee = indexByEmployee(encashments);
    const balancesByEmployee = new Map(savedBalances.map(balance => [balance.employeeId, balance]));
    const balanceRows = employees.map(employee => calculateLeaveBalanceSnapshot({
      employee,
      asOnMonth,
      approvedRequests: requestsByEmployee.get(employee.id) || [],
      attendance: attendanceByEmployee.get(employee.id) || [],
      encashments: encashmentsByEmployee.get(employee.id) || [],
      savedBalance: balancesByEmployee.get(employee.id),
    }));

    const employeeById = new Map(employees.map(employee => [employee.id, employee]));
    const rows = balanceRows.map(balance => {
      const employee = employeeById.get(balance.employeeId) || {};
      return {
        'Employee Name': employee.name || 'Unknown',
        'Emp Code': employee.empId || '-',
        'Department': employee.department || '-',
        'Casual Leave (CL)': balance.casualLeaves ?? 0,
        'Earned Leave (EL)': balance.earnedLeaves ?? 0,
        'Comp. Off (C-off)': balance.compensatoryLeaves ?? 0,
        'LWP Used': balance.leaveWithoutPay ?? 0,
      };
    }).sort((left, right) => left['Employee Name'].localeCompare(right['Employee Name']));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 25 },
      { wch: 12 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Balances');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="leave_balances_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
