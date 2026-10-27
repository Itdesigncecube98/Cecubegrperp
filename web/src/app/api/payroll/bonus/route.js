import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId');
    const type = searchParams.get('type') || 'bonus';

    if (!cycleId) {
      return NextResponse.json({ error: 'cycleId is required' }, { status: 400 });
    }

    const saved = await prisma.bonusIncentive.findMany({
      where: {
        payCycleId: cycleId,
        type: type
      }
    });

    return NextResponse.json(saved);
  } catch (error) {
    console.error('Error fetching bonuses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { cycleId, type, items, action } = await request.json();

    if (!cycleId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    let updatedCount = 0;

    for (const item of items) {
      if (!item.amount && !item.basis && !item.percent && !item.message) continue;

      if (action === 'SAVE') {
        // Upsert into BonusIncentive as a draft
        await prisma.bonusIncentive.upsert({
          where: {
            employeeId_payCycleId_type: {
              employeeId: item.employeeId,
              payCycleId: cycleId,
              type: type
            }
          },
          update: {
            basis: parseFloat(item.basis) || 0,
            percent: parseFloat(item.percent) || 0,
            amount: parseFloat(item.amount) || 0,
            message: item.message || null,
            status: 'SAVED'
          },
          create: {
            employeeId: item.employeeId,
            payCycleId: cycleId,
            type: type,
            basis: parseFloat(item.basis) || 0,
            percent: parseFloat(item.percent) || 0,
            amount: parseFloat(item.amount) || 0,
            message: item.message || null,
            status: 'SAVED'
          }
        });
        updatedCount++;
      } 
      else if (action === 'ADD_TO_SALARY') {
        if (!item.amount || item.amount <= 0) continue;
        const nextAmount = parseFloat(item.amount) || 0;
        const result = await prisma.$transaction(async tx => {
          const key = {
            employeeId_payCycleId_type: {
              employeeId: item.employeeId,
              payCycleId: cycleId,
              type
            }
          };
          const [previous, record] = await Promise.all([
            tx.bonusIncentive.findUnique({ where: key }),
            tx.payrollRecord.findFirst({ where: { payCycleId: cycleId, employeeId: item.employeeId } })
          ]);

          if (record && ['APPROVED', 'POSTED'].includes(String(record.status || '').toUpperCase())) {
            return { error: `Cannot change ${type} for ${item.employeeId}; payroll is ${record.status}.` };
          }

          const previousSalaryAmount = previous?.status === 'ADDED_TO_SALARY'
            ? Number(previous.amount) || 0
            : 0;
          await tx.bonusIncentive.upsert({
            where: key,
            update: {
              basis: parseFloat(item.basis) || 0,
              percent: parseFloat(item.percent) || 0,
              amount: nextAmount,
              message: item.message || null,
              status: 'ADDED_TO_SALARY'
            },
            create: {
              employeeId: item.employeeId,
              payCycleId: cycleId,
              type,
              basis: parseFloat(item.basis) || 0,
              percent: parseFloat(item.percent) || 0,
              amount: nextAmount,
              message: item.message || null,
              status: 'ADDED_TO_SALARY'
            }
          });

          if (!record) return { updated: false };
          const delta = Math.round((nextAmount - previousSalaryAmount) * 100) / 100;
          if (delta !== 0) {
            await tx.payrollRecord.update({
              where: { id: record.id },
              data: {
                bonus: Math.round(((Number(record.bonus) || 0) + delta) * 100) / 100,
                grossPay: Math.round(((Number(record.grossPay) || 0) + delta) * 100) / 100,
                netPay: Math.round(((Number(record.netPay) || 0) + delta) * 100) / 100,
              }
            });
          }
          return { updated: true };
        });

        if (result.error) {
          return NextResponse.json({ error: result.error }, { status: 409 });
        }
        if (result.updated) updatedCount++;
      }
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    console.error('Error in bonus API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
