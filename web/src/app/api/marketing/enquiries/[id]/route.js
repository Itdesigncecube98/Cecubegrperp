export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enquiryAccess, resolveEnquiryProjectId } from '@/lib/marketingEnquiryAccess';

const includeDetails = { leadOwner: { select: { id: true, name: true } }, client: true, opportunities: true, followups: { include: { createdBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } } };

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const lead = await prisma.marketingLead.findUnique({ where: { id }, include: includeDetails });
    if (!lead) return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
    const projectId = await resolveEnquiryProjectId(lead);
    const access = await enquiryAccess(request, projectId, 'Project Enquiry View');
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    return NextResponse.json({ ...lead, projectId });
  } catch (error) { console.error('Failed to fetch project enquiry:', error); return NextResponse.json({ error: 'Failed to fetch enquiry.' }, { status: 500 }); }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const existing = await prisma.marketingLead.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
    const projectId = await resolveEnquiryProjectId(existing);
    const access = await enquiryAccess(request, projectId, 'Project Enquiry Edit');
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const body = await request.json();
    if (body.projectId && body.projectId !== projectId) return NextResponse.json({ error: 'Project assignment cannot be changed here.' }, { status: 400 });
    const data = {};
    for (const key of ['leadSource','leadType','leadOwnerId','leadStatus','companyName','contactPerson','mobile','email','location','industry','gstNo','projectName','projectLocation','projectType','requirement','competitor','remarks','documents']) if (body[key] !== undefined) data[key] = body[key];
    if (body.estimatedProjectValue !== undefined) data.estimatedProjectValue = body.estimatedProjectValue ? Number(body.estimatedProjectValue) : null;
    if (body.expectedStartDate !== undefined) data.expectedStartDate = body.expectedStartDate ? new Date(body.expectedStartDate) : null;
    if (body.expectedClosingDate !== undefined) data.expectedClosingDate = body.expectedClosingDate ? new Date(body.expectedClosingDate) : null;
    return NextResponse.json(await prisma.marketingLead.update({ where: { id }, data }));
  } catch (error) { console.error('Failed to update project enquiry:', error); return NextResponse.json({ error: error.message || 'Failed to update enquiry.' }, { status: 500 }); }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const lead = await prisma.marketingLead.findUnique({ where: { id } });
    if (!lead) return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
    const access = await enquiryAccess(request, await resolveEnquiryProjectId(lead), 'Project Enquiry Delete');
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    await prisma.marketingLead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { console.error('Failed to delete project enquiry:', error); return NextResponse.json({ error: 'Failed to delete enquiry.' }, { status: 500 }); }
}
