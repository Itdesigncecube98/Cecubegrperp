export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeTenderDetails } from '@/lib/tenderDetails';

function validateBoqItems(value) {
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
    const boqValidation = body.boqItems === undefined ? null : validateBoqItems(body.boqItems);
    if (boqValidation?.error) return NextResponse.json({ error: boqValidation.error }, { status: 400 });
    if (boqValidation) {
      const submittedIds = boqValidation.value.map(item => item.id).filter(id => typeof id === 'string');
      if (new Set(submittedIds).size !== submittedIds.length) {
        return NextResponse.json({ error: 'BOQ items contain a duplicate ID.' }, { status: 400 });
      }
    }

    const currentTender = await prisma.tender.findUnique({ where: { id } });
    if (!currentTender) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data = {};
    let detailUpdate = null;
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
      try {
        detailUpdate = normalizeTenderDetails(
          body.details,
          currentTender.details && typeof currentTender.details === 'object' ? currentTender.details : {},
          { userId: body.ownerId || currentTender.ownerId },
        );
        data.details = detailUpdate.details;
      } catch (validationError) {
        return NextResponse.json({ error: validationError.message }, { status: 400 });
      }
    }

    const tender = await prisma.$transaction(async (transaction) => {
      const updatedTender = await transaction.tender.update({
        where: { id },
        data
      });

      if (boqValidation) {
        const existingItems = await transaction.tenderBOQItem.findMany({
          where: { tenderId: id },
          select: { id: true },
        });
        const existingIds = new Set(existingItems.map(item => item.id));
        for (const item of boqValidation.value) {
          const itemData = {
            serialNo: item.serialNo ? String(item.serialNo) : null,
            description: String(item.description).trim(),
            unit: item.unit ? String(item.unit) : null,
            quantity: Number(item.quantity),
            clientRate: Number(item.clientRate),
            estimatedRate: Number(item.estimatedRate),
            materials: item.materials || [],
            labours: item.labours || [],
          };
          if (typeof item.id === 'string' && existingIds.has(item.id)) {
            await transaction.tenderBOQItem.update({
              where: { id: item.id },
              data: itemData,
            });
          } else {
            await transaction.tenderBOQItem.create({
              data: { tenderId: id, ...itemData },
            });
          }
        }
      }

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
      if (detailUpdate) {
        await transaction.tenderAuditLog.create({
          data: {
            tenderId: id,
            action: 'DetailsUpdated',
            remarks: 'Tender details saved',
            userId: body.ownerId || currentTender.ownerId
          }
        });
        if (detailUpdate.structureChanged) {
          await transaction.tenderAuditLog.create({
            data: {
              tenderId: id,
              action: 'PaymentStructureRevised',
              oldValue: JSON.stringify(detailUpdate.previousStructure),
              newValue: JSON.stringify(detailUpdate.currentStructure),
              remarks: detailUpdate.revision?.remarks || `Payment structure revised, effective ${detailUpdate.revision?.effectiveDate || 'immediately'}.`,
              userId: body.ownerId || currentTender.ownerId
            }
          });
        }
      }
      return {
        ...updatedTender,
        ...(boqValidation ? {
          boqItems: await transaction.tenderBOQItem.findMany({
            where: { tenderId: id },
            orderBy: { serialNo: 'asc' },
          }),
        } : {}),
      };
    });

    return NextResponse.json(tender);
  } catch (error) {
    console.error('Error updating tender:', error);
    return NextResponse.json({ error: error.message || 'Failed to update tender' }, { status: 500 });
  }
}
