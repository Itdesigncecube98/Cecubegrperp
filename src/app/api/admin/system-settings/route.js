import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── GET /api/admin/system-settings ──────────────────────────────────────────
export async function GET() {
  try {
    let settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: { id: 1 } });
    }
    return NextResponse.json({ data: settings });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH /api/admin/system-settings ────────────────────────────────────────
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { updatedBy, ...updateData } = body;

    const existing = await prisma.systemSettings.findUnique({ where: { id: 1 } });

    let settings;
    if (!existing) {
      settings = await prisma.systemSettings.create({ data: { id: 1, ...updateData, updatedBy } });
    } else {
      settings = await prisma.systemSettings.update({ where: { id: 1 }, data: { ...updateData, updatedBy } });
    }

    await prisma.auditLog.create({
      data: {
        userId: updatedBy, module: 'Admin', subModule: 'System Settings',
        action: 'UPDATE', entityType: 'SystemSettings', entityId: '1',
        newValues: JSON.stringify(updateData), status: 'SUCCESS',
      },
    }).catch(() => {});

    return NextResponse.json({ data: settings });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
