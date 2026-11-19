import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { calculateSalaryRevisionArrears } from '@/lib/payrollArrears';

export async function POST(request, { params }) {
  try {
    const { id } = await params; // This is the current PayrollRecord ID
    
    // 1. Fetch current PayrollRecord to get employeeId
    const currentRecord = await prisma.payrollRecord.findUnique({
      where: { id },
      include: {
        payCycle: true,
        employee: true
      }
    });

    if (!currentRecord) {
      return NextResponse.json({ success: false, error: 'Payroll record not found' }, { status: 404 });
    }

    // 2. Fetch any APPROVED arrears for this employee
    const approvedArrears = await prisma.bonusIncentive.findMany({
      where: {
        employeeId: currentRecord.employeeId,
        type: 'arrears',
        status: 'APPROVED'
      }
    });

    let totalArrears = 0;
    let finalBreakdown = {};
    let fromDate = null;
    let toDate = null;
    let overlapDays = 0;

    // Combine all approved arrears
    approvedArrears.forEach(arrear => {
      totalArrears += arrear.amount;
      if (arrear.message) {
        try {
          const breakdown = JSON.parse(arrear.message);
          if (!fromDate || (breakdown.fromDate && breakdown.fromDate < fromDate)) fromDate = breakdown.fromDate;
          if (!toDate || (breakdown.toDate && breakdown.toDate > toDate)) toDate = breakdown.toDate;
          if (breakdown.overlapDays) overlapDays += breakdown.overlapDays;
          
          Object.keys(breakdown).forEach(key => {
            if (
              !['fromDate', 'toDate', 'overlapDays', 'pushedArrearsIds', 'Employer LWF Arrears'].includes(key) &&
              typeof breakdown[key] === 'number' &&
              Number.isFinite(breakdown[key])
            ) {
              finalBreakdown[key] = (finalBreakdown[key] || 0) + breakdown[key];
            }
          });
        } catch (e) {}
      }
    });

    const currentCalculation = await calculateSalaryRevisionArrears(prisma, currentRecord.employeeId);
    let supplementalSalaryArrears = 0;
    if (currentCalculation.status === 'calculated') {
      for (const [key, value] of Object.entries(currentCalculation.breakdown || {})) {
        if (
          ['fromDate', 'toDate', 'overlapDays', 'pushedArrearsIds', 'Employer LWF Arrears'].includes(key) ||
          typeof value !== 'number' ||
          !Number.isFinite(value)
        ) {
          continue;
        }
        if (Math.abs(Number(finalBreakdown[key]) || 0) <= 0.01 && Math.abs(value) > 0.01) {
          finalBreakdown[key] = value;
          if (!['Employee PF Arrears', 'Employer PF Arrears', 'Employer ESIC Arrears'].includes(key)) {
            supplementalSalaryArrears += value;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      total: Math.max(0, Math.round((totalArrears + supplementalSalaryArrears) * 100) / 100),
      breakdown: finalBreakdown,
      fromDate,
      toDate,
      overlapDays
    });

  } catch (error) {
    console.error('Error fetching approved arrears:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
