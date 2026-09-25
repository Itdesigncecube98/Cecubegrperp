export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function syncUnlinkedMaterialRequisitions() {
  const unlinked = await prisma.siteMaterialRequisition.findMany({
    where: { purchaseIndentId: null },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: 'asc' }
  });

  for (const requisition of unlinked) {
    const purchaseCount = await prisma.purchaseIndent.count();
    const purchaseIndent = await prisma.purchaseIndent.create({
      data: {
        prNo: `PR-${new Date().getFullYear()}-${String(purchaseCount + 1).padStart(4, '0')}`,
        project: requisition.project?.name || '',
        requiredDate: requisition.requiredByDate,
        purpose: `Material requisition for ${requisition.taskName || 'site work'}`,
        status: 'Pending Approval',
        requestedById: requisition.requestedById,
        items: {
          create: [{
            item: requisition.materialName || requisition.itemDescription,
            specification: requisition.taskName,
            unit: requisition.unit || 'Nos',
            quantity: requisition.quantityReq || 0,
            requiredDate: requisition.requiredByDate
          }]
        }
      }
    });

    await prisma.siteMaterialRequisition.update({
      where: { id: requisition.id },
      data: { purchaseIndentId: purchaseIndent.id }
    });
  }
}

export async function GET(req) {
  try {
    const prs = await prisma.purchaseIndent.findMany({
      include: {
        requestedBy: { select: { id: true, name: true } },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });
    const libraryMaterials = await prisma.materialLibraryItem.findMany({
      where: { resourceType: 'Material' },
      select: { name: true, rate: true }
    });
    const rateByName = new Map(libraryMaterials.map(material => [String(material.name).trim().toLowerCase(), material.rate]));
    return NextResponse.json(prs.map(pr => ({
      ...pr,
      items: pr.items.map(item => ({
        ...item,
        libraryRate: rateByName.get(String(item.item || '').trim().toLowerCase()) || 0
      }))
    })));
  } catch (error) {
    console.error('Error fetching PRs:', error);
    return NextResponse.json({ error: 'Failed to fetch PRs' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Auto-generate PR No
    const count = await prisma.purchaseIndent.count();
    const prNo = body.prNo || `PR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const pr = await prisma.purchaseIndent.create({
      data: {
        prNo,
        department: body.department,
        project: body.project,
        site: body.site,
        requiredDate: body.requiredDate ? new Date(body.requiredDate) : null,
        priority: body.priority || 'Normal',
        purpose: body.purpose,
        remarks: body.remarks,
        status: 'Pending Approval',
        requestedById: body.requestedById,
        items: {
          create: body.items.map(item => ({
            item: item.item,
            specification: item.specification,
            unit: item.unit,
            quantity: parseFloat(item.quantity) || 0,
            requiredDate: item.requiredDate ? new Date(item.requiredDate) : null
          }))
        }
      },
      include: {
        items: true
      }
    });

    return NextResponse.json(pr, { status: 201 });
  } catch (error) {
    console.error('Error creating PR:', error);
    return NextResponse.json({ error: error.message || 'Failed to create PR' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'PR id is required' }, { status: 400 });

    const existing = await prisma.purchaseIndent.findUnique({ where: { id: body.id } });
    if (!existing) return NextResponse.json({ error: 'Purchase indent not found' }, { status: 404 });
    if (existing.status === 'Approved' && body.status !== existing.status) {
      return NextResponse.json({ error: 'Approved purchase indents cannot be edited' }, { status: 409 });
    }

    const isEdit = body.items !== undefined || body.project !== undefined || body.site !== undefined;
    if (existing.status === 'Approved' && isEdit) {
      return NextResponse.json({ error: 'Approved purchase indents cannot be edited' }, { status: 409 });
    }

    const data = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.department !== undefined) data.department = body.department;
    if (body.project !== undefined) data.project = body.project;
    if (body.site !== undefined) data.site = body.site;
    if (body.requiredDate !== undefined) data.requiredDate = body.requiredDate ? new Date(body.requiredDate) : null;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.purpose !== undefined) data.purpose = body.purpose;
    if (body.remarks !== undefined) data.remarks = body.remarks;
    if (body.requestedById !== undefined) data.requestedById = body.requestedById || null;

    const pr = await prisma.$transaction(async transaction => {
      if (Array.isArray(body.items)) {
        await transaction.purchaseIndentItem.deleteMany({ where: { indentId: body.id } });
        data.items = {
          create: body.items.filter(item => item.item?.trim()).map(item => ({
            item: item.item.trim(),
            specification: item.specification || null,
            unit: item.unit || 'Nos',
            quantity: parseFloat(item.quantity) || 0
          }))
        };
      }
      return transaction.purchaseIndent.update({
        where: { id: body.id },
        data,
        include: { items: true }
      });
    });
    return NextResponse.json(pr);
  } catch (error) {
    console.error('Error updating PR status:', error);
    return NextResponse.json({ error: error.message || 'Failed to update PR status' }, { status: 500 });
  }
}
