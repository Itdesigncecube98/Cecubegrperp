import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

function validateAmounts(amountValue, advanceValue, amountPaidValue) {
  const amount = Number(amountValue);
  const advanceAmount = Number(advanceValue);
  const amountPaid = Number(amountPaidValue);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Total amount must be greater than zero.' };
  }
  if (!Number.isFinite(advanceAmount) || advanceAmount < 0) {
    return { error: 'Advance amount must be zero or greater.' };
  }
  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    return { error: 'Amount paid cannot be negative.' };
  }

  const balanceAmount = Math.round((amount - advanceAmount - amountPaid) * 100) / 100;
  if (balanceAmount < 0) {
    return { error: 'Total amount cannot be less than the advance plus amount paid.' };
  }
  return { amount, advanceAmount, amountPaid, balanceAmount };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const employeeId = searchParams.get('employeeId');

    const where = {};
    if (department) {
      where.employee = { department };
    }
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const records = await prisma.leaveTravelAllowance.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            empId: true,
            department: true,
            position: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching LTA records:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const amounts = validateAmounts(data.amount, data.advanceAmount, 0);
    if (amounts.error) return NextResponse.json({ error: amounts.error }, { status: 400 });
    
    const record = await prisma.leaveTravelAllowance.create({
      data: {
        employeeId: data.employeeId,
        applicationNo: data.applicationNo,
        applicationDate: data.applicationDate ? new Date(data.applicationDate) : null,
        ltaAvailFrom: data.ltaAvailFrom ? new Date(data.ltaAvailFrom) : null,
        ltaAvailTo: data.ltaAvailTo ? new Date(data.ltaAvailTo) : null,
        availLeavesForLta: data.availLeavesForLta,
        remark: data.remark,
        amount: amounts.amount,
        dateOfAdvancePaid: data.dateOfAdvancePaid ? new Date(data.dateOfAdvancePaid) : null,
        advanceAmount: amounts.advanceAmount,
        bankAccount: data.bankAccount,
        amountPaid: 0,
        chequeNo: data.chequeNo,
        balanceAmount: amounts.balanceAmount,
      },
      include: {
        employee: {
          select: { name: true, empId: true }
        }
      }
    });
    
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error creating LTA record:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    
    // Status update only
    if (data.statusOnly && data.id) {
      const record = await prisma.leaveTravelAllowance.update({
        where: { id: data.id },
        data: { status: data.status }
      });
      return NextResponse.json(record);
    }
    
    if (!data.id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const existing = await prisma.leaveTravelAllowance.findUnique({ where: { id: data.id } });
    if (!existing) return NextResponse.json({ error: 'LTA application not found.' }, { status: 404 });

    const amounts = validateAmounts(
      data.amount ?? existing.amount,
      data.advanceAmount ?? existing.advanceAmount ?? 0,
      existing.amountPaid ?? 0
    );
    if (amounts.error) return NextResponse.json({ error: amounts.error }, { status: 400 });

    const record = await prisma.leaveTravelAllowance.update({
      where: { id: data.id },
      data: {
        employeeId: data.employeeId,
        applicationNo: data.applicationNo,
        applicationDate: data.applicationDate ? new Date(data.applicationDate) : null,
        ltaAvailFrom: data.ltaAvailFrom ? new Date(data.ltaAvailFrom) : null,
        ltaAvailTo: data.ltaAvailTo ? new Date(data.ltaAvailTo) : null,
        availLeavesForLta: data.availLeavesForLta,
        remark: data.remark,
        amount: amounts.amount,
        dateOfAdvancePaid: data.dateOfAdvancePaid ? new Date(data.dateOfAdvancePaid) : null,
        advanceAmount: amounts.advanceAmount,
        bankAccount: data.bankAccount,
        chequeNo: data.chequeNo,
        amountPaid: amounts.amountPaid,
        balanceAmount: amounts.balanceAmount,
        status: data.status || existing.status
      }
    });
    
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error updating LTA record:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    
    await prisma.leaveTravelAllowance.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting LTA record:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
