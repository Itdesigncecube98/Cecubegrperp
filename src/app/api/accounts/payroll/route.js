import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// Standard Indian PF/ESI rates
const PF_RATE       = 0.12;  // 12% of basic
const ESI_EMP_RATE  = 0.0075; // 0.75% of gross
const ESI_EMPF_RATE = 0.0325; // 3.25% of gross
const ESI_GROSS_THRESHOLD = 21000; // ESI not applicable above ₹21,000 gross

function computeDeductions(input) {
  const basic    = parseFloat(input.basicSalary)     || 0;
  const hra      = parseFloat(input.hra)             || 0;
  const conv     = parseFloat(input.conveyance)      || 0;
  const med      = parseFloat(input.medicalAllowance)|| 0;
  const other    = parseFloat(input.otherAllowances) || 0;
  const bonus    = parseFloat(input.bonus)           || 0;
  const otAmt    = parseFloat(input.overtimeAmount)  || 0;
  const lopDays  = parseFloat(input.lossOfPayDays)   || 0;
  const workDays = parseInt(input.workingDays)       || 26;
  const ptax     = parseFloat(input.professionalTax) || 200;

  const lopAmount = workDays > 0 ? (basic / workDays) * lopDays : 0;
  const gross     = basic + hra + conv + med + other + bonus + otAmt - lopAmount;

  const pf  = basic * PF_RATE;
  const pfE = basic * PF_RATE;

  const esi  = gross <= ESI_GROSS_THRESHOLD ? gross * ESI_EMP_RATE  : 0;
  const esiE = gross <= ESI_GROSS_THRESHOLD ? gross * ESI_EMPF_RATE : 0;

  const tds     = parseFloat(input.tds)             || 0;
  const otherD  = parseFloat(input.otherDeductions) || 0;
  const net     = gross - pf - esi - tds - ptax - otherD;

  return {
    grossSalary:      Math.round(gross * 100) / 100,
    pf:               Math.round(pf * 100)    / 100,
    pfEmployer:       Math.round(pfE * 100)   / 100,
    esi:              Math.round(esi * 100)   / 100,
    esiEmployer:      Math.round(esiE * 100)  / 100,
    lossOfPayAmount:  Math.round(lopAmount * 100) / 100,
    professionalTax:  ptax,
    netSalary:        Math.round(net * 100)   / 100
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id           = searchParams.get('id');
    const employeeId   = searchParams.get('employeeId');
    const payrollMonth = searchParams.get('payrollMonth'); // "YYYY-MM"
    const status       = searchParams.get('status');

    if (id) {
      const payroll = await prisma.payroll.findUnique({
        where: { id: parseInt(id) },
        include: {
          employee: { select: { id: true, name: true, empId: true, designation: true, department: true } }
        }
      });
      if (!payroll) return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
      return NextResponse.json(payroll);
    }

    const where = {};
    if (employeeId)   where.employeeId   = employeeId;
    if (payrollMonth) where.payrollMonth = payrollMonth;
    if (status)       where.status       = status;

    const payrolls = await prisma.payroll.findMany({
      where,
      orderBy: [{ payrollMonth: 'desc' }, { createdAt: 'desc' }],
      include: {
        employee: { select: { id: true, name: true, empId: true, designation: true, department: true } }
      }
    });

    // Aggregate for month summary
    if (payrollMonth && !employeeId) {
      const totalGross = payrolls.reduce((s, p) => s + (p.grossSalary || 0), 0);
      const totalNet   = payrolls.reduce((s, p) => s + (p.netSalary   || 0), 0);
      const totalPF    = payrolls.reduce((s, p) => s + (p.pf          || 0), 0);
      const totalESI   = payrolls.reduce((s, p) => s + (p.esi         || 0), 0);
      const totalTDS   = payrolls.reduce((s, p) => s + (p.tds         || 0), 0);
      return NextResponse.json({ payrolls, summary: { totalGross, totalNet, totalPF, totalESI, totalTDS } });
    }

    return NextResponse.json(payrolls);
  } catch (error) {
    console.error('GET /api/accounts/payroll:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { payrollMonth, employeeId, processedById, bulk } = data;

    // Bulk processing: generate payroll for all employees for a given month
    if (bulk && payrollMonth) {
      const employees = await prisma.employee.findMany({
        select: { id: true }
      });

      const results = [];
      for (const emp of employees) {
        // Skip if already exists
        const existing = await prisma.payroll.findUnique({
          where: { payrollMonth_employeeId: { payrollMonth, employeeId: emp.id } }
        });
        if (existing) {
          results.push({ employeeId: emp.id, skipped: true, status: existing.status });
          continue;
        }

        // Get working days for this month from attendance
        const [year, month] = payrollMonth.split('-');
        const startDate = `${year}-${month}-01`;
        const lastDay   = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate   = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        const attendanceCount = await prisma.attendance.count({
          where: {
            employeeId: emp.id,
            date:   { gte: startDate, lte: endDate },
            status: 'Present'
          }
        });

        const payrollRecord = await prisma.payroll.create({
          data: {
            payrollMonth,
            employeeId:   emp.id,
            workingDays:  lastDay,
            presentDays:  attendanceCount,
            status:       'DRAFT',
            processedById: processedById || null
          }
        });
        results.push({ employeeId: emp.id, payrollId: payrollRecord.id, status: 'DRAFT' });
      }

      return NextResponse.json({ generated: results.length, results }, { status: 201 });
    }

    // Single employee payroll
    if (!payrollMonth || !employeeId) {
      return NextResponse.json(
        { error: 'payrollMonth and employeeId are required' },
        { status: 400 }
      );
    }

    const computed = computeDeductions(data);

    const payroll = await prisma.payroll.upsert({
      where: { payrollMonth_employeeId: { payrollMonth, employeeId } },
      create: {
        payrollMonth,
        employeeId,
        basicSalary:      parseFloat(data.basicSalary)      || 0,
        hra:              parseFloat(data.hra)              || 0,
        conveyance:       parseFloat(data.conveyance)       || 0,
        medicalAllowance: parseFloat(data.medicalAllowance) || 0,
        otherAllowances:  parseFloat(data.otherAllowances)  || 0,
        tds:              parseFloat(data.tds)              || 0,
        otherDeductions:  parseFloat(data.otherDeductions)  || 0,
        lossOfPayDays:    parseFloat(data.lossOfPayDays)    || 0,
        overtimeHours:    parseFloat(data.overtimeHours)    || 0,
        overtimeAmount:   parseFloat(data.overtimeAmount)   || 0,
        bonus:            parseFloat(data.bonus)            || 0,
        workingDays:      parseInt(data.workingDays)        || 26,
        presentDays:      parseFloat(data.presentDays)      || 0,
        remarks:          data.remarks                      || null,
        processedById:    processedById                     || null,
        ...computed,
        status: 'PROCESSED'
      },
      update: {
        basicSalary:      parseFloat(data.basicSalary)      || 0,
        hra:              parseFloat(data.hra)              || 0,
        conveyance:       parseFloat(data.conveyance)       || 0,
        medicalAllowance: parseFloat(data.medicalAllowance) || 0,
        otherAllowances:  parseFloat(data.otherAllowances)  || 0,
        tds:              parseFloat(data.tds)              || 0,
        otherDeductions:  parseFloat(data.otherDeductions)  || 0,
        lossOfPayDays:    parseFloat(data.lossOfPayDays)    || 0,
        overtimeHours:    parseFloat(data.overtimeHours)    || 0,
        overtimeAmount:   parseFloat(data.overtimeAmount)   || 0,
        bonus:            parseFloat(data.bonus)            || 0,
        workingDays:      parseInt(data.workingDays)        || 26,
        presentDays:      parseFloat(data.presentDays)      || 0,
        remarks:          data.remarks                      || null,
        processedById:    processedById                     || null,
        ...computed,
        status: 'PROCESSED'
      },
      include: {
        employee: { select: { id: true, name: true, empId: true, designation: true } }
      }
    });

    return NextResponse.json(payroll, { status: 201 });
  } catch (error) {
    console.error('POST /api/accounts/payroll:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, action, approvedById, paymentRef, paymentDate, paymentMode, ...updates } = data;

    if (!id) return NextResponse.json({ error: 'Payroll id is required' }, { status: 400 });

    const pId = parseInt(id);

    if (action === 'APPROVE') {
      const payroll = await prisma.payroll.update({
        where: { id: pId },
        data: {
          status:      'APPROVED',
          approvedById: approvedById || null,
          approvedAt:  new Date()
        }
      });
      return NextResponse.json(payroll);
    }

    if (action === 'MARK_PAID') {
      const payroll = await prisma.payroll.update({
        where: { id: pId },
        data: {
          status:      'PAID',
          paymentDate: paymentDate  || new Date().toISOString().split('T')[0],
          paymentMode: paymentMode  || null,
          paymentRef:  paymentRef   || null
        }
      });
      return NextResponse.json(payroll);
    }

    if (action === 'CANCEL') {
      const payroll = await prisma.payroll.update({
        where: { id: pId },
        data: { status: 'CANCELLED' }
      });
      return NextResponse.json(payroll);
    }

    // Recalculate if salary components change
    if (Object.keys(updates).some(k => ['basicSalary','hra','conveyance','medicalAllowance',
        'otherAllowances','lossOfPayDays','overtimeAmount','bonus','tds','otherDeductions'].includes(k))) {
      const current = await prisma.payroll.findUnique({ where: { id: pId } });
      const merged = { ...current, ...updates };
      const computed = computeDeductions(merged);
      Object.assign(updates, computed);
    }

    const payroll = await prisma.payroll.update({
      where: { id: pId },
      data: updates,
      include: {
        employee: { select: { id: true, name: true, empId: true } }
      }
    });

    return NextResponse.json(payroll);
  } catch (error) {
    console.error('PUT /api/accounts/payroll:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
