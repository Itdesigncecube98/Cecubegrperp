import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

async function generateAssetCode() {
  const count = await prisma.equipment.count();
  const num = String(count + 1).padStart(4, '0');
  return `ASSET-${num}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id           = searchParams.get('id');
    const status       = searchParams.get('status');
    const category     = searchParams.get('category');
    const assignedToId = searchParams.get('assignedToId');
    const search       = searchParams.get('search');
    const dueSoon      = searchParams.get('dueSoon'); // service due within N days

    if (id) {
      const equipment = await prisma.equipment.findUnique({
        where: { id: parseInt(id) },
        include: {
          assignedTo: { select: { id: true, name: true, designation: true } }
        }
      });
      if (!equipment) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
      return NextResponse.json(equipment);
    }

    const where = {};
    if (status)       where.status       = status;
    if (category)     where.category     = category;
    if (assignedToId) where.assignedToId = assignedToId;
    if (search) {
      where.OR = [
        { name:         { contains: search, mode: 'insensitive' } },
        { assetCode:    { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { make:         { contains: search, mode: 'insensitive' } }
      ];
    }
    if (dueSoon) {
      // Find equipment whose nextServiceDate is within the given number of days
      const days = parseInt(dueSoon) || 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      where.nextServiceDate = { gte: today, lte: cutoffStr };
    }

    const equipment = await prisma.equipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { select: { id: true, name: true, designation: true } }
      }
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('GET /api/engg/equipment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      assetCode, name, description, category, make, model,
      serialNumber, purchaseDate, purchaseValue, currentValue,
      status, assignedToId, currentLocation,
      nextServiceDate, serviceIntervalDays, notes
    } = data;

    if (!name) return NextResponse.json({ error: 'Equipment name is required' }, { status: 400 });

    const equipment = await prisma.equipment.create({
      data: {
        assetCode:           assetCode           || await generateAssetCode(),
        name,
        description:         description         || null,
        category:            category            || 'General',
        make:                make                || null,
        model:               model               || null,
        serialNumber:        serialNumber        || null,
        purchaseDate:        purchaseDate        || null,
        purchaseValue:       purchaseValue       ? parseFloat(purchaseValue) : 0,
        currentValue:        currentValue        ? parseFloat(currentValue) : 0,
        status:              status              || 'AVAILABLE',
        assignedToId:        assignedToId        || null,
        currentLocation:     currentLocation     || null,
        nextServiceDate:     nextServiceDate     || null,
        serviceIntervalDays: serviceIntervalDays ? parseInt(serviceIntervalDays) : 90,
        notes:               notes               || null
      },
      include: {
        assignedTo: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    console.error('POST /api/engg/equipment:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Asset code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, action, ...updates } = data;

    if (!id) return NextResponse.json({ error: 'Equipment id is required' }, { status: 400 });

    const eqId = parseInt(id);

    // Assign / unassign shorthand
    if (action === 'ASSIGN') {
      const eq = await prisma.equipment.update({
        where: { id: eqId },
        data: {
          assignedToId:    updates.assignedToId    || null,
          currentLocation: updates.currentLocation || null,
          status:          'IN_USE'
        },
        include: { assignedTo: { select: { id: true, name: true } } }
      });
      return NextResponse.json(eq);
    }

    if (action === 'UNASSIGN') {
      const eq = await prisma.equipment.update({
        where: { id: eqId },
        data: { assignedToId: null, status: 'AVAILABLE' }
      });
      return NextResponse.json(eq);
    }

    if (action === 'SERVICE_DONE') {
      // Advance nextServiceDate by serviceIntervalDays
      const existing = await prisma.equipment.findUnique({ where: { id: eqId } });
      const interval = existing?.serviceIntervalDays ?? 90;
      const next = new Date();
      next.setDate(next.getDate() + interval);
      const eq = await prisma.equipment.update({
        where: { id: eqId },
        data: {
          nextServiceDate: next.toISOString().split('T')[0],
          status:          'AVAILABLE'
        }
      });
      return NextResponse.json(eq);
    }

    if (updates.purchaseValue       !== undefined) updates.purchaseValue       = parseFloat(updates.purchaseValue);
    if (updates.currentValue        !== undefined) updates.currentValue        = parseFloat(updates.currentValue);
    if (updates.serviceIntervalDays !== undefined) updates.serviceIntervalDays = parseInt(updates.serviceIntervalDays);

    const eq = await prisma.equipment.update({
      where: { id: eqId },
      data: updates,
      include: { assignedTo: { select: { id: true, name: true } } }
    });

    return NextResponse.json(eq);
  } catch (error) {
    console.error('PUT /api/engg/equipment:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Equipment id is required' }, { status: 400 });

    await prisma.equipment.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/engg/equipment:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
