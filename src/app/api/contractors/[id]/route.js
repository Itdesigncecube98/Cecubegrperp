import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { normalizeMasterRecordStatus } from '@/lib/masterRecordStatus';
import { writeMasterRecordStatusAudit } from '@/lib/serverMasterStatusAudit';

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

    return NextResponse.json({
      ...contractor,
      status: normalizeMasterRecordStatus(contractor.status, contractor.status),
      documents: (() => {
        try { return contractor.documents ? JSON.parse(contractor.documents) : []; } catch { return []; }
      })()
    });
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

    const status = data.status === undefined
      ? existingContractor.status
      : normalizeMasterRecordStatus(data.status);
    if (!status) return NextResponse.json({ error: 'Invalid contractor status' }, { status: 400 });
    const session = readAuthSession(request);
    const updatedContractor = await prisma.$transaction(async tx => {
      const updated = await tx.contractor.update({
        where: { id },
        data: {
          companyName: data.companyName !== undefined ? data.companyName : existingContractor.companyName,
          contactPerson: data.contactPerson !== undefined ? data.contactPerson : existingContractor.contactPerson,
          email: data.email !== undefined ? data.email : existingContractor.email,
          phone: data.phone !== undefined ? data.phone : existingContractor.phone,
          address: data.address !== undefined ? data.address : existingContractor.address,
          gstNumber: data.gstNumber !== undefined ? data.gstNumber : existingContractor.gstNumber,
          panNumber: data.panNumber !== undefined ? data.panNumber : existingContractor.panNumber,
          faxNo: data.faxNo !== undefined ? data.faxNo : existingContractor.faxNo,
          website: data.website !== undefined ? data.website : existingContractor.website,
          documents: data.documents !== undefined
            ? JSON.stringify(Array.isArray(data.documents) ? data.documents : [])
            : existingContractor.documents,
          status
        }
      });
      await writeMasterRecordStatusAudit(tx, request, session, {
        entityType: 'Contractor',
        entityId: id,
        oldStatus: existingContractor.status,
        newStatus: status
      });
      return updated;
    });

    return NextResponse.json({
      ...updatedContractor,
      status: normalizeMasterRecordStatus(updatedContractor.status, updatedContractor.status),
      documents: (() => {
        try { return updatedContractor.documents ? JSON.parse(updatedContractor.documents) : []; } catch { return []; }
      })()
    });
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
