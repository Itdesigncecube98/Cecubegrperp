import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const contractor = await prisma.contractor.findUnique({
      where: { id }
    });

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    return NextResponse.json(contractor);
  } catch (error) {
    console.error('Error fetching contractor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();

    // Check if contractor exists
    const existingContractor = await prisma.contractor.findUnique({
      where: { id }
    });

    if (!existingContractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Check email uniqueness if email is being updated
    if (data.email && data.email !== existingContractor.email) {
      const emailExists = await prisma.contractor.findUnique({
        where: { email: data.email }
      });
      if (emailExists) {
        return NextResponse.json({ error: 'Contractor with this email already exists' }, { status: 400 });
      }
    }

    const updatedContractor = await prisma.contractor.update({
      where: { id },
      data: {
        companyName: data.companyName !== undefined ? data.companyName : existingContractor.companyName,
        contactPerson: data.contactPerson !== undefined ? data.contactPerson : existingContractor.contactPerson,
        email: data.email !== undefined ? data.email : existingContractor.email,
        phone: data.phone !== undefined ? data.phone : existingContractor.phone,
        address: data.address !== undefined ? data.address : existingContractor.address,
        gstNumber: data.gstNumber !== undefined ? data.gstNumber : existingContractor.gstNumber,
        panNumber: data.panNumber !== undefined ? data.panNumber : existingContractor.panNumber,
        status: data.status !== undefined ? data.status : existingContractor.status
      }
    });

    return NextResponse.json(updatedContractor);
  } catch (error) {
    console.error('Error updating contractor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const contractor = await prisma.contractor.findUnique({
      where: { id }
    });

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    await prisma.contractor.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Contractor deleted successfully' });
  } catch (error) {
    console.error('Error deleting contractor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
