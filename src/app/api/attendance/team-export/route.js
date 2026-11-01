export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '../../../../lib/prisma';
import { getBiometricPunchesByEmployeeDay } from '../../../../lib/biometricPunchDisplay';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 730;

function isValidDate(value) {
  if (!DATE_PATTERN.test(value || '')) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function parseTimeSlots(value) {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Unable to parse saved attendance time slots for export:', error);
    return [];
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {
      return NextResponse.json({ error: 'Select a valid date range using YYYY-MM-DD.' }, { status: 400 });
    }

    const rangeDays = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000 + 1;
    if (rangeDays > MAX_RANGE_DAYS) {
      return NextResponse.json({ error: 'The export date range cannot exceed 730 days.' }, { status: 400 });
    }

    const employeeIds = searchParams.getAll('employeeId').filter(Boolean);
    const departments = searchParams.getAll('department').filter(Boolean);
    const branches = searchParams.getAll('branch').filter(Boolean);
    const employeeWhere = {
      role: 'EMPLOYEE',
      ...(employeeIds.length ? { id: { in: employeeIds } } : {}),
      ...(departments.length ? { department: { in: departments } } : {}),
      ...(branches.length ? { branch: { in: branches } } : {}),
    };

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      orderBy: [{ department: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        empId: true,
        name: true,
        department: true,
        branch: true,
        designation: true,
      },
    });
    if (!employees.length) {
      return NextResponse.json({ error: 'No employees match the selected filters.' }, { status: 404 });
    }

    const [attendance, biometricPunches] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          employeeId: { in: employees.map(employee => employee.id) },
          date: { gte: startDate, lte: endDate },
        },
        orderBy: [{ date: 'asc' }, { employeeId: 'asc' }],
        select: {
          employeeId: true,
          date: true,
          status: true,
          shiftType: true,
          timeSlots: true,
        },
      }),
      getBiometricPunchesByEmployeeDay(employees, startDate, endDate),
    ]);

    const recordsByEmployeeDate = new Map(
      attendance.map(record => [`${record.employeeId}|${record.date}`, record]),
    );
    const maxSavedSlots = attendance.reduce(
      (max, record) => Math.max(max, parseTimeSlots(record.timeSlots).length),
      0,
    );
    const slotColumns = maxSavedSlots;

    const rows = [];
    for (const employee of employees) {
      for (let timestamp = Date.parse(`${startDate}T00:00:00Z`); timestamp <= Date.parse(`${endDate}T00:00:00Z`); timestamp += 86400000) {
        const date = new Date(timestamp).toISOString().slice(0, 10);
        const record = recordsByEmployeeDate.get(`${employee.id}|${date}`);
        const slots = parseTimeSlots(record?.timeSlots);
        const rawPunches = biometricPunches.get(`${employee.id}|${date}`) || [];
        const row = {
          'Employee Code': employee.empId || '',
          'Employee Name': employee.name,
          Department: employee.department || '',
          Branch: employee.branch || '',
          Designation: employee.designation || '',
          Date: date,
          Day: new Date(`${date}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' }),
          Status: record?.status || 'Not Marked',
          Shift: record?.shiftType || '',
          'Punch Source': slots.length ? 'Attendance record' : rawPunches.length ? 'Biometric (read-only)' : '',
          'Biometric Punch Times': rawPunches.map(punch => `${punch.time}${punch.direction ? ` (${punch.direction})` : ''}`).join(', '),
        };
        for (let index = 0; index < slotColumns; index += 1) {
          const slot = slots[index];
          row[`Time Slot ${index + 1} In`] = slot?.in || '';
          row[`Time Slot ${index + 1} Out`] = slot?.out || '';
        }
        rows.push(row);
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    worksheet['!cols'] = Object.keys(rows[0]).map(column => ({
      wch: column.includes('Employee Name') ? 28 : column.includes('Department') || column.includes('Branch') ? 20 : 16,
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Team Attendance');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="team-attendance_${startDate}_${endDate}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Failed to export team attendance:', error);
    return NextResponse.json({ error: error.message || 'Failed to export team attendance.' }, { status: 500 });
  }
}
