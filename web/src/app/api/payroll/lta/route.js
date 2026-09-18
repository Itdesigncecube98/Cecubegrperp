import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

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
    
    const record = await prisma.leaveTravelAllowance.create({
      data: {
        employeeId: data.employeeId,
        applicationNo: data.applicationNo,
        applicationDate: data.applicationDate ? new Date(data.applicationDate) : null,
        ltaAvailFrom: data.ltaAvailFrom ? new Date(data.ltaAvailFrom) : null,
        ltaAvailTo: data.ltaAvailTo ? new Date(data.ltaAvailTo) : null,
        availLeavesForLta: data.availLeavesForLta,
        remark: data.remark,
        amount: data.amount ? parseFloat(data.amount) : null,
        dateOfAdvancePaid: data.dateOfAdvancePaid ? new Date(data.dateOfAdvancePaid) : null,
        advanceAmount: data.advanceAmount ? parseFloat(data.advanceAmount) : null,
        bankAccount: data.bankAccount,
        amountPaid: data.amountPaid ? parseFloat(data.amountPaid) : null,
        chequeNo: data.chequeNo,
        balanceAmount: data.balanceAmount ? parseFloat(data.balanceAmount) : null,
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
    
    // Full update
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
        amount: data.amount ? parseFloat(data.amount) : null,
        dateOfAdvancePaid: data.dateOfAdvancePaid ? new Date(data.dateOfAdvancePaid) : null,
        advanceAmount: data.advanceAmount ? parseFloat(data.advanceAmount) : null,
        bankAccount: data.bankAccount,
        amountPaid: data.amountPaid ? parseFloat(data.amountPaid) : null,
        chequeNo: data.chequeNo,
        balanceAmount: data.balanceAmount ? parseFloat(data.balanceAmount) : null,
        status: data.status || 'Pending'
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
