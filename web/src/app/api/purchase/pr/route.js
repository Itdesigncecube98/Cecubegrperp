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
    await syncUnlinkedMaterialRequisitions();
    const prs = await prisma.purchaseIndent.findMany({
      include: {
        requestedBy: { select: { id: true, name: true } },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(prs);
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
    const pr = await prisma.purchaseIndent.update({
      where: { id: body.id },
      data: { status: body.status }
    });
    return NextResponse.json(pr);
  } catch (error) {
    console.error('Error updating PR status:', error);
    return NextResponse.json({ error: error.message || 'Failed to update PR status' }, { status: 500 });
  }
}
