export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addTaskMasterTask } from '@/lib/siteTaskMaster';

// GET /api/contracting/work-orders
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId    = searchParams.get('projectId');
    const contractorId = searchParams.get('contractorId');
    const status       = searchParams.get('status');
    const id           = searchParams.get('id');

    const where = {};
    if (projectId) where.projectId = projectId;
    if (contractorId) where.contractorId = contractorId;
    if (status) where.status = status;
    if (id) where.id = id;

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
          wbsTask, scope, startDate, endDate, contractValue, advancePercent, retentionPercent, paymentTerms,
          woNo: requestedWoNo, woDate, preview, items, quotationTerms } = data;

    if (!projectId || !contractorName) {
      return NextResponse.json({ error: 'projectId and contractorName are required' }, { status: 400 });
    }

    const project = await prisma.projectMaster.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const count = await prisma.workOrder.count();
    const defaultPrefix = `WO-${new Date().getFullYear()}`;
    let sequence = count + 1;
    let woNo = requestedWoNo || `${defaultPrefix}-${String(sequence).padStart(4, '0')}`;

    // A client may send a display placeholder or an already-used number.
    // Always resolve it to an unused unique work-order number before insert.
    if (await prisma.workOrder.findUnique({ where: { woNo } })) {
      do {
        sequence += 1;
        woNo = `${defaultPrefix}-${String(sequence).padStart(4, '0')}`;
      } while (await prisma.workOrder.findUnique({ where: { woNo } }));
    }

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
        scope:            JSON.stringify({ scope: scope || null, preview: preview || null, items: items || [], quotationTerms: quotationTerms || {} }),
        startDate:        woDate ? new Date(woDate) : startDate ? new Date(startDate) : null,
        endDate:          endDate ? new Date(endDate) : null,
        contractValue:    cv,
        advancePercent:   ap,
        advanceAmount:    (cv * ap) / 100,
        retentionPercent: parseFloat(retentionPercent) || 0,
        paymentTerms:     paymentTerms || quotationTerms?.paymentTerms || null,
        status:           'Draft',
      },
      include: {
        project: { select: { id: true, name: true, projectId: true } }
      }
    });

    const legacyProject = await prisma.project.findFirst({ where: { name: project.name }, select: { id: true } });
    if (legacyProject) {
      (Array.isArray(items) ? items : []).forEach(item => {
        addTaskMasterTask(legacyProject.id, {
          groupName: `Work Order ${woNo}`,
          subgroupName: contractorName || 'Work Order Tasks',
          taskName: item.description,
          description: `Work order ${woNo}`,
          source: 'Work Order',
          quantity: item.qty,
          unit: item.unit || 'Job',
          rate: item.rate
        });
      });
    }

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
    if (fields.scope !== undefined || fields.preview !== undefined || fields.items !== undefined || fields.quotationTerms !== undefined) {
      updateData.scope = JSON.stringify({
        scope: fields.scope || null,
        preview: fields.preview || null,
        items: fields.items || [],
        quotationTerms: fields.quotationTerms || {},
      });
    }
    if (fields.wbsTask !== undefined) updateData.wbsTask = fields.wbsTask;
    if (fields.paymentTerms !== undefined) updateData.paymentTerms = fields.paymentTerms;
    if (fields.endDate !== undefined) updateData.endDate = fields.endDate ? new Date(fields.endDate) : null;
    if (fields.woNo !== undefined) updateData.woNo = fields.woNo;
    if (fields.woDate !== undefined) updateData.startDate = fields.woDate ? new Date(fields.woDate) : null;
    if (fields.contractorPhone !== undefined) updateData.contractorPhone = fields.contractorPhone;
    if (fields.contractorGst !== undefined) updateData.contractorGst = fields.contractorGst;
    if (fields.contractorPan !== undefined) updateData.contractorPan = fields.contractorPan;

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
