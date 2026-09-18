import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    const contractors = await prisma.contractor.findMany({
      where: whereClause,
      orderBy: {
        companyName: 'asc'
      }
    });

    return NextResponse.json(contractors);
  } catch (error) {
    console.error('Error fetching contractors:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();

    if (!data.companyName) {
      return NextResponse.json({ error: 'Company Name is required' }, { status: 400 });
    }

    // Ensure email is unique if provided
    if (data.email) {
      const existing = await prisma.contractor.findUnique({
        where: { email: data.email }
      });
      if (existing) {
        return NextResponse.json({ error: 'Contractor with this email already exists' }, { status: 400 });
      }
    }

    const contractor = await prisma.contractor.create({
      data: {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        gstNumber: data.gstNumber,
        panNumber: data.panNumber,
        status: data.status || 'Active'
      }
    });

    return NextResponse.json(contractor, { status: 201 });
  } catch (error) {
    console.error('Error creating contractor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
