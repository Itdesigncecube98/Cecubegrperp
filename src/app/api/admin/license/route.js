import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── GET /api/admin/license ───────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    const where = companyId ? { companyId } : {};

    const licenses = await prisma.licenseKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: licenses });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST /api/admin/license ───────────────────────────────────────────────────
// Body: { key, companyId?, plan?, maxUsers?, modules?, expiresAt?, notes? }
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      key, companyId, plan = 'Standard',
      maxUsers = 10, modules = [],
      expiresAt, notes,
    } = body;

    if (!key) {
      return NextResponse.json({ error: 'License key is required' }, { status: 400 });
    }

    const license = await prisma.licenseKey.create({
      data: {
        key, companyId, plan, maxUsers, modules,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes,
        activatedAt: new Date(),
      },
    });

    return NextResponse.json({ data: license }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/license]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH /api/admin/license ─────────────────────────────────────────────────
// Body: { id, isActive?, expiresAt?, maxUsers?, modules?, notes? }
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (updateData.expiresAt) {
      updateData.expiresAt = new Date(updateData.expiresAt);
    }

    const updated = await prisma.licenseKey.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
