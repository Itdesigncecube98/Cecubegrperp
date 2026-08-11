import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    // Fetch all employees and balances
    const [employees, balances] = await Promise.all([
      prisma.employee.findMany({
        select: { id: true, name: true, empId: true, department: true }
      }),
      prisma.leaveBalance.findMany()
    ]);

    const empMap = {};
    employees.forEach(e => { empMap[e.id] = e; });

    // Build rows
    const rows = balances.map(b => {
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

    // Also add employees with no balance record (show 0 for all)
    const balanceEmpIds = new Set(balances.map(b => b.employeeId));
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
