export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/payroll/govt-form-submissions?payCycleId=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const payCycleId = searchParams.get('payCycleId');

    const where = {};
    if (payCycleId && payCycleId !== 'Select Here') {
      where.payCycleId = payCycleId;
    }

    const submissions = await prisma.govtFormSubmission.findMany({
      where,
      include: { payCycle: { select: { id: true, name: true, startDate: true, endDate: true } } },
      orderBy: { generatedAt: 'desc' }
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Error fetching govt form submissions:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

// POST /api/payroll/govt-form-submissions
// body: { payCycleId, formType, recordCount, organisation, notes, action }
// action: 'GENERATE' | 'MARK_SENT'
export async function POST(request) {
  try {
    const body = await request.json();
    const { payCycleId, formType, recordCount, organisation, notes, action, submissionId, sentBy } = body;

    if (action === 'GENERATE') {
      if (!payCycleId || !formType) {
        return NextResponse.json({ error: 'payCycleId and formType are required' }, { status: 400 });
      }

      // Check if already sent to govt — block re-generation for that cycle
      const existingSent = await prisma.govtFormSubmission.findFirst({
        where: { payCycleId, formType: { in: [formType, 'ALL'] }, status: 'SENT_TO_GOVT' }
      });
      if (existingSent) {
        return NextResponse.json({
          error: 'These government forms have already been sent to the government and cannot be regenerated.',
          locked: true
        }, { status: 409 });
      }

      // Upsert: update existing GENERATED entry or create new one
      const existing = await prisma.govtFormSubmission.findFirst({
        where: { payCycleId, formType, status: 'GENERATED' }
      });

      let submission;
      if (existing) {
        submission = await prisma.govtFormSubmission.update({
          where: { id: existing.id },
          data: { generatedAt: new Date(), recordCount: recordCount || 0, organisation, notes }
        });
      } else {
        submission = await prisma.govtFormSubmission.create({
          data: { payCycleId, formType, recordCount: recordCount || 0, organisation, notes, status: 'GENERATED' }
        });
      }

      return NextResponse.json(submission);
    }

    if (action === 'MARK_SENT') {
      if (!submissionId && !payCycleId) {
        return NextResponse.json({ error: 'submissionId or payCycleId is required' }, { status: 400 });
      }

      if (submissionId) {
        // Mark a specific submission as sent
        const updated = await prisma.govtFormSubmission.update({
          where: { id: submissionId },
          data: { status: 'SENT_TO_GOVT', sentToGovtAt: new Date(), sentBy: sentBy || 'System' }
        });
        return NextResponse.json(updated);
      } else {
        // Mark ALL submissions for the pay cycle as sent
        await prisma.govtFormSubmission.updateMany({
          where: { payCycleId, status: 'GENERATED' },
          data: { status: 'SENT_TO_GOVT', sentToGovtAt: new Date(), sentBy: sentBy || 'System' }
        });
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: 'Invalid action. Use GENERATE or MARK_SENT.' }, { status: 400 });
  } catch (error) {
    console.error('Error managing govt form submission:', error);
    return NextResponse.json({ error: 'Failed to process submission' }, { status: 500 });
  }
}
