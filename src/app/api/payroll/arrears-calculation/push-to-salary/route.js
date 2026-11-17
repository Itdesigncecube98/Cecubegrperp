import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseBreakdown(message) {
  try {
    const value = JSON.parse(message || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function mergeBreakdowns(existing, incoming) {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (['fromDate', 'toDate', 'overlapDays', 'pushedArrearsIds'].includes(key)) continue;
    if (typeof value === 'number' && Number.isFinite(value)) {
      merged[key] = (Number(merged[key]) || 0) + value;
    } else if (merged[key] === undefined) {
      merged[key] = value;
    }
  }

  const fromDates = [existing.fromDate, incoming.fromDate].filter(Boolean).map(String).sort();
  const toDates = [existing.toDate, incoming.toDate].filter(Boolean).map(String).sort();
  if (fromDates.length) merged.fromDate = fromDates[0];
  if (toDates.length) merged.toDate = toDates[toDates.length - 1];
  const overlapDays = (Number(existing.overlapDays) || 0) + (Number(incoming.overlapDays) || 0);
  if (overlapDays > 0) merged.overlapDays = overlapDays;
  return merged;
}

const money = value => Math.round((Number(value) || 0) * 100) / 100;

export async function POST(request) {
  try {
    const { arrearsId, cycleId } = await request.json();
    if (!arrearsId || !cycleId) {
      return NextResponse.json({ error: 'Arrears item and pay cycle are required.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async tx => {
      const source = await tx.bonusIncentive.findUnique({ where: { id: arrearsId } });
      if (!source || source.type !== 'arrears') {
        return { error: 'Arrears history item not found.', status: 404 };
      }
      if (source.status !== 'APPROVED' || money(source.amount) <= 0) {
        return { error: 'Only approved arrears can be pushed to salary.', status: 409 };
      }

      const cycle = await tx.payCycle.findUnique({ where: { id: cycleId } });
      if (!cycle) return { error: 'Pay cycle not found.', status: 404 };
      if (cycle.status === 'COMPLETED') {
        return { error: 'Arrears cannot be added to a completed pay cycle.', status: 409 };
      }

      const record = await tx.payrollRecord.findFirst({
        where: { employeeId: source.employeeId, payCycleId: cycleId },
      });
      if (!record) {
        return { error: 'No salary calculation exists for this employee in the selected cycle. Calculate payroll first.', status: 409 };
      }
      if (record.status !== 'PENDING') {
        return { error: 'Arrears cannot be changed after the salary is approved or posted.', status: 409 };
      }

      const key = {
        employeeId_payCycleId_type: {
          employeeId: source.employeeId,
          payCycleId: cycleId,
          type: 'arrears',
        },
      };
      const current = await tx.bonusIncentive.findUnique({ where: key });
      const currentBreakdown = current?.status === 'ADDED_TO_SALARY'
        ? parseBreakdown(current.message)
        : {};
      const pushedArrearsIds = current?.status === 'ADDED_TO_SALARY' &&
        Array.isArray(currentBreakdown.pushedArrearsIds)
        ? currentBreakdown.pushedArrearsIds.filter(id => typeof id === 'string')
        : [];
      if (pushedArrearsIds.includes(source.id)) {
        return { error: 'This arrears item is already included in the selected payslip.', status: 409 };
      }

      const previousAmount = current?.status === 'ADDED_TO_SALARY' ? money(current.amount) : 0;
      const totalAmount = money(previousAmount + money(source.amount));
      const mergedBreakdown = mergeBreakdowns(
        current?.status === 'ADDED_TO_SALARY' ? currentBreakdown : {},
        parseBreakdown(source.message)
      );
      mergedBreakdown.pushedArrearsIds = [...new Set([...pushedArrearsIds, source.id])];
      const message = JSON.stringify(mergedBreakdown);
      const item = await tx.bonusIncentive.upsert({
        where: key,
        update: { amount: totalAmount, message, status: 'ADDED_TO_SALARY' },
        create: {
          employeeId: source.employeeId,
          payCycleId: cycleId,
          type: 'arrears',
          amount: totalAmount,
          message,
          status: 'ADDED_TO_SALARY',
        },
      });

      if (source.id !== item.id) {
        await tx.bonusIncentive.update({
          where: { id: source.id },
          data: { status: 'TRANSFERRED_TO_SALARY' },
        });
      }

      const delta = money(totalAmount - previousAmount);
      const updatedRecord = delta === 0
        ? record
        : await tx.payrollRecord.update({
          where: { id: record.id },
          data: {
            grossPay: money(Number(record.grossPay) + delta),
            netPay: money(Number(record.netPay) + delta),
          },
        });

      return { item, record: updatedRecord };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error pushing arrears to salary:', error);
    return NextResponse.json({ error: error.message || 'Failed to push arrears to salary.' }, { status: 500 });
  }
}
