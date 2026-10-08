export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parsePayrollDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  // Parse day-first UI formats before Date's locale-dependent parser.
  const match = text.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,}|\d{1,2})[-/ ](\d{4})$/);
  if (match) {
    const [, day, monthPart, year] = match;
    const month = /^\d+$/.test(monthPart)
      ? Number(monthPart) - 1
      : new Date(`${monthPart.slice(0, 3)} 1, 2000`).getMonth();
    if (month >= 0 && month <= 11) return new Date(Number(year), month, Number(day));
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const record = await prisma.payrollRecord.findUnique({
      where: { id },
      include: {
        payCycle: true,
        employee: {
          select: {
            id: true,
            name: true,
            empId: true,
            department: true,
            branch: true,
            designation: true,
            grade: true,
            bankAccountNo: true,
            bankName: true,
            pan: true,
            pfEmployee: true,
            esicNo: true,
            uan: true,
            email: true,
            phone: true,
          }
        }
      }
    });

    if (!record) {
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
    }

    const bonusIncentives = await prisma.bonusIncentive.findMany({
      where: {
        payCycleId: record.payCycleId,
        employeeId: record.employeeId
      }
    });

    const revisions = await prisma.salaryRevision.findMany({
      where: { employeeId: record.employeeId },
      include: {
        components: {
          include: {
            salaryHead: { include: { headType: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    const cycleEnd = parsePayrollDate(record.payCycle?.endDate);
    const applicableRevision = revisions
      .filter(revision => {
        const effectiveFrom = parsePayrollDate(revision.effectiveFrom);
        return !cycleEnd || !effectiveFrom || effectiveFrom <= cycleEnd;
      })
      .sort((a, b) => {
        const dateA = parsePayrollDate(a.effectiveFrom)?.getTime() ?? 0;
        const dateB = parsePayrollDate(b.effectiveFrom)?.getTime() ?? 0;
        return dateB - dateA || b.createdAt.getTime() - a.createdAt.getTime();
      })[0] || revisions[0];
    const periodDays = (record.workingDays || 0) + (record.absentDays || 0);
    const prorationFactor = periodDays > 0 ? (record.workingDays || 0) / periodDays : 0;
    const salaryBreakdown = { earnings: [], deductions: [] };
    for (const component of applicableRevision?.components || []) {
      const type = String(component.salaryHead?.headType?.name || '').trim().toLowerCase();
      const name = String(component.salaryHead?.description || '').trim();
      const normalizedName = name.toLowerCase();
      const amount = Number(component.amount) || 0;
      if (type === 'earning' && !['employer pf', 'employer provident fund'].includes(normalizedName)) {
        salaryBreakdown.earnings.push({
          id: component.salaryHeadId,
          name,
          amount: Math.round(amount * prorationFactor * 100) / 100
        });
      } else if (type === 'deduction') {
        salaryBreakdown.deductions.push({ id: component.salaryHeadId, name, amount: Math.round(amount * 100) / 100 });
      }
    }

    return NextResponse.json({ record, bonusIncentives, salaryBreakdown });
  } catch (error) {
    console.error('Error fetching payroll record:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.payrollRecord.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
    }

    const { employeeId, payCycleId } = existing;

    const basicPay = parseFloat(body.basicPay ?? existing.basicPay) || 0;
    const hra = parseFloat(body.hra ?? existing.hra) || 0;
    const conveyance = parseFloat(body.conveyance ?? existing.conveyance) || 0;
    const medical = parseFloat(body.medical ?? existing.medical) || 0;
    const specialAllow = parseFloat(body.specialAllow ?? existing.specialAllow) || 0;
    const leaveEncashment = parseFloat(body.leaveEncashment ?? existing.leaveEncashment) || 0;

    const arrears = parseFloat(body.arrears ?? 0) || 0;
    const bonus = parseFloat(body.bonus ?? 0) || 0;
    const incentive = parseFloat(body.incentive ?? 0) || 0;
    const gratuity = parseFloat(body.gratuity ?? 0) || 0;

    const pfEmployee = parseFloat(body.pfEmployee ?? existing.pfEmployee) || 0;
    const professionalTax = parseFloat(body.professionalTax ?? existing.professionalTax) || 0;
    const tds = parseFloat(body.tds ?? existing.tds) || 0;
    const otherDeductions = parseFloat(body.otherDeductions ?? existing.otherDeductions) || 0;

    const totalDeductions = Math.round((pfEmployee + professionalTax + tds + otherDeductions) * 100) / 100;
    const totalEarnings = basicPay + hra + conveyance + medical + specialAllow + leaveEncashment + arrears + bonus + incentive + gratuity;
    const grossPay = Math.round(totalEarnings * 100) / 100;
    const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

    // Update PayrollRecord
    const updatedRecord = await prisma.payrollRecord.update({
      where: { id },
      data: {
        basicPay,
        hra,
        conveyance,
        medical,
        specialAllow,
        leaveEncashment,
        bonus: Math.round((bonus + incentive) * 100) / 100,
        grossPay,
        pfEmployee,
        professionalTax,
        tds,
        otherDeductions,
        totalDeductions,
        netPay,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            empId: true,
            department: true,
            branch: true,
            designation: true,
            grade: true,
            bankAccountNo: true,
            bankName: true,
            pan: true,
            pfEmployee: true,
            esicNo: true,
            uan: true,
            email: true,
            phone: true,
          }
        }
      }
    });

    // Upsert BonusIncentive items
    const bonusUpsert = prisma.bonusIncentive.upsert({
      where: {
        employeeId_payCycleId_type: {
          employeeId,
          payCycleId,
          type: 'bonus'
        }
      },
      update: { amount: bonus, status: 'ADDED_TO_SALARY' },
      create: { employeeId, payCycleId, type: 'bonus', amount: bonus, status: 'ADDED_TO_SALARY' }
    });

    const incentiveUpsert = prisma.bonusIncentive.upsert({
      where: {
        employeeId_payCycleId_type: {
          employeeId,
          payCycleId,
          type: 'incentive'
        }
      },
      update: { amount: incentive, status: 'ADDED_TO_SALARY' },
      create: { employeeId, payCycleId, type: 'incentive', amount: incentive, status: 'ADDED_TO_SALARY' }
    });

    const arrearsMessage = body.arrearsBreakdown ? JSON.stringify(body.arrearsBreakdown) : null;
    
    // First, delete any lingering APPROVED arrears so they don't get double counted in the future
    await prisma.bonusIncentive.deleteMany({
      where: {
        employeeId,
        type: 'arrears',
        status: 'APPROVED',
        payCycleId: { not: payCycleId } // Don't delete if it happens to be the same one we are about to upsert
      }
    });

    const arrearsUpsert = prisma.bonusIncentive.upsert({
      where: {
        employeeId_payCycleId_type: {
          employeeId,
          payCycleId,
          type: 'arrears'
        }
      },
      update: { amount: arrears, status: 'ADDED_TO_SALARY', message: arrearsMessage },
      create: { employeeId, payCycleId, type: 'arrears', amount: arrears, status: 'ADDED_TO_SALARY', message: arrearsMessage }
    });

    const gratuityUpsert = prisma.bonusIncentive.upsert({
      where: {
        employeeId_payCycleId_type: {
          employeeId,
          payCycleId,
          type: 'gratuity'
        }
      },
      update: { amount: gratuity, status: 'ADDED_TO_SALARY' },
      create: { employeeId, payCycleId, type: 'gratuity', amount: gratuity, status: 'ADDED_TO_SALARY' }
    });

    const upsertPromises = [bonusUpsert, incentiveUpsert, arrearsUpsert, gratuityUpsert];

    if (body.wOff !== undefined) {
      upsertPromises.push(
        prisma.bonusIncentive.upsert({
          where: { employeeId_payCycleId_type: { employeeId, payCycleId, type: 'woff' } },
          update: { amount: parseFloat(body.wOff) || 0, status: 'ADDED_TO_SALARY' },
          create: { employeeId, payCycleId, type: 'woff', amount: parseFloat(body.wOff) || 0, status: 'ADDED_TO_SALARY' }
        })
      );
    }

    if (body.holidays !== undefined) {
      upsertPromises.push(
        prisma.bonusIncentive.upsert({
          where: { employeeId_payCycleId_type: { employeeId, payCycleId, type: 'holiday' } },
          update: { amount: parseFloat(body.holidays) || 0, status: 'ADDED_TO_SALARY' },
          create: { employeeId, payCycleId, type: 'holiday', amount: parseFloat(body.holidays) || 0, status: 'ADDED_TO_SALARY' }
        })
      );
    }

    if (body.nightShift !== undefined) {
      upsertPromises.push(
        prisma.bonusIncentive.upsert({
          where: { employeeId_payCycleId_type: { employeeId, payCycleId, type: 'night_shift' } },
          update: { amount: parseFloat(body.nightShift) || 0, status: 'ADDED_TO_SALARY' },
          create: { employeeId, payCycleId, type: 'night_shift', amount: parseFloat(body.nightShift) || 0, status: 'ADDED_TO_SALARY' }
        })
      );
    }

    if (body.coff !== undefined) {
      upsertPromises.push(
        prisma.bonusIncentive.upsert({
          where: { employeeId_payCycleId_type: { employeeId, payCycleId, type: 'coff' } },
          update: { amount: parseFloat(body.coff) || 0, status: 'ADDED_TO_SALARY' },
          create: { employeeId, payCycleId, type: 'coff', amount: parseFloat(body.coff) || 0, status: 'ADDED_TO_SALARY' }
        })
      );
    }

    await Promise.all(upsertPromises);

    const updatedBonusIncentives = await prisma.bonusIncentive.findMany({
      where: { payCycleId }
    });

    return NextResponse.json({
      success: true,
      record: updatedRecord,
      bonusIncentives: updatedBonusIncentives
    });
  } catch (error) {
    console.error('Error updating payroll record:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
