import { classifyStandardEarningHead, isEmployerContributionHead } from './payrollSalaryHeads';
import { parsePayrollDate } from './payrollDates';

const roundCurrency = value => Math.round(value * 100) / 100;
const employerContributionArrearKeys = [
  'Employer PF Arrears',
  'Employer ESIC Arrears',
];
const employeePfArrearKey = 'Employee PF Arrears';

function getEmployerContributionKey(name) {
  if (!isEmployerContributionHead(name)) return null;
  const normalizedName = String(name || '').toLowerCase();
  if (/\b(?:esic|esi)\b/.test(normalizedName)) return 'Employer ESIC Arrears';
  if (/\b(?:pf|epf|eps|provident fund)\b/.test(normalizedName)) return 'Employer PF Arrears';
  return null;
}

function getEmployerContributionTotals(revision) {
  const totals = Object.fromEntries(employerContributionArrearKeys.map(key => [key, 0]));
  for (const component of revision?.components || []) {
    const key = getEmployerContributionKey(component.salaryHead?.description || component.salaryHead?.name);
    if (key) totals[key] += Number(component.amount) || 0;
  }
  return totals;
}

function getEmployeePfTotal(revision) {
  return (revision?.components || []).reduce((total, component) => {
    const name = String(component.salaryHead?.description || component.salaryHead?.name || '');
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
    const headType = String(component.salaryHead?.headType?.name || '').trim().toLowerCase();
    const explicitlyEmployeePfHead = /\bemployee\s+(?:pf|epf|provident fund)\b|\b(?:pf|epf|provident fund)\s+employee\b/.test(normalizedName);
    const deductionPfHead = headType === 'deduction' && /\b(?:pf|epf|provident fund)\b/.test(normalizedName);
    return !isEmployerContributionHead(name) &&
      (explicitlyEmployeePfHead || deductionPfHead)
      ? total + (Number(component.amount) || 0)
      : total;
  }, 0);
}

export async function calculateSalaryRevisionArrears(tx, employeeId) {
  const revisions = await tx.salaryRevision.findMany({
    where: { employeeId },
    include: {
      components: {
        include: { salaryHead: { include: { headType: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  const latestRevision = revisions
    .filter(revision => parsePayrollDate(revision.effectiveFrom))
    .sort((a, b) => (
      parsePayrollDate(b.effectiveFrom).getTime() - parsePayrollDate(a.effectiveFrom).getTime() ||
      b.createdAt.getTime() - a.createdAt.getTime()
    ))[0];

  if (!latestRevision) return { status: 'no_revision' };

  const revisionStart = parsePayrollDate(latestRevision.effectiveFrom);
  const previousRevision = revisions
    .filter(revision => {
      const effectiveFrom = parsePayrollDate(revision.effectiveFrom);
      return effectiveFrom && effectiveFrom < revisionStart;
    })
    .sort((a, b) => (
      parsePayrollDate(b.effectiveFrom).getTime() - parsePayrollDate(a.effectiveFrom).getTime() ||
      b.createdAt.getTime() - a.createdAt.getTime()
    ))[0];
  const latestEmployerContributions = getEmployerContributionTotals(latestRevision);
  const previousEmployerContributions = getEmployerContributionTotals(previousRevision);
  const latestEmployeePf = getEmployeePfTotal(latestRevision);
  const previousEmployeePf = getEmployeePfTotal(previousRevision);
  const allRecords = await tx.payrollRecord.findMany({
    where: { employeeId },
    include: { payCycle: true },
    orderBy: { payCycle: { startDate: 'asc' } },
  });
  const pastRecords = allRecords.filter(record => {
    const cycleEnd = parsePayrollDate(record.payCycle.endDate);
    return cycleEnd && cycleEnd >= revisionStart;
  });

  if (pastRecords.length === 0) return { status: 'no_arrears' };

  const breakdown = {
    Basic: 0,
    HRA: 0,
    Medical: 0,
    Conveyance: 0,
    'Special Allowance': 0,
    'Employer PF Arrears': 0,
    'Employer ESIC Arrears': 0,
    [employeePfArrearKey]: 0,
  };
  let fromDate = null;
  let toDate = null;
  let earliestStart = Infinity;
  let latestEnd = -Infinity;
  let totalOverlapDays = 0;

  for (const record of pastRecords) {
    const cycleStart = parsePayrollDate(record.payCycle.startDate);
    const cycleEnd = parsePayrollDate(record.payCycle.endDate);
    if (!cycleStart || !cycleEnd) continue;
    if (cycleStart.getTime() < earliestStart) {
      earliestStart = cycleStart.getTime();
      fromDate = record.payCycle.startDate;
    }
    if (cycleEnd.getTime() > latestEnd) {
      latestEnd = cycleEnd.getTime();
      toDate = record.payCycle.endDate;
    }

    const overlapStart = cycleStart > revisionStart ? cycleStart : revisionStart;
    const overlapDays = overlapStart <= cycleEnd
      ? Math.round((cycleEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1
      : 0;
    const totalDaysInCycle = Math.round((cycleEnd - cycleStart) / (1000 * 60 * 60 * 24)) + 1;
    if (totalDaysInCycle <= 0) continue;

    const prorate = overlapDays / totalDaysInCycle;
    const pastProrate = (record.workingDays || 0) / totalDaysInCycle;
    const revised = { Basic: 0, HRA: 0, Medical: 0, Conveyance: 0, 'Special Allowance': 0 };

    for (const component of latestRevision.components) {
      const headName = String(component.salaryHead?.description || component.salaryHead?.name || '').trim();
      const headType = String(component.salaryHead?.headType?.name || '').trim().toLowerCase();
      if (headType !== 'earning') continue;

      const category = classifyStandardEarningHead(headName);
      const amount = Number(component.amount) || 0;
      if (category === 'basic') revised.Basic += amount * prorate;
      else if (category === 'hra') revised.HRA += amount * prorate;
      else if (category === 'medical') revised.Medical += amount * prorate;
      else if (category === 'conveyance') revised.Conveyance += amount * prorate;
      else if (headName.toLowerCase().includes('special')) revised['Special Allowance'] += amount * prorate;
    }

    const oldMonthly = {
      Basic: record.basicPay || 0,
      HRA: record.hra || 0,
      Medical: record.medical || 0,
      Conveyance: record.conveyance || 0,
      'Special Allowance': record.specialAllow || 0,
    };

    for (const key of Object.keys(breakdown)) {
      if (employerContributionArrearKeys.includes(key) || key === employeePfArrearKey) continue;
      const oldExpected = pastProrate > 0 ? (oldMonthly[key] / pastProrate) * prorate : 0;
      breakdown[key] += revised[key] - oldExpected;
    }
    if (previousRevision) {
      for (const key of employerContributionArrearKeys) {
        breakdown[key] += (latestEmployerContributions[key] - previousEmployerContributions[key]) * prorate;
      }
      const recordedEmployeePf = Number(record.pfEmployee) || previousEmployeePf;
      breakdown[employeePfArrearKey] += (latestEmployeePf - recordedEmployeePf) * prorate;
    }
    totalOverlapDays += overlapDays;
  }

  const finalBreakdown = {};
  let totalArrears = 0;
  let hasEmployerContributionArrears = false;
  let hasEmployeePfArrears = false;
  for (const [key, value] of Object.entries(breakdown)) {
    if (value > 0.01 || value < -0.01) {
      finalBreakdown[key] = roundCurrency(value);
      if (employerContributionArrearKeys.includes(key)) {
        hasEmployerContributionArrears = true;
      } else if (key === employeePfArrearKey) {
        hasEmployeePfArrears = true;
      } else {
        totalArrears += finalBreakdown[key];
      }
    }
  }
  finalBreakdown.fromDate = fromDate;
  finalBreakdown.toDate = toDate;
  finalBreakdown.overlapDays = totalOverlapDays;
  totalArrears = roundCurrency(totalArrears);

  if (totalArrears <= 0 && !hasEmployerContributionArrears && !hasEmployeePfArrears) {
    return { status: 'no_arrears' };
  }

  return {
    status: 'calculated',
    amount: Math.max(totalArrears, 0),
    breakdown: finalBreakdown,
  };
}

export async function generateSalaryRevisionArrears(tx, employeeId) {
  const calculation = await calculateSalaryRevisionArrears(tx, employeeId);
  if (calculation.status !== 'calculated') return calculation;

  const { amount, breakdown } = calculation;

  const openPayCycles = await tx.payCycle.findMany({
    where: { status: { not: 'COMPLETED' } },
    orderBy: { createdAt: 'desc' },
    include: {
      payrollRecords: {
        where: { employeeId },
        select: { status: true },
      },
    },
  });
  const payCycle = openPayCycles.find(cycle =>
    cycle.payrollRecords.length === 0 || cycle.payrollRecords.every(record => record.status === 'PENDING')
  );
  if (!payCycle) return { status: 'no_open_pay_cycle' };

  const currentEntry = await tx.bonusIncentive.findUnique({
    where: {
      employeeId_payCycleId_type: {
        employeeId,
        payCycleId: payCycle.id,
        type: 'arrears',
      },
    },
  });
  if (currentEntry && currentEntry.status !== 'PENDING') {
    return { status: 'blocked', reason: 'Arrears in the latest open pay cycle are already approved or added to salary.' };
  }

  await tx.bonusIncentive.deleteMany({
    where: {
      employeeId,
      type: 'arrears',
      status: 'PENDING',
      payCycleId: { not: payCycle.id },
    },
  });

  const record = await tx.bonusIncentive.upsert({
    where: {
      employeeId_payCycleId_type: {
        employeeId,
        payCycleId: payCycle.id,
        type: 'arrears',
      },
    },
    update: {
      amount,
      status: 'PENDING',
      message: JSON.stringify(breakdown),
    },
    create: {
      employeeId,
      payCycleId: payCycle.id,
      type: 'arrears',
      amount,
      status: 'PENDING',
      message: JSON.stringify(breakdown),
    },
  });

  return { status: 'generated', record };
}
