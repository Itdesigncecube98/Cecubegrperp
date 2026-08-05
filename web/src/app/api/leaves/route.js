import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const supervisorId = searchParams.get('supervisorId');
    const employeeId = searchParams.get('employeeId');

    const where = {};
    if (supervisorId) {
      where.employee = { supervisorId: supervisorId };
    }
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: true
      },
      orderBy: { appliedOn: 'desc' }
    });

    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const newRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: data.employeeId,
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        isHalfDay: data.isHalfDay || false,
        status: 'PENDING'
      }
    });
    return NextResponse.json(newRequest);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, status } = data;
    
    const updatedRequest = await prisma.leaveRequest.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    // If leave is approved, we should ideally deduct from balance.
    if (status === 'APPROVED') {
      const { employeeId, leaveType, startDate, endDate, isHalfDay } = updatedRequest;
      // Calculate days
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (isHalfDay) {
        diffDays = Math.max(0, diffDays - 0.5);
      }

      // Update balance
      const balance = await prisma.leaveBalance.findUnique({
        where: { employeeId }
      });
      
      if (balance) {
        let updateData = {};
        if (leaveType === 'Casual') {
          updateData.casualLeaves = Math.max(0, balance.casualLeaves - diffDays);
        } else if (leaveType === 'Sick') {
          updateData.sickLeaves = Math.max(0, balance.sickLeaves - diffDays);
        } else if (leaveType === 'Earned') {
          updateData.earnedLeaves = Math.max(0, balance.earnedLeaves - diffDays);
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.leaveBalance.update({
            where: { employeeId },
            data: updateData
          });
        }
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
