export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const lead = await prisma.marketingLead.findUnique({
      where: { id },
      include: {
        leadOwner: { select: { id: true, name: true } },
        client: true,
        opportunities: true,
        followups: {
          include: { createdBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const lead = await prisma.marketingLead.update({
      where: { id },
      data: {
        leadSource: body.leadSource,
        leadType: body.leadType,
        leadOwnerId: body.leadOwnerId,
        leadStatus: body.leadStatus,
        companyName: body.companyName,
        contactPerson: body.contactPerson,
        mobile: body.mobile,
        email: body.email,
        location: body.location,
        industry: body.industry,
        gstNo: body.gstNo,
        projectName: body.projectName,
        projectLocation: body.projectLocation,
        projectType: body.projectType,
        requirement: body.requirement,
        estimatedProjectValue: body.estimatedProjectValue ? parseFloat(body.estimatedProjectValue) : null,
        expectedStartDate: body.expectedStartDate ? new Date(body.expectedStartDate) : null,
        expectedClosingDate: body.expectedClosingDate ? new Date(body.expectedClosingDate) : null,
        competitor: body.competitor,
        remarks: body.remarks,
        documents: body.documents !== undefined ? body.documents : undefined
      }
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: error.message || 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await prisma.marketingLead.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
