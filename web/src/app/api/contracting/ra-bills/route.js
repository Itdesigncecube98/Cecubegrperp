export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDocumentEditors, recordDocumentEdit } from '@/lib/documentAudit';

const VALID_STATUSES = ['Submitted', 'Approved', 'Paid', 'Rejected'];

// Safe float parsing that always falls back to a usable number instead of NaN.
function toNum(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isNaN(n) ? fallback : n;
}

// GET /api/contracting/ra-bills
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const workOrderId = searchParams.get('workOrderId');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    const where = {};
    if (id) where.id = id;
    if (workOrderId) where.workOrderId = workOrderId;
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const bills = await prisma.workOrderRABill.findMany({
      where,
      include: {
        workOrder: {
          select: { id: true, woNo: true, contractorName: true, contractValue: true, retentionPercent: true }
        },
        project: {
          select: { id: true, name: true, projectId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    const editors = await getDocumentEditors(prisma, 'WorkOrderRABill', bills.map(bill => bill.id));
    return NextResponse.json(bills.map(bill => ({ ...bill, ...editors[bill.id] })));
  } catch (error) {
    console.error('Error fetching RA bills:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/contracting/ra-bills  (Generate new RA Bill)
export async function POST(request) {
  try {
    const data = await request.json();
    const {
      workOrderId, date, measuredValue, retentionPercent,
      advanceRecovery, otherDeductions, tdsPercent, remarks, taskLines = []
    } = data;

    if (!workOrderId) {
      return NextResponse.json({ error: 'workOrderId is required' }, { status: 400 });
    }

    // Fetch the work order
    const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo) return NextResponse.json({ error: 'Work Order not found' }, { status: 404 });

    // Get previous bills to compute cumulative (only certified/paid bills count)
    const prevBills = await prisma.workOrderRABill.findMany({
      where: { workOrderId, status: { in: ['Approved', 'Paid'] } },
      orderBy: { createdAt: 'desc' }
    });
    const previousCertified = prevBills.reduce((sum, b) => sum + (b.currentBill || 0), 0);

    // Generate RA Bill number
    const count = await prisma.workOrderRABill.count({ where: { workOrderId } });
    const billNo = `${wo.woNo}/RA-${String(count + 1).padStart(2, '0')}`;

    const current = toNum(measuredValue, 0);
    const cumulative = previousCertified + current;

    // Bug fix: parseFloat(undefined) is NaN, and `NaN ?? fallback` does NOT
    // fall back (?? only triggers on null/undefined), so a missing
    // retentionPercent used to silently poison retAmt/tdsAmt/netPayable with NaN.
    const retPct = retentionPercent !== undefined && retentionPercent !== null && retentionPercent !== ''
      ? toNum(retentionPercent, wo.retentionPercent ?? 0)
      : (wo.retentionPercent ?? 0);

    const retAmt = (current * retPct) / 100;
    const advRec = toNum(advanceRecovery, 0);
    const otherDed = toNum(otherDeductions, 0);
    const tdsPct = toNum(tdsPercent, 0);
    const beforeTds = current - retAmt - advRec - otherDed;
    const tdsAmt = (beforeTds * tdsPct) / 100;
    const netPayable = beforeTds - tdsAmt;

    const taskMetadata = Array.isArray(taskLines) && taskLines.length > 0
      ? `__TASK_LINES__:${JSON.stringify(taskLines)}\n`
      : '';

    const combinedRemarks = `${taskMetadata}${remarks || ''}`;

    const bill = await prisma.workOrderRABill.create({
      data: {
        billNo,
        workOrderId,
        projectId: wo.projectId,
        date: date ? new Date(date) : new Date(),
        periodFrom: null,
        periodTo: null,
        measuredValue: current,
        previousCertified,
        currentBill: current,
        cumulative,
        retentionPercent: retPct,
        retentionAmount: retAmt,
        advanceRecovery: advRec,
        otherDeductions: otherDed,
        tdsPercent: tdsPct,
        tdsAmount: tdsAmt,
        netPayable,
        remarks: combinedRemarks.length > 0 ? combinedRemarks : null,
        status: 'Submitted',
      },
      include: {
        workOrder: { select: { id: true, woNo: true, contractorName: true, retentionPercent: true } },
        project: { select: { id: true, name: true } }
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
    const { id, status, remarks, taskLines } = data;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const existing = await prisma.workOrderRABill.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'RA bill not found' }, { status: 404 });
    }

    // Preserve task metadata in remarks when task lines are edited.
    let savedRemarks = remarks !== undefined ? (remarks || '') : (existing.remarks || '');
    if (Array.isArray(taskLines)) {
      const newline = savedRemarks.indexOf('\n');
      if (savedRemarks.startsWith('__TASK_LINES__:')) {
        savedRemarks = newline >= 0 ? savedRemarks.slice(newline + 1) : '';
      }
      if (taskLines.length) {
        savedRemarks = `__TASK_LINES__:${JSON.stringify(taskLines)}\n${savedRemarks}`;
      }
    }

    const updateData = {
      ...(status && { status }),
      ...(remarks !== undefined || Array.isArray(taskLines)
        ? { remarks: savedRemarks || null }
        : {}),
    };

    const editableFields = [
      'date', 'measuredValue', 'retentionPercent', 'advanceRecovery',
      'otherDeductions', 'tdsPercent',
    ];
    for (const field of editableFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    const current = toNum(updateData.measuredValue ?? existing.measuredValue);
    const retPct = toNum(updateData.retentionPercent ?? existing.retentionPercent);
    const advRec = toNum(updateData.advanceRecovery ?? existing.advanceRecovery);
    const otherDed = toNum(updateData.otherDeductions ?? existing.otherDeductions);
    const tdsPct = toNum(updateData.tdsPercent ?? existing.tdsPercent);

    const retAmt = current * retPct / 100;
    const beforeTds = current - retAmt - advRec - otherDed;
    const tdsAmt = beforeTds * tdsPct / 100;

    // Keep totals consistent with the edited bill.
    updateData.measuredValue = current;
    updateData.currentBill = current;
    updateData.retentionAmount = retAmt;
    updateData.tdsAmount = tdsAmt;
    updateData.netPayable = beforeTds - tdsAmt;
    updateData.cumulative = toNum(existing.previousCertified) + current;

    if (updateData.date) updateData.date = new Date(updateData.date);

    const updated = await prisma.workOrderRABill.update({
      where: { id },
      data: updateData,
      include: {
        workOrder: true,
        project: true,
      },
    });

    await recordDocumentEdit(prisma, {
      entityType: 'WorkOrderRABill', entityId: updated.id, module: 'Contracting', editorName: data.editedBy,
    });

    return NextResponse.json({ ...updated, editedBy: data.editedBy || null });
  } catch (error) {
    console.error('Error updating RA bill:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/contracting/ra-bills?id=...  (only while still Submitted)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await prisma.workOrderRABill.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'RA bill not found' }, { status: 404 });
    if (existing.status !== 'Submitted') {
      return NextResponse.json(
        { error: 'Only bills still in Submitted status can be deleted' },
        { status: 400 }
      );
    }

    await prisma.workOrderRABill.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting RA bill:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
