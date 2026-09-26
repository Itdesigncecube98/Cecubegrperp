import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

async function generateMRNumber() {
  const count = await prisma.materialRequest.count();
  const num = String(count + 1).padStart(5, '0');
  return `MR-${num}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id            = searchParams.get('id');
    const projectId     = searchParams.get('projectId');
    const workOrderId   = searchParams.get('workOrderId');
    const requestedById = searchParams.get('requestedById');
    const status        = searchParams.get('status');

    if (id) {
      const mr = await prisma.materialRequest.findUnique({
        where: { id: parseInt(id) },
        include: {
          project:     { select: { id: true, projectCode: true, name: true } },
          workOrder:   { select: { id: true, woNumber: true, title: true } },
          requestedBy: { select: { id: true, name: true, designation: true } },
          approvedBy:  { select: { id: true, name: true } },
          items:       true,
          purchaseOrders: {
            select: { id: true, poNumber: true, status: true, totalAmount: true }
          }
        }
      });
      if (!mr) return NextResponse.json({ error: 'Material request not found' }, { status: 404 });
      return NextResponse.json(mr);
    }

    const where = {};
    if (projectId)     where.projectId     = parseInt(projectId);
    if (workOrderId)   where.workOrderId   = parseInt(workOrderId);
    if (requestedById) where.requestedById = requestedById;
    if (status)        where.status        = status;

    const requests = await prisma.materialRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project:     { select: { id: true, projectCode: true, name: true } },
        workOrder:   { select: { id: true, woNumber: true, title: true } },
        requestedBy: { select: { id: true, name: true, designation: true } },
        approvedBy:  { select: { id: true, name: true } },
        items:       true
      }
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('GET /api/engg/material-requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      projectId, workOrderId, requestedById,
      urgency, requiredByDate, remarks, items, mrNumber
    } = data;

    if (!projectId || !requestedById) {
      return NextResponse.json(
        { error: 'projectId and requestedById are required' },
        { status: 400 }
      );
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    const mr = await prisma.materialRequest.create({
      data: {
        mrNumber:       mrNumber      || await generateMRNumber(),
        projectId:      parseInt(projectId),
        workOrderId:    workOrderId   ? parseInt(workOrderId) : null,
        requestedById,
        status:         'DRAFT',
        urgency:        urgency       || 'NORMAL',
        requiredByDate: requiredByDate || null,
        remarks:        remarks       || null,
        items: {
          create: items.map(item => ({
            itemCode:         item.itemCode         || null,
            description:      item.description,
            unit:             item.unit             || 'Nos',
            quantityRequired: parseFloat(item.quantityRequired),
            estimatedRate:    item.estimatedRate ? parseFloat(item.estimatedRate) : 0,
            remarks:          item.remarks        || null
          }))
        }
      },
      include: {
        project:     { select: { id: true, projectCode: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
        items:       true
      }
    });

    return NextResponse.json(mr, { status: 201 });
  } catch (error) {
    console.error('POST /api/engg/material-requests:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'MR number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, action, approvedById, rejectionReason, items, ...updates } = data;

    if (!id) return NextResponse.json({ error: 'Material request id is required' }, { status: 400 });

    const mrId = parseInt(id);

    // Status transitions
    if (action === 'SUBMIT') {
      const mr = await prisma.materialRequest.update({
        where: { id: mrId },
        data: { status: 'SUBMITTED' }
      });
      return NextResponse.json(mr);
    }

    if (action === 'APPROVE') {
      if (!approvedById) {
        return NextResponse.json({ error: 'approvedById is required to approve' }, { status: 400 });
      }
      // Update approved quantities on items if provided
      const mr = await prisma.$transaction(async (tx) => {
        if (items && Array.isArray(items)) {
          for (const item of items) {
            await tx.materialItem.update({
              where: { id: item.id },
              data: { quantityApproved: parseFloat(item.quantityApproved) }
            });
          }
        }
        return tx.materialRequest.update({
          where: { id: mrId },
          data: {
            status:      'APPROVED',
            approvedById,
            approvedAt:  new Date()
          },
          include: { items: true, requestedBy: { select: { id: true, name: true } } }
        });
      });
      return NextResponse.json(mr);
    }

    if (action === 'REJECT') {
      const mr = await prisma.materialRequest.update({
        where: { id: mrId },
        data: {
          status:          'REJECTED',
          approvedById:    approvedById    || null,
          rejectionReason: rejectionReason || null
        }
      });
      return NextResponse.json(mr);
    }

    if (action === 'MARK_ISSUED') {
      const mr = await prisma.materialRequest.update({
        where: { id: mrId },
        data: { status: 'ISSUED' }
      });
      return NextResponse.json(mr);
    }

    // Generic field update (draft editing)
    if (updates.projectId  !== undefined) updates.projectId  = parseInt(updates.projectId);
    if (updates.workOrderId !== undefined) updates.workOrderId = updates.workOrderId ? parseInt(updates.workOrderId) : null;

    const mr = await prisma.materialRequest.update({
      where: { id: mrId },
      data: updates,
      include: {
        items:       true,
        requestedBy: { select: { id: true, name: true } },
        approvedBy:  { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(mr);
  } catch (error) {
    console.error('PUT /api/engg/material-requests:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Material request not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Material request id is required' }, { status: 400 });

    const mr = await prisma.materialRequest.findUnique({ where: { id: parseInt(id) } });
    if (!mr) return NextResponse.json({ error: 'Material request not found' }, { status: 404 });

    if (!['DRAFT', 'REJECTED', 'CANCELLED'].includes(mr.status)) {
      return NextResponse.json(
        { error: 'Only DRAFT, REJECTED or CANCELLED requests can be deleted' },
        { status: 400 }
      );
    }

    await prisma.materialRequest.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/engg/material-requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
