import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const { considerBonus = false, considerLeaveEncash = false, considerTds = true } = body;

    const cycle = await prisma.payCycle.findUnique({ where: { id } });
    if (!cycle) {
      return NextResponse.json({ error: 'Pay cycle not found' }, { status: 404 });
    }

    if (cycle.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Cannot reprocess a completed pay cycle' }, { status: 400 });
    }

    // Clear existing records
    await prisma.payrollRecord.deleteMany({ where: { payCycleId: id } });

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
        attendances: { where: { date: { gte: cycle.startDate, lte: cycle.endDate } } },
        leaveEncashments: {
          where: {
            isProcessed: false
          }
        }
      }
    });

    // Fetch ALL salary revisions for these employees separately
    const employeeIds = employees.map(e => e.id);
    const allRevisions = await prisma.salaryRevision.findMany({
      where: { employeeId: { in: employeeIds } },
      include: {
        components: {
          include: {
            salaryHead: { include: { headType: true } }
          }
        }
      },
      orderBy: { effectiveFrom: 'desc' }
    });

    // Group revisions by employeeId → take the latest per employee
    const revisionMap = {};
    for (const rev of allRevisions) {
      if (!revisionMap[rev.employeeId]) {
        revisionMap[rev.employeeId] = rev; // first = latest due to orderBy desc
      }
    }

    console.log(`[PAYROLL] Processing ${employees.length} employees, ${allRevisions.length} revisions found`);

    const payrollRecordsData = [];

    for (const emp of employees) {
      // Check if attendance is approved for this cycle
      // If none of the records are approved, skip this employee
      const hasApprovedRecord = emp.attendances.some(a => a.isApproved);
      if (emp.attendances.length > 0 && !hasApprovedRecord) {
        console.log(`[PAYROLL] Skipping ${emp.empId} because attendance is not approved.`);
        continue;
      }

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
      if (considerLeaveEncash && emp.leaveEncashments && emp.leaveEncashments.length > 0) {
        leaveEncashment = emp.leaveEncashments.reduce((sum, enc) => sum + (enc.totalAmount || 0), 0);
      }

      let totalEarnings = 0, totalDeductions = 0;
      let basicPay = 0, hra = 0, specialAllow = 0, bonus = 0;
      let pfEmployee = 0, professionalTax = 0, tds = 0, otherDeductions = 0;

      if (revision) {
        console.log(`[PAYROLL] ${emp.empId} using revision ${revision.id} with ${revision.components.length} components`);

        revision.components.forEach(comp => {
          const typeName = comp.salaryHead?.headType?.name || '';
          const headName = comp.salaryHead?.description || '';
          const amount = parseFloat(comp.amount) || 0;

          if (typeName === 'Earning') {
            const prorated = amount * prorationFactor;
            totalEarnings += prorated;
            if (headName === 'Basic') basicPay = prorated;
            else if (headName === 'HRA') hra = prorated;
            else if (headName === 'Special Allowance') specialAllow = prorated;
          } else if (typeName === 'Deduction') {
            totalDeductions += amount;
            if (['Provident Fund', 'Employer PF'].includes(headName)) pfEmployee += amount;
            else if (headName === 'Professional Tax') professionalTax += amount;
            else if (headName === 'TDS') {
              if (considerTds) tds += amount;
              else totalDeductions -= amount; // Revert deduction if not considered
            }
            else otherDeductions += amount;
          } else if (typeName === 'Other') {
            if (headName === 'Bonus' && considerBonus) bonus = amount * prorationFactor;
            else if (headName === 'Leave Encashment' && considerLeaveEncash) leaveEncashment = amount;
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
        
        const conveyance = (parseFloat(emp.conveyance) || 0) * prorationFactor;
        const medical = (parseFloat(emp.medical) || 0) * prorationFactor;
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
        conveyance:       0,
        medical:          0,
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

    await prisma.payrollRecord.createMany({ data: payrollRecordsData });

    await prisma.payCycle.update({ where: { id }, data: { status: 'PROCESSING' } });

    console.log(`[PAYROLL] Done. Created ${payrollRecordsData.length} records`);

    return NextResponse.json({ success: true, processedCount: payrollRecordsData.length, records: payrollRecordsData });

  } catch (error) {
    console.error('[PAYROLL ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
