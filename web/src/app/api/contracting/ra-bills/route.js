export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/contracting/ra-bills
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const workOrderId = searchParams.get('workOrderId');
    const projectId   = searchParams.get('projectId');
    const status      = searchParams.get('status');

    const where = {};
    if (workOrderId) where.workOrderId = workOrderId;
    if (projectId)   where.projectId   = projectId;
    if (status)      where.status      = status;

    const bills = await prisma.workOrderRABill.findMany({
      where,
      include: {
        workOrder: {
          select: { id: true, woNo: true, contractorName: true, contractValue: true }
        },
        project: {
          select: { id: true, name: true, projectId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(bills);
  } catch (error) {
    console.error('Error fetching RA bills:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/contracting/ra-bills  (Generate new RA Bill)
export async function POST(request) {
  try {
    const data = await request.json();
    const { workOrderId, periodFrom, periodTo, measuredValue, retentionPercent,
            advanceRecovery, otherDeductions, tdsPercent, remarks } = data;

    if (!workOrderId) {
      return NextResponse.json({ error: 'workOrderId is required' }, { status: 400 });
    }

    // Fetch the work order
    const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo) return NextResponse.json({ error: 'Work Order not found' }, { status: 404 });

    // Get previous bills to compute cumulative
    const prevBills = await prisma.workOrderRABill.findMany({
      where: { workOrderId, status: { in: ['Approved', 'Paid'] } },
      orderBy: { createdAt: 'desc' }
    });
    const previousCertified = prevBills.reduce((sum, b) => sum + (b.currentBill || 0), 0);

    // Generate RA Bill number
    const count = await prisma.workOrderRABill.count({ where: { workOrderId } });
    const billNo = `${wo.woNo}/RA-${String(count + 1).padStart(2, '0')}`;

    const current    = parseFloat(measuredValue) || 0;
    const cumulative = previousCertified + current;
    const retPct     = parseFloat(retentionPercent) ?? wo.retentionPercent ?? 0;
    const retAmt     = (current * retPct) / 100;
    const advRec     = parseFloat(advanceRecovery) || 0;
    const otherDed   = parseFloat(otherDeductions) || 0;
    const tdsPct     = parseFloat(tdsPercent) || 0;
    const beforeTds  = current - retAmt - advRec - otherDed;
    const tdsAmt     = (beforeTds * tdsPct) / 100;
    const netPayable = beforeTds - tdsAmt;

    const bill = await prisma.workOrderRABill.create({
      data: {
        billNo,
        workOrderId,
        projectId:        wo.projectId,
        date:             new Date(),
        periodFrom:       periodFrom ? new Date(periodFrom) : null,
        periodTo:         periodTo   ? new Date(periodTo)   : null,
        measuredValue:    current,
        previousCertified,
        currentBill:      current,
        cumulative,
        retentionPercent: retPct,
        retentionAmount:  retAmt,
        advanceRecovery:  advRec,
        otherDeductions:  otherDed,
        tdsPercent:       tdsPct,
        tdsAmount:        tdsAmt,
        netPayable,
        remarks:          remarks || null,
        status:           'Submitted',
      },
      include: {
        workOrder: { select: { id: true, woNo: true, contractorName: true } },
        project:   { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error('Error creating RA bill:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/contracting/ra-bills  (Approve / Reject / Mark Paid)
export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, status, remarks } = data;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const VALID = ['Submitted', 'Approved', 'Paid', 'Rejected'];
    if (status && !VALID.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID.join(', ')}` }, { status: 400 });
    }

    const updated = await prisma.workOrderRABill.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(remarks !== undefined && { remarks }),
      },
      include: {
        workOrder: { select: { id: true, woNo: true, contractorName: true } },
        project:   { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating RA bill:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
