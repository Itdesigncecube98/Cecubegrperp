import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enquiryAccess, resolveEnquiryProjectId } from '@/lib/marketingEnquiryAccess';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const lead = await prisma.marketingLead.findUnique({ where: { id } });
    if (!lead) return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
    const access = await enquiryAccess(request, await resolveEnquiryProjectId(lead), 'Project Enquiry Follow-up');
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const body = await request.json();
    if (!body.createdById) return NextResponse.json({ error: 'Logged by is required.' }, { status: 400 });
    const followup = await prisma.$transaction(async tx => {
      if (body.leadStatus) await tx.marketingLead.update({ where: { id }, data: { leadStatus: body.leadStatus } });
      return tx.marketingFollowup.create({ data: {
      leadId: id, activityType: body.activityType, discussion: body.discussion, commitment: body.commitment,
      statusChangeDate: body.statusChangeDate ? new Date(body.statusChangeDate) : null,
      references: body.references?.trim() || null, nextFollowUpDate: body.nextFollowUpDate ? new Date(body.nextFollowUpDate) : null,
      nextAction: body.nextAction, createdById: body.createdById,
      }, include: { createdBy: { select: { id: true, name: true } } } });
    });
    return NextResponse.json(followup, { status: 201 });
  } catch (error) { console.error('Failed to save enquiry follow-up:', error); return NextResponse.json({ error: error.message || 'Failed to save follow-up.' }, { status: 500 }); }
}
