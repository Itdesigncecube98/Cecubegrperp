export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const processId = searchParams.get('processId');
    const department = searchParams.get('department');
    const employeeId = searchParams.get('employeeId');

    // Build employee filter
    const whereClause = {};
    if (department && department !== 'Select') whereClause.department = department;
    if (employeeId && employeeId !== 'Select') whereClause.id = employeeId;

    // Fetch employees matching the filter
    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        supervisor: {
          select: {
            id: true,
            name: true,
            supervisor: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        appraisalsAsEmployee: {
          where: processId ? { processId } : undefined,
          include: {
            questionSet: true,
            appraiser: { select: { name: true } },
            reviewer: { select: { name: true } }
          }
        }
      }
    });

    // Map employees to the format needed by the UI
    const formattedData = employees.map(emp => {
      // Get the assignment for this process, if any
      const assignment = processId 
        ? emp.appraisalsAsEmployee.find(a => a.processId === processId)
        : null;

      // Determine the default Appraiser and Reviewer based on the Org Chart if not assigned
      const defaultAppraiserName = emp.supervisor?.name || 'Unassigned';
      const defaultReviewerName = emp.supervisor?.supervisor?.name || 'Unassigned';

      return {
        id: emp.id,
        name: emp.name,
        position: emp.position || emp.designation || 'N/A',
        department: emp.department || 'N/A',
        
        qset: assignment?.questionSet?.name || 'Not Applied',
        appAssign: assignment?.assignmentStatus || 'Not Approved',
        self: assignment?.selfAppraisalStatus || 'Pending',
        appName: assignment?.appraiser?.name || defaultAppraiserName,
        appStatus: assignment?.appraisalStatus || 'Pending',
        revName: assignment?.reviewer?.name || defaultReviewerName,
        revStatus: assignment?.reviewerStatus || 'Pending',
        
        // Return computed IDs so the frontend can send them if needed
        computedAppraiserId: emp.supervisor?.id || null,
        computedReviewerId: emp.supervisor?.supervisor?.id || null,
      };
    });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching appraisal assignments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { employeeIds, processId, questionSetId } = data;

    if (!employeeIds || !processId || !questionSetId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the selected employees to get their supervisors
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      include: {
        supervisor: {
          select: {
            id: true,
            supervisor: {
              select: { id: true }
            }
          }
        }
      }
    });

    // Upsert assignments for each employee
    const results = await Promise.all(employees.map(emp => {
      const appraiserId = emp.supervisor?.id || null;
      const reviewerId = emp.supervisor?.supervisor?.id || null;

      return prisma.appraisalAssignment.upsert({
        where: {
          processId_employeeId: {
            processId: processId,
            employeeId: emp.id
          }
        },
        update: {
          questionSetId,
          appraiserId,
          reviewerId,
          assignmentStatus: 'Not Approved', // Reset or maintain depending on business logic
        },
        create: {
          processId,
          employeeId: emp.id,
          questionSetId,
          appraiserId,
          reviewerId,
          assignmentStatus: 'Not Approved',
          selfAppraisalStatus: 'Pending',
          appraisalStatus: 'Pending',
          reviewerStatus: 'Pending',
        }
      });
    }));

    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    console.error('Error applying question set:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
