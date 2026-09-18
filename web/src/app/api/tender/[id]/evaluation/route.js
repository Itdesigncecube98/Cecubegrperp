export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const evaluation = await prisma.tenderEvaluation.create({
      data: {
        tenderId: id,
        clientProfileScore: parseInt(body.clientProfileScore) || 0,
        projectExpScore: parseInt(body.projectExpScore) || 0,
        techEligibleScore: parseInt(body.techEligibleScore) || 0,
        finEligibleScore: parseInt(body.finEligibleScore) || 0,
        similarWorkScore: parseInt(body.similarWorkScore) || 0,
        locationScore: parseInt(body.locationScore) || 0,
        paymentTermsScore: parseInt(body.paymentTermsScore) || 0,
        projectMarginScore: parseInt(body.projectMarginScore) || 0,
        totalScore: parseInt(body.totalScore) || 0,
        decision: body.decision,
        reason: body.reason,
        expectedMargin: body.expectedMargin ? parseFloat(body.expectedMargin) : null,
        competition: body.competition,
        resourceAvail: body.resourceAvail,
        risk: body.risk,
        remarks: body.remarks
      }
    });

    // Also push audit log
    await prisma.tenderAuditLog.create({
        data: {
            tenderId: id,
            action: 'EvaluationSubmitted',
            newValue: JSON.stringify({ decision: body.decision, score: body.totalScore }),
            remarks: body.remarks || 'GO/NO-GO Evaluation completed',
            userId: body.userId
        }
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error) {
    console.error('Error saving evaluation:', error);
    return NextResponse.json({ error: error.message || 'Failed to save evaluation' }, { status: 500 });
  }
}
