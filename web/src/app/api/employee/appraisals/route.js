export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    // Fetch assignments where employee is either the subject, appraiser, or reviewer
    const assignments = await prisma.appraisalAssignment.findMany({
      where: {
        OR: [
          { employeeId: employeeId },
          { appraiserId: employeeId },
          { reviewerId: employeeId }
        ]
      },
      include: {
        process: true,
        employee: { select: { id: true, name: true, empId: true, department: true, designation: true } },
        appraiser: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
        questionSet: {
          include: {
            questions: true
          }
        },
        responses: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching employee appraisals:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
