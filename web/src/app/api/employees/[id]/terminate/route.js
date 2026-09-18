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

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        employmentStatus: 'Terminated',
        terminationDate: data.terminationDate,
        leavingReasonId: data.leavingReasonId
      }
    });

    return NextResponse.json({ success: true, employee: updatedEmployee });
  } catch (error) {
    console.error('Error terminating employee:', error);
    return NextResponse.json({ error: 'Failed to terminate employee' }, { status: 500 });
  }
}
