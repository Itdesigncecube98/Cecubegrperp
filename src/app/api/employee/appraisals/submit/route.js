export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function POST(request) {
  try {
    const data = await request.json();
    const { assignmentId, employeeId, role, responses } = data;

    if (!assignmentId || !employeeId || !role || !responses) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify assignment and role
    const assignment = await prisma.appraisalAssignment.findUnique({
      where: { id: assignmentId }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    let isAuthorized = false;
    let updateData = {};

    if (role === 'self' && assignment.employeeId === employeeId) {
      isAuthorized = true;
      updateData = { selfAppraisalStatus: 'Submitted', assignmentStatus: 'Pending Appraiser' };
    } else if (role === 'appraiser' && assignment.appraiserId === employeeId) {
      isAuthorized = true;
      updateData = { appraisalStatus: 'Submitted', assignmentStatus: 'Pending Reviewer' };
    } else if (role === 'reviewer' && assignment.reviewerId === employeeId) {
      isAuthorized = true;
      updateData = { reviewerStatus: 'Approved', assignmentStatus: 'Approved' };
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized role for this assignment' }, { status: 403 });
    }

    // Process responses
    const responsePromises = responses.map(res => {
      const respUpdate = {};
      if (role === 'self') {
        respUpdate.selfScore = Number(res.score);
        respUpdate.selfComment = res.comment;
      } else if (role === 'appraiser') {
        respUpdate.appraiserScore = Number(res.score);
        respUpdate.appraiserComment = res.comment;
      } else if (role === 'reviewer') {
        respUpdate.reviewerScore = Number(res.score);
        respUpdate.reviewerComment = res.comment;
      }

      return prisma.appraisalResponse.upsert({
        where: {
          assignmentId_questionId: {
            assignmentId,
            questionId: res.questionId
          }
        },
        update: respUpdate,
        create: {
          assignmentId,
          questionId: res.questionId,
          ...respUpdate
        }
      });
    });

    // Run transaction
    await prisma.$transaction([
      ...responsePromises,
      prisma.appraisalAssignment.update({
        where: { id: assignmentId },
        data: updateData
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting appraisal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
