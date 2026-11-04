export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeTenderDetails } from '@/lib/tenderDetails';
import { getNextTenderEnquiryNumber, getNextTenderNumber } from '@/lib/tenderEnquiryNumber';

function validateNewBoqItems(value) {
  if (value === undefined) return { value: [] };
  if (!Array.isArray(value) || value.length > 500) {
    return { error: 'BOQ items must be a list of no more than 500 items.' };
  }
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !String(item.description || '').trim()) {
      return { error: `BOQ item ${index + 1} requires a description.` };
    }
    for (const field of ['quantity', 'clientRate', 'estimatedRate']) {
      if (!Number.isFinite(Number(item[field])) || Number(item[field]) < 0) {
        return { error: `BOQ item ${index + 1} has an invalid ${field}.` };
      }
    }
    for (const [field, label] of [['materials', 'materials'], ['labours', 'labour']]) {
      const resources = item[field] ?? [];
      if (!Array.isArray(resources) || resources.length > 100) {
        return { error: `BOQ item ${index + 1} has an invalid ${label} list.` };
      }
      for (const [resourceIndex, resource] of resources.entries()) {
        if (!resource || typeof resource !== 'object' || Array.isArray(resource) ||
            !String(resource.name || '').trim() || !String(resource.unit || '').trim() ||
            !Number.isFinite(Number(resource.quantity)) || Number(resource.quantity) < 0 ||
            !Number.isFinite(Number(resource.rate)) || Number(resource.rate) < 0 ||
            !Array.isArray(resource.components) || resource.components.length > 500) {
          return { error: `BOQ item ${index + 1} has an invalid ${label} resource ${resourceIndex + 1}.` };
        }
        if (resource.components.some(component =>
          !component || typeof component !== 'object' || Array.isArray(component) ||
          !String(component.name || '').trim() ||
          !Number.isFinite(Number(component.quantity)) || Number(component.quantity) < 0 ||
          !Number.isFinite(Number(component.rate)) || Number(component.rate) < 0
        )) {
          return { error: `BOQ item ${index + 1} has an invalid ${label} component.` };
        }
      }
    }
  }
  return { value };
}

export async function GET(req) {
  try {
    const tenders = await prisma.tender.findMany({
      include: {
        owner: { select: { id: true, name: true } },
        result: true,
        approvals: true,
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
    const boqValidation = validateNewBoqItems(body.boqItems);
    if (boqValidation.error) return NextResponse.json({ error: boqValidation.error }, { status: 400 });
    let details;
    try {
      details = normalizeTenderDetails(body.details || {}, {}, {
        initializeRevision: true,
        userId: body.ownerId || null,
      }).details;
    } catch (validationError) {
      return NextResponse.json({ error: validationError.message }, { status: 400 });
    }

    const tenderYear = /^\d{4}-\d{2}-\d{2}$/.test(body.tenderDate || '')
      ? Number(body.tenderDate.slice(0, 4))
      : new Date().getFullYear();

    const tender = await prisma.$transaction(async transaction => {
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(CAST(${tenderYear} AS integer), CAST(4523 AS integer)) IS NULL AS locked`;
      const tenderNo = await getNextTenderNumber(transaction, tenderYear);
      details.enquiryNo = await getNextTenderEnquiryNumber(transaction, tenderYear);
      if (!String(details.hsnSacCode || '').trim()) {
        details.hsnSacCode = String(Math.floor(100000 + Math.random() * 900000));
      }

      const createdTender = await transaction.tender.create({
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
          details,
          status: 'Evaluation'
        }
      });

      if (boqValidation.value.length) {
        await transaction.tenderBOQItem.createMany({
          data: boqValidation.value.map(item => ({
            tenderId: createdTender.id,
            serialNo: item.serialNo ? String(item.serialNo) : null,
            description: String(item.description).trim(),
            unit: item.unit ? String(item.unit) : null,
            quantity: Number(item.quantity),
            clientRate: Number(item.clientRate),
            estimatedRate: Number(item.estimatedRate),
            materials: item.materials || [],
            labours: item.labours || [],
          }))
        });
      }

      await transaction.tenderAuditLog.create({
        data: {
          tenderId: createdTender.id,
          action: 'Created',
          newValue: JSON.stringify(createdTender),
          remarks: 'Tender initially registered',
          userId: createdTender.ownerId
        }
      });
      return createdTender;
    });

    return NextResponse.json(tender, { status: 201 });
  } catch (error) {
    console.error('Error creating tender:', error);
    return NextResponse.json({ error: error.message || 'Failed to create tender' }, { status: 500 });
  }
}
