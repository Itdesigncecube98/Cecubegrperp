export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findApplicableSalaryRevision } from '@/lib/payrollDates';

function ltaIdsFromMessage(message) {
  try {
    const parsed = JSON.parse(message || '{}');
    return Array.isArray(parsed.ltaIds) ? parsed.ltaIds.filter(id => typeof id === 'string') : [];
  } catch {
    return [];
  }
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

    const [bonusIncentives, ltaRecords, linkedLtaAdditions] = await Promise.all([
      prisma.bonusIncentive.findMany({
        where: {
          payCycleId: record.payCycleId,
          employeeId: record.employeeId
        }
      }),
      prisma.leaveTravelAllowance.findMany({
        where: { employeeId: record.employeeId, balanceAmount: { gt: 0 } },
        select: { id: true, applicationNo: true, balanceAmount: true, status: true }
      }),
      prisma.bonusIncentive.findMany({
        where: { employeeId: record.employeeId, type: 'lta', status: 'ADDED_TO_SALARY' },
        select: { payCycleId: true, message: true }
      })
    ]);

    const currentLtaAddition = bonusIncentives.find(item => item.type === 'lta');
    const currentLtaIds = new Set(ltaIdsFromMessage(currentLtaAddition?.message));
    const linkedElsewhere = new Set(
      linkedLtaAdditions
        .filter(item => item.payCycleId !== record.payCycleId)
        .flatMap(item => ltaIdsFromMessage(item.message))
    );
    const availableLta = ltaRecords.filter(item =>
      item.status === 'Posted to Salary' &&
      (!linkedElsewhere.has(item.id) || currentLtaIds.has(item.id))
    );

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
    const applicableRevision = findApplicableSalaryRevision(revisions, record.payCycle?.endDate);
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

    return NextResponse.json({ record, bonusIncentives, salaryBreakdown, availableLta });
  } catch (error) {
    console.error('Error fetching payroll record:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await prisma.$transaction(async tx => {
      const existing = await tx.payrollRecord.findUnique({
        where: { id },
        include: { payCycle: true },
      });
      if (!existing) return { error: 'Payroll record not found', status: 404 };
      if (existing.status !== 'PENDING' || existing.payCycle.status === 'COMPLETED') {
        return { error: 'Salary slip cannot be changed after approval or posting.', status: 409 };
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
      const lta = parseFloat(body.lta ?? 0) || 0;
      const pfEmployee = parseFloat(body.pfEmployee ?? existing.pfEmployee) || 0;
      const professionalTax = parseFloat(body.professionalTax ?? existing.professionalTax) || 0;
      const tds = parseFloat(body.tds ?? existing.tds) || 0;
      const otherDeductions = parseFloat(body.otherDeductions ?? existing.otherDeductions) || 0;
      const ltaIds = [...new Set(Array.isArray(body.ltaIds) ? body.ltaIds.filter(id => typeof id === 'string') : [])];
      let ltaMessage;

      if (lta > 0) {
        const ltaRecords = await tx.leaveTravelAllowance.findMany({
          where: {
            id: { in: ltaIds },
            employeeId,
            status: 'Posted to Salary',
            balanceAmount: { gt: 0 },
          },
          select: { id: true, applicationNo: true, balanceAmount: true },
        });
        const ltaTotal = ltaRecords.reduce((sum, item) => sum + (Number(item.balanceAmount) || 0), 0);
        if (ltaRecords.length !== ltaIds.length || ltaIds.length === 0 || Math.abs(ltaTotal - lta) > 0.01) {
          return { error: 'LTA applications changed. Refresh the payslip before saving.', status: 409 };
        }
        ltaMessage = JSON.stringify({
          ltaIds,
          applications: ltaRecords.map(item => item.applicationNo).filter(Boolean),
        });
      }

      const totalDeductions = Math.round((pfEmployee + professionalTax + tds + otherDeductions) * 100) / 100;
      const totalEarnings = basicPay + hra + conveyance + medical + specialAllow + leaveEncashment + arrears + bonus + incentive + gratuity + lta;
      const grossPay = Math.round(totalEarnings * 100) / 100;
      const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

      const updatedRecord = await tx.payrollRecord.update({
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

      const upsertAddition = async (type, amount, message) => {
        const where = { employeeId_payCycleId_type: { employeeId, payCycleId, type } };
        const current = await tx.bonusIncentive.findUnique({ where });
        if (amount > 0) {
          return tx.bonusIncentive.upsert({
            where,
            update: { amount, status: 'ADDED_TO_SALARY', ...(message !== undefined ? { message } : {}) },
            create: { employeeId, payCycleId, type, amount, status: 'ADDED_TO_SALARY', ...(message !== undefined ? { message } : {}) }
          });
        }
        if (current?.status === 'ADDED_TO_SALARY') {
          return tx.bonusIncentive.update({ where, data: { status: 'PENDING' } });
        }
        return current;
      };

      if (arrears > 0) {
        await tx.bonusIncentive.deleteMany({
          where: { employeeId, type: 'arrears', status: 'APPROVED', payCycleId: { not: payCycleId } }
        });
      }
      const arrearsMessage = body.arrearsBreakdown ? JSON.stringify(body.arrearsBreakdown) : undefined;
      const upsertPromises = [
        upsertAddition('bonus', bonus),
        upsertAddition('incentive', incentive),
        upsertAddition('arrears', arrears, arrearsMessage),
        upsertAddition('gratuity', gratuity),
      ];

      if (lta > 0) {
        upsertPromises.push(upsertAddition('lta', lta, ltaMessage));
      }
      for (const [bodyKey, type] of [['wOff', 'woff'], ['holidays', 'holiday'], ['nightShift', 'night_shift'], ['coff', 'coff']]) {
        if (body[bodyKey] !== undefined) {
          const amount = parseFloat(body[bodyKey]) || 0;
          upsertPromises.push(tx.bonusIncentive.upsert({
            where: { employeeId_payCycleId_type: { employeeId, payCycleId, type } },
            update: { amount, status: 'ADDED_TO_SALARY' },
            create: { employeeId, payCycleId, type, amount, status: 'ADDED_TO_SALARY' }
          }));
        }
      }

      await Promise.all(upsertPromises);
      const updatedBonusIncentives = await tx.bonusIncentive.findMany({ where: { payCycleId } });
      return { record: updatedRecord, bonusIncentives: updatedBonusIncentives };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error updating payroll record:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
