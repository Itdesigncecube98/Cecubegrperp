export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const toDate = value => value ? new Date(value) : null;
const nextNumber = (prefix, count) => `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const requisitionId = searchParams.get('requisitionId');
    const where = requisitionId ? { items: { some: { requisitionId } } } : {};
    const gtns = await prisma.siteGTN.findMany({
      where,
      include: { project: true, items: true, statusHistory: { orderBy: { changedAt: 'asc' } } },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(gtns);
  } catch (error) {
    console.error('Error fetching site GTNs:', error);
    return NextResponse.json({ error: 'Failed to fetch GTNs' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items.filter(item => String(item.materialName || '').trim() && Number(item.quantity) > 0) : [];
    if (!body.projectId) return NextResponse.json({ error: 'Project is required.' }, { status: 400 });
    if (items.length === 0) return NextResponse.json({ error: 'Select at least one material.' }, { status: 400 });
    if (!body.gtnDate) return NextResponse.json({ error: 'GTN date is required.' }, { status: 400 });

    const result = await prisma.$transaction(async tx => {
      const gtnCount = await tx.siteGTN.count();
      const gtn = await tx.siteGTN.create({
        data: {
          gtnNo: body.gtnNo || nextNumber('GTN', gtnCount),
          projectId: body.projectId,
          gtnDate: toDate(body.gtnDate) || new Date(),
          fromLocation: body.fromLocation || null,
          toLocation: body.toLocation || null,
          vehicleNo: body.vehicleNo || null,
          status: body.status || 'Dispatched',
          remarks: body.remarks || null,
          items: {
            create: items.map(item => ({
              materialName: item.materialName,
              quantity: Number(item.quantity),
              unit: item.unit || null
            }))
          }
        },
        include: { project: true, items: true }
      });
      await tx.siteGTNStatusHistory.create({ data: { gtnId: gtn.id, toStatus: gtn.status, actorName: body.actorName || body.createdBy || 'Site User', note: 'GTN created' } });
      return gtn;
    });
    return NextResponse.json({ gtn: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating site GTN:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create GTN' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    if (!body.id || !Array.isArray(body.items)) return NextResponse.json({ error: 'GTN and item details are required.' }, { status: 400 });
    const current = await prisma.siteGTN.findUnique({ where: { id: body.id }, select: { status: true } });
    if (!current) return NextResponse.json({ error: 'GTN not found.' }, { status: 404 });
    const nextStatus = body.status || 'Dispatched';
    const gtn = await prisma.siteGTN.update({
      where: { id: body.id },
      data: {
        gtnDate: toDate(body.gtnDate) || undefined,
        fromLocation: body.fromLocation || null,
        toLocation: body.toLocation || null,
        vehicleNo: body.vehicleNo || null,
        status: nextStatus,
        remarks: body.remarks || null,
        items: {
          update: body.items.filter(item => item.id).map(item => ({
            where: { id: item.id },
            data: {
              materialName: item.materialName,
              quantity: Number(item.quantity) || 0,
              unit: item.unit || null
            }
          }))
        }
      },
      include: { project: true, items: true, statusHistory: { orderBy: { changedAt: 'asc' } } }
    });
    if (nextStatus !== current.status) await prisma.siteGTNStatusHistory.create({ data: {
      gtnId: gtn.id,
      fromStatus: current.status,
      toStatus: nextStatus,
      actorName: body.actorName || body.updatedBy || 'Site User',
      note: `GTN status changed to ${nextStatus}`,
    } });
    return NextResponse.json(gtn);
  } catch (error) {
    console.error('Error updating site GTN:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update GTN' }, { status: 500 });
  }
}
