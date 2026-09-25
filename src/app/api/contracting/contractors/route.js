export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/contracting/contractors
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { gstNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const contractors = await prisma.contractor.findMany({
      where,
      orderBy: { companyName: 'asc' }
    });

    return NextResponse.json(contractors);
  } catch (error) {
    console.error('Error fetching contractors:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/contracting/contractors
export async function POST(request) {
  try {
    const data = await request.json();

    if (!data.companyName) {
      return NextResponse.json({ error: 'Company Name is required' }, { status: 400 });
    }

    if (data.email) {
      const existing = await prisma.contractor.findUnique({ where: { email: data.email } });
      if (existing) {
        return NextResponse.json({ error: 'Contractor with this email already exists' }, { status: 400 });
      }
    }

    const contractor = await prisma.contractor.create({
      data: {
        companyName:   data.companyName,
        contactPerson: data.contactPerson || null,
        email:         data.email || null,
        phone:         data.phone || null,
        address:       data.address || null,
        gstNumber:     data.gstNumber || null,
        panNumber:     data.panNumber || null,
        status:        data.status || 'Active',
      }
    });

    return NextResponse.json(contractor, { status: 201 });
  } catch (error) {
    console.error('Error creating contractor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/contracting/contractors  (update)
export async function PUT(request) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Contractor id is required' }, { status: 400 });

    const contractor = await prisma.contractor.update({
      where: { id: data.id },
      data: {
        companyName:   data.companyName,
        contactPerson: data.contactPerson || null,
        email:         data.email || null,
        phone:         data.phone || null,
        address:       data.address || null,
        gstNumber:     data.gstNumber || null,
        panNumber:     data.panNumber || null,
        status:        data.status || 'Active',
      }
    });

    return NextResponse.json(contractor);
  } catch (error) {
    console.error('Error updating contractor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/contracting/contractors?id=xxx
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await prisma.contractor.delete({ where: { id } });
    return NextResponse.json({ message: 'Contractor deleted successfully' });
  } catch (error) {
    console.error('Error deleting contractor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
