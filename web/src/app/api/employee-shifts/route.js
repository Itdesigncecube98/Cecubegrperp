import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

const previousDate = (dateString) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

const normalizeShiftValidity = async (tx, employeeId) => {
  const shifts = await tx.employeeShift.findMany({
    where: { employeeId },
    orderBy: [{ effectiveFrom: 'asc' }, { id: 'asc' }]
  });

  for (let index = 0; index < shifts.length; index += 1) {
    const nextShift = shifts[index + 1];
    const validTill = nextShift ? previousDate(nextShift.effectiveFrom) : null;
    if (shifts[index].validTill !== validTill) {
      await tx.employeeShift.update({
        where: { id: shifts[index].id },
        data: { validTill }
      });
    }
  }
};

export async function POST(request) {
  try {
    const data = await request.json();
    const { employeeId, effectiveFrom, validTill, shiftId, remark, modifiedBy } = data;

    if (!employeeId || !effectiveFrom || !shiftId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newShift = await prisma.$transaction(async (tx) => {
      const created = await tx.employeeShift.create({
        data: {
          employeeId,
          effectiveFrom,
          validTill: validTill || null,
          shiftId: parseInt(shiftId),
          remark: remark || null,
          modifiedBy: modifiedBy || null,
        }
      });
      await normalizeShiftValidity(tx, employeeId);
      return created;
    });

    return NextResponse.json(newShift);
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, effectiveFrom, validTill, shiftId, remark, modifiedBy } = data;

    if (!id) {
      return NextResponse.json({ error: 'Missing shift ID' }, { status: 400 });
    }

    const updatedShift = await prisma.$transaction(async (tx) => {
      const updated = await tx.employeeShift.update({
        where: { id: parseInt(id) },
        data: {
          effectiveFrom,
          validTill: validTill || null,
          shiftId: parseInt(shiftId),
          remark: remark || null,
          modifiedBy: modifiedBy || null,
        }
      });
      await normalizeShiftValidity(tx, updated.employeeId);
      return updated;
    });

    return NextResponse.json(updatedShift);
  } catch (error) {
    console.error('Error updating shift:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing shift ID' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const deleted = await tx.employeeShift.delete({ where: { id: parseInt(id) } });
      await normalizeShiftValidity(tx, deleted.employeeId);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
