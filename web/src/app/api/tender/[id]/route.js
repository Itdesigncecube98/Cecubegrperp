export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const tender = await prisma.tender.findUnique({
      where: { id },
      include: {
        evaluations: true,
        documents: true,
        boqItems: true,
        costing: true,
        bids: true,
        approvals: true,
        submission: true,
        result: true,
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
        owner: { select: { id: true, name: true } }
      }
    });

    if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    return NextResponse.json(tender);
  } catch (error) {
    console.error('Error fetching tender details:', error);
    return NextResponse.json({ error: 'Failed to fetch tender' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const currentTender = await prisma.tender.findUnique({ where: { id } });
    if (!currentTender) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data = {};
    const stringFields = [
      'tenderNo',
      'referenceNo',
      'title',
      'source',
      'authority',
      'clientName',
      'projectName',
      'projectLocation',
      'tenderType',
      'currency',
      'status',
      'ownerId'
    ];
    for (const field of stringFields) {
      if (body[field] !== undefined) {
        data[field] = body[field] === '' ? null : String(body[field]);
      }
    }

    const dateFields = [
      'tenderDate',
      'publishedDate',
      'docDownloadStart',
      'preBidMeeting',
      'querySubLastDate',
      'bidSubStart',
      'bidSubLastDate',
      'techOpeningDate',
      'finOpeningDate',
      'expectedResultDate'
    ];
    for (const field of dateFields) {
      if (body[field] !== undefined) {
        data[field] = body[field] ? new Date(body[field]) : null;
        if (data[field] && Number.isNaN(data[field].getTime())) {
          return NextResponse.json({ error: `Invalid date for ${field}` }, { status: 400 });
        }
      }
    }

    if (body.tenderValue !== undefined) {
      const tenderValue = body.tenderValue === '' ? null : Number(body.tenderValue);
      if (tenderValue !== null && !Number.isFinite(tenderValue)) {
        return NextResponse.json({ error: 'Tender value must be a valid number' }, { status: 400 });
      }
      data.tenderValue = tenderValue;
    }
    if (body.details !== undefined) {
      if (!body.details || typeof body.details !== 'object' || Array.isArray(body.details)) {
        return NextResponse.json({ error: 'Tender details must be an object' }, { status: 400 });
      }
      data.details = body.details;
    }

    const tender = await prisma.$transaction(async (transaction) => {
      const updatedTender = await transaction.tender.update({
        where: { id },
        data
      });

      if (body.status && body.status !== currentTender.status) {
        await transaction.tenderAuditLog.create({
          data: {
            tenderId: id,
            action: 'StatusChanged',
            oldValue: currentTender.status,
            newValue: body.status,
            remarks: body.remarks || 'Status updated via API',
            userId: body.userId
          }
        });
      }
      if (body.details !== undefined) {
        await transaction.tenderAuditLog.create({
          data: {
            tenderId: id,
            action: 'DetailsUpdated',
            remarks: 'Tender details saved',
            userId: body.ownerId || currentTender.ownerId
          }
        });
      }
      return updatedTender;
    });

    return NextResponse.json(tender);
  } catch (error) {
    console.error('Error updating tender:', error);
    return NextResponse.json({ error: error.message || 'Failed to update tender' }, { status: 500 });
  }
}
