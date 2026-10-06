export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const employees = await prisma.employee.findMany({
      select: { id: true, name: true, empId: true, department: true }
    });
    const empMap = {};
    employees.forEach(e => { empMap[e.id] = e; });

    let balancesData = [];

    if (month && year) {
      const targetMonth = parseInt(month, 10);
      const targetYear = parseInt(year, 10);

      const targetMonthStr = String(targetMonth).padStart(2, '0');
      const targetYearStr = String(targetYear);
      const monthPrefix = `${targetYearStr}-${targetMonthStr}`;

      const approvedRequests = await prisma.leaveRequest.findMany({
        where: { status: 'APPROVED' }
      });

      const presentAttendances = await prisma.attendance.findMany({
        where: {
          date: { startsWith: monthPrefix },
          status: 'Present'
        }
      });
      const presentSet = new Set(presentAttendances.map(a => `${a.employeeId}_${a.date}`));

      const usageByEmp = {};
      for (const emp of employees) {
        usageByEmp[emp.id] = {
          employeeId: emp.id,
          casualLeaves: 1,
          earnedLeaves: 2,
          leaveWithoutPay: 0,
          compensatoryLeaves: 0
        };
      }

      for (const req of approvedRequests) {
        if (!usageByEmp[req.employeeId]) continue;
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);

        let overlapDays = 0;
        let curr = new Date(start);
        while (curr <= end) {
          if (curr.getMonth() + 1 === targetMonth && curr.getFullYear() === targetYear) {
            // Use local date string to match YYYY-MM-DD
            const dateStr = [
              curr.getFullYear(),
              String(curr.getMonth() + 1).padStart(2, '0'),
              String(curr.getDate()).padStart(2, '0')
            ].join('-');

            if (!presentSet.has(`${req.employeeId}_${dateStr}`)) {
              overlapDays += req.isHalfDay ? 0.5 : 1;
            }
          }
          curr.setDate(curr.getDate() + 1);
        }

        if (overlapDays > 0) {
          if (req.leaveType === 'Casual') {
            usageByEmp[req.employeeId].casualLeaves -= overlapDays;
            if (usageByEmp[req.employeeId].casualLeaves < 0) {
              usageByEmp[req.employeeId].leaveWithoutPay += Math.abs(usageByEmp[req.employeeId].casualLeaves);
              usageByEmp[req.employeeId].casualLeaves = 0;
            }
          }
          if (req.leaveType === 'Earned') {
            usageByEmp[req.employeeId].earnedLeaves -= overlapDays;
            if (usageByEmp[req.employeeId].earnedLeaves < 0) {
              usageByEmp[req.employeeId].leaveWithoutPay += Math.abs(usageByEmp[req.employeeId].earnedLeaves);
              usageByEmp[req.employeeId].earnedLeaves = 0;
            }
          }
          if (req.leaveType === 'Unpaid') usageByEmp[req.employeeId].leaveWithoutPay += overlapDays;
          if (req.leaveType === 'COFF') {
            usageByEmp[req.employeeId].compensatoryLeaves -= overlapDays;
            if (usageByEmp[req.employeeId].compensatoryLeaves < 0) {
              usageByEmp[req.employeeId].leaveWithoutPay += Math.abs(usageByEmp[req.employeeId].compensatoryLeaves);
              usageByEmp[req.employeeId].compensatoryLeaves = 0;
            }
          }
        }
      }
      balancesData = Object.values(usageByEmp);
    } else {
      balancesData = await prisma.leaveBalance.findMany();
    }

    // Build rows
    const rows = balancesData.map(b => {
      const emp = empMap[b.employeeId] || {};
      return {
        'Employee Name': emp.name || 'Unknown',
        'Emp Code': emp.empId || '-',
        'Department': emp.department || '-',
        'Casual Leave (CL)': b.casualLeaves ?? 0,
        'Earned Leave (EL)': b.earnedLeaves ?? 0,
        'Comp. Off (C-off)': b.compensatoryLeaves ?? 0,
        'LWP Used': b.leaveWithoutPay ?? 0,
      };
    });

    if (!month || !year) {
      // Also add employees with no balance record (show 0 for all)
      const balanceEmpIds = new Set(balancesData.map(b => b.employeeId));
      employees.forEach(emp => {
        if (!balanceEmpIds.has(emp.id)) {
          rows.push({
            'Employee Name': emp.name,
            'Emp Code': emp.empId || '-',
            'Department': emp.department || '-',
            'Casual Leave (CL)': 0,
            'Earned Leave (EL)': 0,
            'Comp. Off (C-off)': 0,
            'LWP Used': 0,
          });
        }
      });
    }

    // Sort by employee name
    rows.sort((a, b) => a['Employee Name'].localeCompare(b['Employee Name']));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Employee Name
      { wch: 12 }, // Emp Code
      { wch: 20 }, // Department
      { wch: 18 }, // CL
      { wch: 18 }, // EL
      { wch: 18 }, // C-off
      { wch: 12 }, // LWP
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Balances');

    // Write to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="leave_balances_${new Date().toISOString().split('T')[0]}.xlsx"`,
      }
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
