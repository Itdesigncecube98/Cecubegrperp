import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findApplicableSalaryRevision } from '@/lib/payrollDates';
import { isEmployerContributionHead } from '@/lib/payrollSalaryHeads';

function parseMessage(message) {
  try {
    return JSON.parse(message || '{}');
  } catch {
    return {};
  }
}

export async function GET(request, { params }) {
  try {
    const { recordId } = await params;
    if (!recordId) {
      return NextResponse.json({ error: 'Posted salary record ID is required.' }, { status: 400 });
    }

    const record = await prisma.payrollRecord.findFirst({
      where: { id: recordId, status: 'POSTED' },
      include: { employee: true, payCycle: true },
    });
    if (!record) {
      return NextResponse.json({ error: 'Posted salary record was not found.' }, { status: 404 });
    }

    const [bonusIncentives, revisions, yearRecords, attendance] = await Promise.all([
      prisma.bonusIncentive.findMany({
        where: { employeeId: record.employeeId, payCycleId: record.payCycleId },
      }),
      prisma.salaryRevision.findMany({
        where: { employeeId: record.employeeId },
        include: {
          components: { include: { salaryHead: { include: { headType: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payrollRecord.findMany({
        where: { employeeId: record.employeeId, status: 'POSTED' },
        select: {
          grossPay: true,
          tds: true,
          pfEmployee: true,
          payCycle: { select: { startDate: true } },
        },
      }),
      prisma.attendance.findMany({
        where: {
          employeeId: record.employeeId,
          date: { gte: record.payCycle.startDate, lte: record.payCycle.endDate },
        },
        select: { status: true },
      }),
    ]);

    const cycleStartDate = String(record.payCycle.startDate || '').slice(0, 10);
    const cycleEndDate = String(record.payCycle.endDate || '').slice(0, 10);
    const parsedCycleStart = new Date(`${cycleStartDate}T00:00:00`);
    const cycleYear = parsedCycleStart.getFullYear();
    const fiscalYearStart = `${parsedCycleStart.getMonth() >= 3 ? cycleYear : cycleYear - 1}-04-01`;
    const yearToDate = yearRecords
      .filter(item => {
        const startDate = String(item.payCycle.startDate || '').slice(0, 10);
        return startDate >= fiscalYearStart && startDate <= cycleEndDate;
      })
      .reduce((totals, item) => ({
        income: totals.income + (Number(item.grossPay) || 0),
        incomeTax: totals.incomeTax + (Number(item.tds) || 0),
        pf: totals.pf + (Number(item.pfEmployee) || 0),
      }), { income: 0, incomeTax: 0, pf: 0 });

    const applicableRevision = findApplicableSalaryRevision(revisions, record.payCycle.endDate);
    const periodDays = (record.workingDays || 0) + (record.absentDays || 0);
    const prorationFactor = periodDays > 0 ? (record.workingDays || 0) / periodDays : 0;
    const configuredEarnings = [];
    const employerContributions = [];
    for (const component of applicableRevision?.components || []) {
      const head = component.salaryHead;
      const headName = String(head?.description || '').trim();
      const type = String(head?.headType?.name || '').trim().toLowerCase();
      const infoAmount = Number(component.amount) || 0;
      if (isEmployerContributionHead(headName)) {
        employerContributions.push({ name: headName, amount: infoAmount });
      } else if (type === 'earning') {
        configuredEarnings.push({
          name: headName || 'Earning',
          infoAmount,
          amount: Math.round(infoAmount * prorationFactor * 100) / 100,
        });
      }
    }

    const savedBaseTotal = ['basicPay', 'hra', 'medical', 'conveyance', 'specialAllow']
      .reduce((total, key) => total + (Number(record[key]) || 0), 0);
    const configuredTotal = configuredEarnings.reduce((total, item) => total + item.amount, 0);
    const earnings = configuredEarnings.length && Math.abs(configuredTotal - savedBaseTotal) <= 0.01
      ? configuredEarnings
      : [
          ['Basic', record.basicPay],
          ['HRA', record.hra],
          ['Medical Allowance', record.medical],
          ['Conveyance', record.conveyance],
          ['Special Allowance', record.specialAllow],
        ]
          .filter(([, amount]) => Number(amount) !== 0)
          .map(([name, amount]) => ({ name, infoAmount: Number(amount) || 0, amount: Number(amount) || 0 }));

    const baseAndKnownEarnings = earnings.reduce((total, item) => total + item.amount, 0)
      + (Number(record.bonus) || 0)
      + (Number(record.leaveEncashment) || 0);
    const otherEarnings = Math.round(((Number(record.grossPay) || 0) - baseAndKnownEarnings) * 100) / 100;
    if (Number(record.bonus) > 0) {
      earnings.push({ name: 'Bonus', infoAmount: Number(record.bonus), amount: Number(record.bonus) });
    }
    if (Number(record.leaveEncashment) > 0) {
      earnings.push({
        name: 'Leave Encashment',
        infoAmount: Number(record.leaveEncashment),
        amount: Number(record.leaveEncashment),
      });
    }
    if (otherEarnings > 0.01) {
      earnings.push({ name: 'Other Earnings / Arrears', infoAmount: otherEarnings, amount: otherEarnings });
    }

    const pfArrear = bonusIncentives
      .filter(item => item.type === 'arrears' && item.status === 'ADDED_TO_SALARY')
      .reduce((total, item) => total + (Number(parseMessage(item.message)['Employee PF Arrears']) || 0), 0);
    const savedDeductionFieldsTotal = (Number(record.pfEmployee) || 0)
      + (Number(record.professionalTax) || 0)
      + (Number(record.tds) || 0)
      + (Number(record.otherDeductions) || 0);
    const otherDeductions = Math.max(0,
      (Number(record.otherDeductions) || 0)
      + (Number(record.totalDeductions) || 0)
      - savedDeductionFieldsTotal
      - pfArrear
    );
    const employeeDeductions = [
      { name: 'Employee PF', amount: Number(record.pfEmployee) || 0 },
      { name: 'Professional Tax', amount: Number(record.professionalTax) || 0 },
      { name: 'Income Tax', amount: Number(record.tds) || 0 },
      { name: 'Other Deductions', amount: otherDeductions },
    ].filter(item => item.amount > 0);
    if (pfArrear > 0.01) employeeDeductions.push({ name: 'Employee PF Arrear', amount: pfArrear });

    const employerArrears = bonusIncentives
      .filter(item => item.type === 'arrears' && item.status === 'ADDED_TO_SALARY')
      .flatMap(item => {
        const breakdown = parseMessage(item.message);
        return ['Employer PF Arrears', 'Employer ESIC Arrears', 'Employer LWF Arrears']
          .filter(name => Number(breakdown[name]) > 0)
          .map(name => ({ name: name.replace(' Arrears', ''), amount: Number(breakdown[name]) }));
      });

    const paidLeaves = attendance.filter(item => {
      const status = String(item.status || '').trim().toLowerCase();
      return ['cl', 'el', 'sl', 'paid leave', 'casual leave', 'earned leave', 'sick leave'].includes(status);
    }).length;

    return NextResponse.json({
      data: {
        record,
        employee: record.employee,
        payCycle: record.payCycle,
        earnings,
        employeeDeductions,
        employerContributions,
        employerArrears,
        yearToDate,
        paidLeaves,
      },
    });
  } catch (error) {
    console.error('Error fetching posted salary payslip:', error);
    return NextResponse.json({ error: 'Could not load posted salary payslip.' }, { status: 500 });
  }
}
