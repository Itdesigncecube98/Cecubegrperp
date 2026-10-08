export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();

    const employee = await prisma.employee.findUnique({
      where: { id }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    let leavingReasonId = data.leavingReasonId;
    if (leavingReasonId === '__employee_deceased__') {
      const reason = await prisma.leavingReason.upsert({
        where: { name: 'Employee Deceased' },
        update: { isActive: true },
        create: { name: 'Employee Deceased', description: 'Employee is deceased.' },
        select: { id: true },
      });
      leavingReasonId = reason.id;
    }
    if (typeof leavingReasonId !== 'string' || !leavingReasonId) {
      return NextResponse.json({ error: 'Leaving reason is required' }, { status: 400 });
    }
    const reasonExists = await prisma.leavingReason.findUnique({
      where: { id: leavingReasonId },
      select: { id: true },
    });
    if (!reasonExists) {
      return NextResponse.json({ error: 'Leaving reason not found' }, { status: 400 });
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        employmentStatus: 'Terminated',
        terminationDate: data.terminationDate,
        leavingReasonId
      }
    });

    return NextResponse.json({ success: true, employee: updatedEmployee });
  } catch (error) {
    console.error('Error terminating employee:', error);
    return NextResponse.json({ error: 'Failed to terminate employee' }, { status: 500 });
  }
}
