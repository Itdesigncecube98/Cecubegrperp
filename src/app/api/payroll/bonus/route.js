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

        // Upsert into BonusIncentive with status ADDED_TO_SALARY
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
            status: 'ADDED_TO_SALARY'
          },
          create: {
            employeeId: item.employeeId,
            payCycleId: cycleId,
            type: type,
            basis: parseFloat(item.basis) || 0,
            percent: parseFloat(item.percent) || 0,
            amount: parseFloat(item.amount) || 0,
            message: item.message || null,
            status: 'ADDED_TO_SALARY'
          }
        });

        // Add to PayrollRecord
        const record = await prisma.payrollRecord.findFirst({
          where: {
            payCycleId: cycleId,
            employeeId: item.employeeId
          }
        });

        if (record) {
          await prisma.payrollRecord.update({
            where: { id: record.id },
            data: {
              bonus: record.bonus + parseFloat(item.amount)
            }
          });
          updatedCount++;
        }
      }
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    console.error('Error in bonus API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
