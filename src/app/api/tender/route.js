export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const tenders = await prisma.tender.findMany({
      include: {
        owner: { select: { id: true, name: true } },
        result: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(tenders);
  } catch (error) {
    console.error('Error fetching tenders:', error);
    return NextResponse.json({ error: 'Failed to fetch tenders' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Auto-generate Tender No if not provided
    const count = await prisma.tender.count();
    const tenderNo = body.tenderNo || `TND-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const tender = await prisma.tender.create({
      data: {
        tenderNo,
        referenceNo: body.referenceNo || null,
        title: body.title,
        tenderDate: body.tenderDate ? new Date(body.tenderDate) : null,
        source: body.source || null,
        authority: body.authority || null,
        clientName: body.clientName || null,
        projectName: body.projectName || null,
        projectLocation: body.projectLocation || null,
        tenderType: body.tenderType || null,
        tenderValue: body.tenderValue ? parseFloat(body.tenderValue) : null,
        currency: body.currency || 'INR',
        publishedDate: body.publishedDate ? new Date(body.publishedDate) : null,
        docDownloadStart: body.docDownloadStart ? new Date(body.docDownloadStart) : null,
        preBidMeeting: body.preBidMeeting ? new Date(body.preBidMeeting) : null,
        querySubLastDate: body.querySubLastDate ? new Date(body.querySubLastDate) : null,
        bidSubStart: body.bidSubStart ? new Date(body.bidSubStart) : null,
        bidSubLastDate: body.bidSubLastDate ? new Date(body.bidSubLastDate) : null,
        techOpeningDate: body.techOpeningDate ? new Date(body.techOpeningDate) : null,
        finOpeningDate: body.finOpeningDate ? new Date(body.finOpeningDate) : null,
        ownerId: body.ownerId || null,
        details: body.details || undefined,
        status: 'Evaluation' // default starting status
      }
    });

    // Create Audit Log
    await prisma.tenderAuditLog.create({
      data: {
        tenderId: tender.id,
        action: 'Created',
        newValue: JSON.stringify(tender),
        remarks: 'Tender initially registered',
        userId: body.ownerId // or extract from session if implemented
      }
    });

    return NextResponse.json(tender, { status: 201 });
  } catch (error) {
    console.error('Error creating tender:', error);
    return NextResponse.json({ error: error.message || 'Failed to create tender' }, { status: 500 });
  }
}
