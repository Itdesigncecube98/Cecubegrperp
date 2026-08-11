import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id: id },
      include: {
        supervisor: { select: { id: true, name: true } },
        leaveBalance: true,
        _count: { select: { attendances: true, leaveRequests: true } }
      }
    });
    if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(employee);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { password, ...updateData } = data; // Don't update password here
    
    const updated = await prisma.employee.update({
      where: { id: id },
      data: updateData
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
