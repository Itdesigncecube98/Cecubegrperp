import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { readAuthSession } from '@/lib/authSession';
import { normalizeMasterRecordStatus } from '@/lib/masterRecordStatus';
import { writeMasterRecordStatusAudit } from '@/lib/serverMasterStatusAudit';

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

    return NextResponse.json(contractors.map(contractor => ({
      ...contractor,
      status: normalizeMasterRecordStatus(contractor.status, contractor.status),
      documents: (() => {
        try { return contractor.documents ? JSON.parse(contractor.documents) : []; } catch { return []; }
      })()
    })));
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
    const status = normalizeMasterRecordStatus(data.status, 'Regular');
    if (!status) return NextResponse.json({ error: 'Invalid contractor status' }, { status: 400 });

    // Ensure email is unique if provided
    if (data.email) {
      const existing = await prisma.contractor.findUnique({
        where: { email: data.email }
      });
      if (existing) {
        return NextResponse.json({ error: 'Contractor with this email already exists' }, { status: 400 });
      }
    }

    const session = readAuthSession(request);
    const contractor = await prisma.$transaction(async tx => {
      const createdContractor = await tx.contractor.create({
        data: {
          companyName: data.companyName,
          contactPerson: data.contactPerson || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          gstNumber: data.gstNumber || null,
          panNumber: data.panNumber || null,
          faxNo: data.faxNo || null,
          website: data.website || null,
          documents: JSON.stringify(Array.isArray(data.documents) ? data.documents : []),
          status
        }
      });
      await writeMasterRecordStatusAudit(tx, request, session, {
        entityType: 'Contractor',
        entityId: createdContractor.id,
        oldStatus: null,
        newStatus: status
      });
      return createdContractor;
    });

    return NextResponse.json({
      ...contractor,
      documents: (() => {
        try { return contractor.documents ? JSON.parse(contractor.documents) : []; } catch { return []; }
      })()
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating contractor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
