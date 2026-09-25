export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const ownerId = searchParams.get('ownerId');

    let where = {};
    if (status) where.leadStatus = status;
    if (ownerId) where.leadOwnerId = ownerId;

    const leads = await prisma.marketingLead.findMany({
      where,
      include: {
        leadOwner: { select: { id: true, name: true } },
        client: true,
        opportunities: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    
    // Auto-generate lead ID
    const count = await prisma.marketingLead.count();
    const leadId = `L-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Create client if it doesn't exist, or link to existing
    let clientRecord = null;
    if (body.clientId) {
       clientRecord = await prisma.marketingClient.findUnique({ where: { id: body.clientId } });
    }
    
    if (!clientRecord && body.companyName) {
       // check if company name already exists
       clientRecord = await prisma.marketingClient.findUnique({ where: { companyName: body.companyName }});
       if (!clientRecord) {
         clientRecord = await prisma.marketingClient.create({
            data: {
              companyName: body.companyName,
              contactPerson: body.contactPerson,
              mobile: body.mobile,
              email: body.email,
              address: body.location,
              industry: body.industry,
              gstNo: body.gstNo
            }
         });
       }
    }

    const lead = await prisma.marketingLead.create({
      data: {
        leadId,
        leadDate: body.leadDate ? new Date(body.leadDate) : new Date(),
        leadSource: body.leadSource,
        leadType: body.leadType,
        leadOwnerId: body.leadOwnerId,
        leadStatus: body.leadStatus || 'New',
        clientId: clientRecord ? clientRecord.id : null,
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
        documents: body.documents || null
      }
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: error.message || 'Failed to create lead' }, { status: 500 });
  }
}
