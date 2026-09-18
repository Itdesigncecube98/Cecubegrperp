import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

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

    if (approvedArrears.length === 0) {
      return NextResponse.json({ success: true, message: 'No approved arrears found.', breakdown: {}, total: 0 });
    }

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
            if (key !== 'fromDate' && key !== 'toDate' && key !== 'overlapDays') {
              finalBreakdown[key] = (finalBreakdown[key] || 0) + breakdown[key];
            }
          });
        } catch (e) {}
      }
    });

    return NextResponse.json({
      success: true,
      total: Math.round(totalArrears * 100) / 100,
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
