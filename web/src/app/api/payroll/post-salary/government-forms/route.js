export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
  try {
    const body = await request.json();
    const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).filter(id => typeof id === 'string'))];
    if (!ids.length) return NextResponse.json({ error: 'Select posted salary records first.' }, { status: 400 });
    if (ids.length > 500) return NextResponse.json({ error: 'Select no more than 500 salary records.' }, { status: 413 });

    const records = await prisma.payrollRecord.findMany({
      where: { id: { in: ids } },
      include: { employee: true, payCycle: true },
      orderBy: [{ employee: { organisation: 'asc' } }, { employee: { name: 'asc' } }]
    });
    if (records.length !== ids.length) return NextResponse.json({ error: 'One or more selected salary records could not be found.' }, { status: 404 });
    const notPosted = records.filter(record => record.status !== 'POSTED');
    if (notPosted.length) return NextResponse.json({ error: 'Government forms can be generated only after salary is posted.' }, { status: 409 });

    const employeeIds = records.map(record => record.employeeId);
    const startDate = records.map(record => record.payCycle.startDate).sort()[0];
    const endDate = records.map(record => record.payCycle.endDate).sort().at(-1);
    const attendance = await prisma.attendance.findMany({
      where: { employeeId: { in: employeeIds }, date: { gte: startDate, lte: endDate } },
      select: { employeeId: true, date: true, status: true, shiftType: true }
    });
    const attendanceByEmployee = new Map();
    for (const entry of attendance) {
      const list = attendanceByEmployee.get(entry.employeeId) || [];
      list.push(entry);
      attendanceByEmployee.set(entry.employeeId, list);
    }

    return NextResponse.json({
      records: records.map(record => ({
        id: record.id,
        employeeId: record.employeeId,
        empId: record.employee.empId || '',
        name: record.employee.name,
        fatherName: record.employee.fatherName || '',
        gender: record.employee.gender || '',
        dateOfBirth: record.employee.dateOfBirth || '',
        joinedDate: record.employee.joinedDate || '',
        address: record.employee.address || '',
        designation: record.employee.designation || '',
        department: record.employee.department || '',
        organisation: record.employee.organisation || '',
        location: record.employee.siteOffice || record.employee.branch || '',
        payCycleId: record.payCycleId,
        payCycleName: record.payCycle.name,
        startDate: record.payCycle.startDate,
        endDate: record.payCycle.endDate,
        workingDays: record.workingDays,
        presentDays: record.presentDays,
        absentDays: record.absentDays,
        basicPay: record.basicPay,
        hra: record.hra,
        conveyance: record.conveyance,
        medical: record.medical,
        specialAllow: record.specialAllow,
        grossPay: record.grossPay,
        pfEmployee: record.pfEmployee,
        professionalTax: record.professionalTax,
        tds: record.tds,
        otherDeductions: record.otherDeductions,
        totalDeductions: record.totalDeductions,
        netPay: record.netPay,
        attendance: attendanceByEmployee.get(record.employeeId) || []
      }))
    });
  } catch (error) {
    console.error('Failed to prepare payroll government forms:', error);
    return NextResponse.json({ error: 'Failed to load posted salary and attendance details.' }, { status: 500 });
  }
}
