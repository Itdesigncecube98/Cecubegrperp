export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ─── Helper: generate next ADV number ─────────────────────────────────────────
async function getNextAdvNo(year = new Date().getFullYear()) {
  const existing = await prisma.advancePayment.findMany({
    select: { advNo: true },
    where: { advNo: { startsWith: `ADV-${year}-` } },
    orderBy: { advNo: 'desc' },
  });

  let maxSeq = 0;
  for (const { advNo } of existing) {
    const match = advNo.match(new RegExp(`^ADV-${year}-(\\d+)$`));
    if (match) maxSeq = Math.max(maxSeq, Number(match[1]));
  }
  return `ADV-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
}

// GET /api/advance-payments
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id            = searchParams.get('id');
    const referenceType = searchParams.get('referenceType');
    const poNo          = searchParams.get('poNo');
    const woNo          = searchParams.get('woNo');
    const status        = searchParams.get('status');
    const projectId     = searchParams.get('projectId');

    if (id) {
      const adv = await prisma.advancePayment.findUnique({ where: { id } });
      if (!adv) return NextResponse.json({ error: 'Advance payment not found' }, { status: 404 });
      return NextResponse.json(adv);
    }

    const where = {};
    if (referenceType) where.referenceType = referenceType;
    if (poNo)          where.poNo = poNo;
    if (woNo)          where.woNo = woNo;
    if (status)        where.status = status;
    if (projectId)     where.projectId = projectId;

    const advances = await prisma.advancePayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(advances);
  } catch (error) {
    console.error('GET /api/advance-payments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new advance payment
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      referenceType,
      poId, poNo, poStatus,
      woId, woNo, woStatus,
      projectId, projectName,
      supplierName, supplierId,
      advanceAmount,
      remarks,
      advDate,
    } = body;

    if (!referenceType || !['PO', 'WO'].includes(referenceType)) {
      return NextResponse.json({ error: 'referenceType must be PO or WO' }, { status: 400 });
    }
    if (!advanceAmount || parseFloat(advanceAmount) <= 0) {
      return NextResponse.json({ error: 'advanceAmount is required and must be > 0' }, { status: 400 });
    }
    if (referenceType === 'PO' && !poNo) {
      return NextResponse.json({ error: 'poNo is required for PO advance' }, { status: 400 });
    }
    if (referenceType === 'WO' && !woNo) {
      return NextResponse.json({ error: 'woNo is required for WO advance' }, { status: 400 });
    }

    const year  = advDate ? new Date(advDate).getFullYear() : new Date().getFullYear();
    const advNo = await getNextAdvNo(year);
    const amt   = parseFloat(advanceAmount) || 0;

    const advance = await prisma.advancePayment.create({
      data: {
        advNo,
        advDate:         advDate ? new Date(advDate) : new Date(),
        referenceType,
        poId:            poId   || null,
        poNo:            poNo   || null,
        poStatus:        poStatus || null,
        woId:            woId   || null,
        woNo:            woNo   || null,
        woStatus:        woStatus || null,
        projectId:       projectId   || null,
        projectName:     projectName || null,
        supplierName:    supplierName || null,
        supplierId:      supplierId   || null,
        advanceAmount:   amt,
        recoveredAmount: 0,
        cancelledAmount: 0,
        balanceAmount:   amt,
        status:          'ACTIVE',
        remarks:         remarks || null,
      },
    });

    return NextResponse.json(advance, { status: 201 });
  } catch (error) {
    console.error('POST /api/advance-payments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update recovered / cancelled amounts
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, recoveredAmount, cancelledAmount, remarks, status: bodyStatus } = body;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await prisma.advancePayment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Advance not found' }, { status: 404 });

    const recovered  = recoveredAmount  !== undefined ? parseFloat(recoveredAmount)  : existing.recoveredAmount;
    const cancelled  = cancelledAmount  !== undefined ? parseFloat(cancelledAmount)  : existing.cancelledAmount;
    const balance    = Math.max(0, existing.advanceAmount - recovered - cancelled);

    let newStatus = bodyStatus || existing.status;
    if (!bodyStatus) {
      if (balance <= 0) newStatus = 'FULLY_RECOVERED';
      else newStatus = 'ACTIVE';
    }

    const updated = await prisma.advancePayment.update({
      where: { id },
      data: {
        recoveredAmount: recovered,
        cancelledAmount: cancelled,
        balanceAmount:   balance,
        status:          newStatus,
        remarks:         remarks !== undefined ? remarks : existing.remarks,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/advance-payments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove an advance payment
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await prisma.advancePayment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/advance-payments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
