export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const clients = await prisma.marketingClient.findMany({
      orderBy: { companyName: 'asc' },
      include: {
        leads: { select: { id: true, leadId: true } },
        opportunities: { select: { id: true, estimatedValue: true, status: true } }
      }
    });
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    
    if (!body.companyName) {
      return NextResponse.json({ error: 'Company Name is required' }, { status: 400 });
    }

    const existingClient = await prisma.marketingClient.findUnique({
      where: { companyName: body.companyName }
    });

    if (existingClient) {
      return NextResponse.json({ error: 'Client with this Company Name already exists' }, { status: 400 });
    }

    const client = await prisma.marketingClient.create({
      data: {
        companyName: body.companyName,
        contactPerson: body.contactPerson,
        mobile: body.mobile,
        email: body.email,
        industry: body.industry,
        address: body.address,
        gstNo: body.gstNo,
        companyPan: body.companyPan?.trim().toUpperCase() || null,
        nationality: body.nationality,
        state: body.state,
        previousBusinessHistory: body.previousBusinessHistory
      }
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: error.message || 'Failed to create client' }, { status: 500 });
  }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const { id, ...data } = body;
        if (!id) return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
        const updated = await prisma.marketingClient.update({
            where: { id },
            data
        });
        return NextResponse.json(updated);
    } catch(err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
