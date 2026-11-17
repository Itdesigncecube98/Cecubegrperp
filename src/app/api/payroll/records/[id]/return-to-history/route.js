import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const RETURNABLE_TYPES = new Set(['bonus', 'incentive', 'arrears', 'gratuity', 'lta']);

function ltaIdsFromMessage(message) {
  try {
    const parsed = JSON.parse(message || '{}');
    return Array.isArray(parsed.ltaIds) ? parsed.ltaIds.filter(id => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const type = String(body.type || '').toLowerCase();
    const amountFromBody = Number(body.amount);

    if (!RETURNABLE_TYPES.has(type)) {
      return NextResponse.json({ error: 'Unsupported salary item.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async tx => {
      const record = await tx.payrollRecord.findUnique({
        where: { id },
        include: { payCycle: true },
      });
      if (!record) return { error: 'Payroll record not found.', status: 404 };
      if (record.status !== 'PENDING' || record.payCycle.status === 'COMPLETED') {
        return { error: 'Salary items cannot be returned after approval or posting.', status: 409 };
      }

      const where = {
        employeeId_payCycleId_type: {
          employeeId: record.employeeId,
          payCycleId: record.payCycleId,
          type,
        },
      };
      const current = await tx.bonusIncentive.findUnique({ where });
      let amountToRemove = current?.status === 'ADDED_TO_SALARY'
        ? Number(current.amount) || 0
        : 0;
      if (amountToRemove > 0 && ['bonus', 'incentive'].includes(type)) {
        const addedBonusItems = await tx.bonusIncentive.findMany({
          where: {
            employeeId: record.employeeId,
            payCycleId: record.payCycleId,
            type: { in: ['bonus', 'incentive'] },
            status: 'ADDED_TO_SALARY',
          },
          select: { type: true, amount: true },
        });
        const bonusAmount = Number(addedBonusItems.find(item => item.type === 'bonus')?.amount) || 0;
        const incentiveAmount = Number(addedBonusItems.find(item => item.type === 'incentive')?.amount) || 0;
        const includedSourceTotal = Math.min(
          Math.max(0, Number(record.bonus) || 0),
          bonusAmount + incentiveAmount
        );
        const includedBonus = Math.min(bonusAmount, includedSourceTotal);
        const includedIncentive = Math.min(incentiveAmount, Math.max(0, includedSourceTotal - includedBonus));
        amountToRemove = type === 'bonus' ? includedBonus : includedIncentive;
      } else if (amountToRemove > 0) {
        const coreEarnings = (
          Number(record.basicPay) +
          Number(record.hra) +
          Number(record.conveyance) +
          Number(record.medical) +
          Number(record.specialAllow) +
          Number(record.leaveEncashment) +
          Number(record.bonus)
        ) || 0;
        amountToRemove = Math.min(amountToRemove, Math.max(0, Number(record.grossPay) - coreEarnings));
      }
      if (type === 'bonus' && current?.status !== 'ADDED_TO_SALARY' && amountFromBody > 0) {
        const incentive = await tx.bonusIncentive.findUnique({
          where: {
            employeeId_payCycleId_type: {
              employeeId: record.employeeId,
              payCycleId: record.payCycleId,
              type: 'incentive',
            },
          },
        });
        const includedIncentive = incentive?.status === 'ADDED_TO_SALARY'
          ? Number(incentive.amount) || 0
          : 0;
        const legacyBonus = Math.max(0, (Number(record.bonus) || 0) - includedIncentive);
        amountToRemove = Math.min(legacyBonus, amountFromBody);
      }
      if (amountToRemove > Number(record.grossPay) + 0.01) {
        return { error: 'The salary record no longer matches this item. Refresh and retry.', status: 409 };
      }

      if (type === 'lta') {
        const ltaIds = [...new Set([
          ...ltaIdsFromMessage(current?.message),
          ...(Array.isArray(body.sourceIds) ? body.sourceIds.filter(value => typeof value === 'string') : []),
        ])];
        if (ltaIds.length === 0) {
          return { error: 'No linked LTA applications were found to return.', status: 409 };
        }

        const ltaRecords = await tx.leaveTravelAllowance.findMany({
          where: { id: { in: ltaIds }, employeeId: record.employeeId },
          select: { id: true },
        });
        if (ltaRecords.length !== ltaIds.length) {
          return { error: 'Some linked LTA applications no longer exist. Refresh and retry.', status: 409 };
        }

        await tx.leaveTravelAllowance.updateMany({
          where: { id: { in: ltaIds }, employeeId: record.employeeId },
          data: { status: 'Pending' },
        });
      } else if (type === 'arrears') {
        await tx.bonusIncentive.updateMany({
          where: { employeeId: record.employeeId, type: 'arrears', status: 'APPROVED' },
          data: { status: 'PENDING' },
        });
      }

      if (current) {
        await tx.bonusIncentive.update({ where: { id: current.id }, data: { status: 'PENDING' } });
      } else if (
        type !== 'lta' &&
        !(type === 'arrears' && amountFromBody > 0 && await tx.bonusIncentive.findFirst({
          where: { employeeId: record.employeeId, type: 'arrears', status: 'PENDING' },
          select: { id: true },
        }))
      ) {
        if (!(amountFromBody > 0) || !Number.isFinite(amountFromBody)) {
          return { error: 'A positive item amount is required to create a pending history entry.', status: 400 };
        }
        await tx.bonusIncentive.create({
          data: {
            employeeId: record.employeeId,
            payCycleId: record.payCycleId,
            type,
            amount: amountFromBody,
            status: 'PENDING',
            ...(type === 'arrears' && body.arrearsBreakdown
              ? { message: JSON.stringify(body.arrearsBreakdown) }
              : {}),
          },
        });
      }

      const updatedRecord = amountToRemove > 0
        ? await tx.payrollRecord.update({
          where: { id },
          data: {
            ...(type === 'bonus' || type === 'incentive'
              ? { bonus: Math.max(0, Math.round((Number(record.bonus) - amountToRemove) * 100) / 100) }
              : {}),
            grossPay: Math.round((Number(record.grossPay) - amountToRemove) * 100) / 100,
            netPay: Math.round((Number(record.netPay) - amountToRemove) * 100) / 100,
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
              },
            },
          },
        })
        : await tx.payrollRecord.findUnique({
          where: { id },
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
              },
            },
          },
        });

      const bonusIncentives = await tx.bonusIncentive.findMany({ where: { payCycleId: record.payCycleId } });
      return { record: updatedRecord, bonusIncentives };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error returning salary item to pending history:', error);
    return NextResponse.json({ error: 'Failed to return salary item to pending history.' }, { status: 500 });
  }
}
