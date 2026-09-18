import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee ID is required' }, { status: 400 });
    }

    // Find the employee's latest salary revision
    const latestRevision = await prisma.salaryRevision.findFirst({
      where: { employeeId },
      orderBy: { effectiveFrom: 'desc' },
      include: { components: { include: { salaryHead: true } } }
    });

    if (!latestRevision) {
      return NextResponse.json({ success: false, error: 'No salary revision found for this employee.' }, { status: 404 });
    }

    // Find all past payroll records on or after the effective date
    const pastRecords = await prisma.payrollRecord.findMany({
      where: {
        employeeId,
        payCycle: {
          endDate: { gte: latestRevision.effectiveFrom }
        }
      },
      include: { payCycle: true },
      orderBy: { payCycle: { startDate: 'asc' } }
    });

    if (pastRecords.length === 0) {
      return NextResponse.json({ success: false, error: 'No past payroll records found falling after the latest revision.' }, { status: 404 });
    }

    let totalArrears = 0;
    let fromDate = null;
    let toDate = null;
    let totalOverlapDays = 0;

    const breakdown = {
      Basic: 0,
      HRA: 0,
      Medical: 0,
      Conveyance: 0,
      'Special Allowance': 0
    };

    pastRecords.forEach(record => {
      if (!fromDate || record.payCycle.startDate < fromDate) fromDate = record.payCycle.startDate;
      if (!toDate || record.payCycle.endDate > toDate) toDate = record.payCycle.endDate;

      const cycleStart = new Date(record.payCycle.startDate);
      const cycleEnd = new Date(record.payCycle.endDate);
      const revisionStart = new Date(latestRevision.effectiveFrom);
      
      const overlapStart = cycleStart > revisionStart ? cycleStart : revisionStart;
      const overlapEnd = cycleEnd;
      
      let overlapDays = 0;
      if (overlapEnd >= overlapStart) {
        overlapDays = Math.round((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
      }

      const totalDaysInCycle = Math.round((cycleEnd - cycleStart) / (1000 * 60 * 60 * 24)) + 1;
      
      const prorate = (overlapDays / totalDaysInCycle);
      const pastProrate = (record.workingDays || 0) / totalDaysInCycle;

      let expectedBasic = 0, expectedHra = 0, expectedMed = 0, expectedConv = 0, expectedSpl = 0;

      latestRevision.components.forEach(comp => {
        const name = comp.salaryHead.name.toLowerCase();
        const amt = comp.amount * prorate;
        if (name.includes('basic')) expectedBasic += amt;
        else if (name.includes('hra')) expectedHra += amt;
        else if (name.includes('medical')) expectedMed += amt;
        else if (name.includes('conveyance') || name.includes('transport')) expectedConv += amt;
        else if (name.includes('special')) expectedSpl += amt;
      });

      const oldMonthlyBasic = pastProrate > 0 ? (record.basicPay || 0) / pastProrate : 0;
      const oldMonthlyHra = pastProrate > 0 ? (record.hra || 0) / pastProrate : 0;
      const oldMonthlyMed = pastProrate > 0 ? (record.medical || 0) / pastProrate : 0;
      const oldMonthlyConv = pastProrate > 0 ? (record.conveyance || 0) / pastProrate : 0;
      const oldMonthlySpl = pastProrate > 0 ? (record.specialAllow || 0) / pastProrate : 0;

      const oldExpectedBasic = oldMonthlyBasic * prorate;
      const oldExpectedHra = oldMonthlyHra * prorate;
      const oldExpectedMed = oldMonthlyMed * prorate;
      const oldExpectedConv = oldMonthlyConv * prorate;
      const oldExpectedSpl = oldMonthlySpl * prorate;

      breakdown.Basic += (expectedBasic - oldExpectedBasic);
      breakdown.HRA += (expectedHra - oldExpectedHra);
      breakdown.Medical += (expectedMed - oldExpectedMed);
      breakdown.Conveyance += (expectedConv - oldExpectedConv);
      breakdown['Special Allowance'] += (expectedSpl - oldExpectedSpl);
      
      totalOverlapDays += overlapDays;
    });

    const finalBreakdown = {};
    for (const key in breakdown) {
      if (breakdown[key] > 0.01 || breakdown[key] < -0.01) {
        finalBreakdown[key] = Math.round(breakdown[key] * 100) / 100;
        totalArrears += finalBreakdown[key];
      }
    }
    finalBreakdown.fromDate = fromDate;
    finalBreakdown.toDate = toDate;
    finalBreakdown.overlapDays = totalOverlapDays;

    totalArrears = Math.round(totalArrears * 100) / 100;

    if (totalArrears <= 0) {
      return NextResponse.json({ success: false, error: 'No positive arrears calculated.' }, { status: 400 });
    }
    
    // We must attach this to a PayCycle. Let's use the most recent PayCycle
    const latestPayCycle = await prisma.payCycle.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!latestPayCycle) {
      return NextResponse.json({ success: false, error: 'No PayCycle exists to attach the arrears to.' }, { status: 400 });
    }

    // Check if there's already a PENDING arrear, if so, we can delete it
    const existingPending = await prisma.bonusIncentive.findFirst({
      where: {
        employeeId,
        type: 'arrears',
        status: 'PENDING'
      }
    });

    if (existingPending) {
      await prisma.bonusIncentive.delete({ where: { id: existingPending.id } });
    }

    // Wait, since payCycleId and employeeId and type must be unique,
    // if there is ALREADY an APPROVED or ADDED_TO_SALARY for THIS pay cycle, we might hit a unique constraint!
    // But arrears generated now will be paid in the NEXT payroll cycle.
    
    const arrearRecord = await prisma.bonusIncentive.upsert({
      where: {
        employeeId_payCycleId_type: {
          employeeId,
          payCycleId: latestPayCycle.id,
          type: 'arrears'
        }
      },
      update: {
        amount: totalArrears,
        status: 'PENDING',
        message: JSON.stringify(finalBreakdown)
      },
      create: {
        employeeId,
        payCycleId: latestPayCycle.id,
        type: 'arrears',
        amount: totalArrears,
        status: 'PENDING',
        message: JSON.stringify(finalBreakdown)
      }
    });

    return NextResponse.json({
      success: true,
      data: arrearRecord
    });

  } catch (error) {
    console.error('[ARREARS GENERATE ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
