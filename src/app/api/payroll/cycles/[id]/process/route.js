import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { classifyStandardEarningHead } from '@/lib/payrollSalaryHeads';
import { findApplicableSalaryRevision } from '@/lib/payrollDates';

export const dynamic = 'force-dynamic';

function grossSalaryForCycle(employee, revision) {
  const grossSalaryHead = revision?.components?.find(component => {
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

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const { considerBonus = false, considerLeaveEncash = true, considerTds = true } = body;

    const cycle = await prisma.payCycle.findUnique({ where: { id } });
    if (!cycle) {
      return NextResponse.json({ error: 'Pay cycle not found' }, { status: 404 });
    }

    if (cycle.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Cannot reprocess a completed pay cycle' }, { status: 400 });
    }
    const cycleMonth = String(cycle.endDate).slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(cycleMonth)) {
      return NextResponse.json({ error: 'Pay cycle end date must be a valid ISO date.' }, { status: 400 });
    }

    const existingRecords = await prisma.payrollRecord.findMany({
      where: { payCycleId: id },
      select: { id: true, employeeId: true, status: true }
    });
    if (existingRecords.some(record => record.status !== 'PENDING')) {
      return NextResponse.json({ error: 'This cycle contains approved or paid payroll records and cannot be reprocessed.' }, { status: 409 });
    }

    // Build date columns
    const start = new Date(cycle.startDate);
    const end = new Date(cycle.endDate);
    const dateCols = [];
    let cur = new Date(start);
    while (cur <= end) {
      dateCols.push({ fullDate: cur.toISOString().split('T')[0], isSunday: cur.getDay() === 0 });
      cur.setDate(cur.getDate() + 1);
    }
    const totalDays = dateCols.length;

    // Fetch holidays & approved leaves
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: cycle.startDate, lte: cycle.endDate } }
    });
    const workingAnnouncements = await prisma.announcement.findMany({
      where: { isWorkingDay: true, date: { gte: cycle.startDate, lte: cycle.endDate } }
    });
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: { status: 'APPROVED', startDate: { lte: cycle.endDate }, endDate: { gte: cycle.startDate } }
    });

    // Fetch employees (attendance only, no salary relations)
    const whereClause = cycle.selectedEmployees && cycle.selectedEmployees.length > 0
      ? { id: { in: cycle.selectedEmployees } }
      : {};

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        attendances: { where: { date: { gte: cycle.startDate, lte: cycle.endDate } } }
      }
    });

    // Fetch ALL salary revisions for these employees separately
    const employeeIds = employees.map(e => e.id);
    const cycleEncashments = considerLeaveEncash && employeeIds.length > 0
      ? await prisma.leaveEncashment.findMany({
          where: {
            employeeId: { in: employeeIds },
            asOnDate: cycleMonth,
            isProcessed: false,
            cancelledAt: null,
            OR: [{ payCycleId: null }, { payCycleId: id }],
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];
    const cancelledCycleEncashments = considerLeaveEncash && employeeIds.length > 0
      ? await prisma.leaveEncashment.findMany({
          where: {
            employeeId: { in: employeeIds },
            asOnDate: cycleMonth,
            payCycleId: id,
            cancelledAt: { not: null },
          },
          select: { employeeId: true },
        })
      : [];
    const employeesWithCancelledEncashment = new Set(
      cancelledCycleEncashments.map(encashment => encashment.employeeId)
    );
    const encashmentsByEmployee = new Map();
    for (const encashment of cycleEncashments) {
      const current = encashmentsByEmployee.get(encashment.employeeId) || [];
      current.push(encashment);
      encashmentsByEmployee.set(encashment.employeeId, current);
    }

    const allRevisions = await prisma.salaryRevision.findMany({
      where: {
        employeeId: { in: employeeIds }
      },
      include: {
        components: {
          include: {
            salaryHead: { include: { headType: true } }
          }
        }
      },
      orderBy: { effectiveFrom: 'desc' }
    });

    // Compare effective dates as dates; the stored day-first strings are not lexically sortable.
    const revisionMap = {};
    for (const rev of allRevisions) {
      (revisionMap[rev.employeeId] ||= []).push(rev);
    }
    for (const employeeId of employeeIds) {
      revisionMap[employeeId] = findApplicableSalaryRevision(revisionMap[employeeId] || [], cycle.endDate);
    }

    console.log(`[PAYROLL] Processing ${employees.length} employees, ${allRevisions.length} revisions found`);

    const attendanceIssues = employees.filter(emp =>
      emp.attendances.length === 0 || emp.attendances.some(att => !att.isApproved)
    );
    if (attendanceIssues.length > 0) {
      return NextResponse.json({
        error: 'Payroll was not processed because attendance is missing or not approved for every selected employee.',
        employeesNeedingAttendanceReview: attendanceIssues.map(emp => emp.empId || emp.id),
        count: attendanceIssues.length
      }, { status: 409 });
    }

    const employeesWithoutSalary = employees.filter(emp => {
      const revision = revisionMap[emp.id];
      return !revision && ![emp.basicSalary, emp.hra, emp.specialAllowance, emp.conveyance, emp.medical]
        .some(value => Number.parseFloat(value) > 0);
    });
    if (employeesWithoutSalary.length > 0) {
      return NextResponse.json({
        error: 'Payroll was not processed because salary data is missing for one or more selected employees.',
        employeesNeedingSalary: employeesWithoutSalary.map(emp => emp.empId || emp.id),
        count: employeesWithoutSalary.length
      }, { status: 409 });
    }

    const payrollRecordsData = [];

    for (const emp of employees) {
      // ── Attendance ──────────────────────────────────────────────
      let unpaidDays = 0, pCount = 0, aCount = 0, halfDayCount = 0;
      dateCols.forEach(col => {
        const att = emp.attendances.find(a => a.date === col.fullDate);
        let s = att?.status;

        const leave = approvedLeaves.find(l =>
          l.employeeId === emp.id && col.fullDate >= l.startDate && col.fullDate <= l.endDate
        );

        if (leave) {
          const lt = (leave.leaveType || '').toLowerCase();
          if (lt.includes('casual') || lt === 'cl') s = 'CL';
          else if (lt.includes('earned') || lt.includes('paid') || lt === 'el' || lt === 'pl') s = 'EL';
          else if (lt.includes('sick') || lt === 'sl') s = 'SL';
          else if (lt.includes('unpaid') || lt === 'lwp') s = 'LWP';
          else if (lt.includes('coff') || lt === 'c-off') s = 'C-off';
          else s = 'CL';
        } else if (!s) {
          const isWorkingAnn = workingAnnouncements.some(a => a.date === col.fullDate);
          if (holidays.some(h => h.date === col.fullDate)) {
            s = 'H';
          } else if (isWorkingAnn) {
            s = 'A';
          } else if (col.isSunday) {
            s = 'W-off';
          } else {
            s = 'A';
          }
        }
        if (s === 'Present') s = 'P';
        if (s === 'Absent') s = 'A';
        if (s === 'Leave' || s === 'L') s = 'CL';

        if (s === 'P' || s === 'C-off') pCount++;
        else if (s === 'Half Day' || s === 'HD') {
          halfDayCount++;
          pCount += 0.5;
          unpaidDays += 0.5;
        }
        else if (s === 'A' || s === 'LWP') { aCount++; unpaidDays++; }
      });

      const wageDays = totalDays - unpaidDays;
      const prorationFactor = totalDays > 0 ? wageDays / totalDays : 0;

      const revision = revisionMap[emp.id];

      // Sum any unprocessed leave encashments
      let leaveEncashment = 0;
      const employeeEncashments = encashmentsByEmployee.get(emp.id) || [];
      const encashmentRate = Math.round((grossSalaryForCycle(emp, revision) / 26) * 100) / 100;
      if (considerLeaveEncash && employeeEncashments.length > 0) {
        leaveEncashment = employeeEncashments.reduce(
          (sum, encashment) => sum + Math.round(encashmentRate * encashment.encashedDays * 100) / 100,
          0
        );
      }

      let totalEarnings = 0, totalDeductions = 0;
      let basicPay = 0, hra = 0, conveyance = 0, medical = 0, specialAllow = 0, bonus = 0;
      let pfEmployee = 0, professionalTax = 0, tds = 0, otherDeductions = 0;

      if (revision) {
        console.log(`[PAYROLL] ${emp.empId} using revision ${revision.id} with ${revision.components.length} components`);

        revision.components.forEach(comp => {
          const typeName = String(comp.salaryHead?.headType?.name || '').trim().toLowerCase();
          const headName = String(comp.salaryHead?.description || '').trim().toLowerCase();
          const amount = parseFloat(comp.amount) || 0;

          if (typeName === 'earning') {
            // Employer PF contributes to CTC but is not an employee take-home earning.
            if (['employer pf', 'employer provident fund'].includes(headName)) return;
            const prorated = amount * prorationFactor;
            totalEarnings += prorated;
            const earningCategory = classifyStandardEarningHead(headName);
            if (earningCategory === 'basic') basicPay += prorated;
            else if (earningCategory === 'hra') hra += prorated;
            else if (earningCategory === 'medical') medical += prorated;
            else if (earningCategory === 'conveyance') conveyance += prorated;
            else specialAllow += prorated;
          } else if (typeName === 'deduction') {
            totalDeductions += amount;
            if (['provident fund', 'employer pf', 'provident fund (pf)', 'pf'].includes(headName)) pfEmployee += amount;
            else if (['professional tax', 'professional tax (pt)'].includes(headName)) professionalTax += amount;
            else if (['tds', 'tds / income tax', 'income tax'].includes(headName)) {
              if (considerTds) tds += amount;
              else totalDeductions -= amount; // Revert deduction if not considered
            }
            else otherDeductions += amount;
          } else if (typeName === 'other') {
            if (headName === 'bonus' && considerBonus) bonus += amount * prorationFactor;
            else if (
              headName === 'leave encashment' &&
              considerLeaveEncash &&
              employeeEncashments.length === 0 &&
              !employeesWithCancelledEncashment.has(emp.id)
            ) {
              leaveEncashment += amount;
            }
          }
        });

        totalEarnings += leaveEncashment;

        console.log(`[PAYROLL] ${emp.empId}: earnings=${totalEarnings.toFixed(2)}, deductions=${totalDeductions.toFixed(2)}, proration=${prorationFactor.toFixed(3)}`);
      } else {
        // Fallback to old Employee fields
        console.log(`[PAYROLL] ${emp.empId}: NO REVISION — using legacy fields basic=${emp.basicSalary}`);
        basicPay = (parseFloat(emp.basicSalary) || 0) * prorationFactor;
        hra = (parseFloat(emp.hra) || 0) * prorationFactor;
        specialAllow = (parseFloat(emp.specialAllowance) || 0) * prorationFactor;
        
        if (considerBonus) bonus = (parseFloat(emp.bonus) || 0) * prorationFactor;
        else bonus = 0;
        
        conveyance = (parseFloat(emp.conveyance) || 0) * prorationFactor;
        medical = (parseFloat(emp.medical) || 0) * prorationFactor;
        totalEarnings = basicPay + hra + conveyance + medical + specialAllow + leaveEncashment;
        pfEmployee = parseFloat(emp.pfEmployee) || 0;
        professionalTax = parseFloat(emp.professionalTax) || 0;
        
        if (considerTds) tds = parseFloat(emp.tds) || 0;
        else tds = 0;
        
        otherDeductions = parseFloat(emp.deductions) || 0;
        totalDeductions = pfEmployee + professionalTax + tds + otherDeductions;
      }

      const grossPay = totalEarnings + bonus;
      const netPay = grossPay - totalDeductions;

      payrollRecordsData.push({
        payCycleId: id,
        employeeId: emp.id,
        basicPay:         Math.round(basicPay * 100) / 100,
        hra:              Math.round(hra * 100) / 100,
        conveyance:       Math.round(conveyance * 100) / 100,
        medical:          Math.round(medical * 100) / 100,
        specialAllow:     Math.round(specialAllow * 100) / 100,
        bonus:            Math.round(bonus * 100) / 100,
        leaveEncashment:  Math.round(leaveEncashment * 100) / 100,
        grossPay:         Math.round(grossPay * 100) / 100,
        pfEmployee:       Math.round(pfEmployee * 100) / 100,
        professionalTax:  Math.round(professionalTax * 100) / 100,
        tds:              Math.round(tds * 100) / 100,
        otherDeductions:  Math.round(otherDeductions * 100) / 100,
        totalDeductions:  Math.round(totalDeductions * 100) / 100,
        netPay:           Math.round(netPay * 100) / 100,
        workingDays: wageDays,
        presentDays: pCount,
        absentDays: aCount,
        status: 'PENDING'
      });
    }

    if (payrollRecordsData.length === 0) {
      return NextResponse.json({ error: 'No payroll records were produced. Check the selected employees and their salary and attendance data.' }, { status: 409 });
    }

    const existingByEmployee = new Map();
    for (const record of existingRecords) {
      if (existingByEmployee.has(record.employeeId)) {
        return NextResponse.json({ error: 'This cycle has duplicate payroll records for an employee. Resolve the duplicates before reprocessing.' }, { status: 409 });
      }
      existingByEmployee.set(record.employeeId, record);
    }
    const calculatedEmployeeIds = new Set(payrollRecordsData.map(record => record.employeeId));
    if (existingRecords.some(record => !calculatedEmployeeIds.has(record.employeeId))) {
      return NextResponse.json({ error: 'The employee selection differs from existing payroll records. Create a new cycle to avoid dropping existing records.' }, { status: 409 });
    }

    // Save only after every record has been calculated successfully. Existing records are
    // updated in place; the endpoint never deletes payroll records during reprocessing.
    await prisma.$transaction(async tx => {
      if (considerLeaveEncash) {
        const unassignedEncashmentIds = cycleEncashments
          .filter(encashment => !encashment.payCycleId)
          .map(encashment => encashment.id);
        if (unassignedEncashmentIds.length > 0) {
          const reservation = await tx.leaveEncashment.updateMany({
            where: {
              id: { in: unassignedEncashmentIds },
              isProcessed: false,
              payCycleId: null,
            },
            data: { payCycleId: id },
          });
          if (reservation.count !== unassignedEncashmentIds.length) {
            throw new Error('Some leave encashments were assigned to another payroll cycle. Refresh and retry.');
          }
        }
        for (const encashment of cycleEncashments) {
          const salaryEmployee = employees.find(employee => employee.id === encashment.employeeId);
          const amountPerDay = salaryEmployee
            ? Math.round((grossSalaryForCycle(salaryEmployee, revisionMap[salaryEmployee.id]) / 26) * 100) / 100
            : 0;
          await tx.leaveEncashment.update({
            where: { id: encashment.id },
            data: {
              payCycleId: id,
              amountPerDay,
              totalAmount: Math.round(amountPerDay * encashment.encashedDays * 100) / 100,
            },
          });
        }
      } else {
        await tx.leaveEncashment.updateMany({
          where: { payCycleId: id, isProcessed: false },
          data: { payCycleId: null },
        });
      }

      for (const record of payrollRecordsData) {
        const existing = existingByEmployee.get(record.employeeId);
        if (existing) {
          await tx.payrollRecord.update({ where: { id: existing.id }, data: record });
        } else {
          await tx.payrollRecord.create({ data: record });
        }
      }
      await tx.payCycle.update({ where: { id }, data: { status: 'PROCESSING' } });
    });

    console.log(`[PAYROLL] Done. Created ${payrollRecordsData.length} records`);

    return NextResponse.json({ success: true, processedCount: payrollRecordsData.length, records: payrollRecordsData });

  } catch (error) {
    console.error('[PAYROLL ERROR]', error);
    if (error.message?.includes('assigned to another payroll cycle')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
