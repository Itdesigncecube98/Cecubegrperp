export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/contracting/work-orders
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId    = searchParams.get('projectId');
    const contractorId = searchParams.get('contractorId');
    const status       = searchParams.get('status');

    const where = {};
    if (projectId) where.projectId = projectId;
    if (contractorId) where.contractorId = contractorId;
    if (status) where.status = status;

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, projectId: true } },
        raBills: { select: { id: true, billNo: true, status: true, netPayable: true, date: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(workOrders);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/contracting/work-orders
export async function POST(request) {
  try {
    const data = await request.json();
    const { projectId, contractorId, contractorName, contractorPhone, contractorGst, contractorPan,
            wbsTask, scope, startDate, endDate, contractValue, advancePercent, retentionPercent, paymentTerms } = data;

    if (!projectId || !contractorName) {
      return NextResponse.json({ error: 'projectId and contractorName are required' }, { status: 400 });
    }

    const project = await prisma.projectMaster.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const count = await prisma.workOrder.count();
    const woNo = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const cv = parseFloat(contractValue) || 0;
    const ap = parseFloat(advancePercent) || 0;

    const workOrder = await prisma.workOrder.create({
      data: {
        woNo,
        projectId,
        contractorId:     contractorId || null,
        contractorName,
        contractorPhone:  contractorPhone || null,
        contractorGst:    contractorGst || null,
        contractorPan:    contractorPan || null,
        wbsTask:          wbsTask || null,
        scope:            scope || null,
        startDate:        startDate ? new Date(startDate) : null,
        endDate:          endDate ? new Date(endDate) : null,
        contractValue:    cv,
        advancePercent:   ap,
        advanceAmount:    (cv * ap) / 100,
        retentionPercent: parseFloat(retentionPercent) || 0,
        paymentTerms:     paymentTerms || null,
        status:           'Draft',
      },
      include: {
        project: { select: { id: true, name: true, projectId: true } }
      }
    });

    return NextResponse.json(workOrder, { status: 201 });
  } catch (error) {
    console.error('Error creating work order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/contracting/work-orders
export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, status, ...fields } = data;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const updateData = {};
    if (status) updateData.status = status;
    if (fields.contractorName) updateData.contractorName = fields.contractorName;
    if (fields.scope !== undefined) updateData.scope = fields.scope;
    if (fields.wbsTask !== undefined) updateData.wbsTask = fields.wbsTask;
    if (fields.paymentTerms !== undefined) updateData.paymentTerms = fields.paymentTerms;
    if (fields.endDate !== undefined) updateData.endDate = fields.endDate ? new Date(fields.endDate) : null;

    const updated = await prisma.workOrder.update({
      where: { id },
      data: updateData,
      include: { project: { select: { id: true, name: true } } }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating work order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
