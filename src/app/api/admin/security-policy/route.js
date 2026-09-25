import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── GET /api/admin/security-policy ──────────────────────────────────────────
export async function GET() {
  try {
    let policy = await prisma.securityPolicy.findUnique({ where: { id: 1 } });

    if (!policy) {
      // Create default policy on first access
      policy = await prisma.securityPolicy.create({
        data: { id: 1 },
      });
    }

    return NextResponse.json({ data: policy });
  } catch (err) {
    console.error('[GET /api/admin/security-policy]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH /api/admin/security-policy ────────────────────────────────────────
// Body: any SecurityPolicy field + updatedBy
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { updatedBy, ...policyData } = body;

    const existing = await prisma.securityPolicy.findUnique({ where: { id: 1 } });

    let policy;
    if (!existing) {
      policy = await prisma.securityPolicy.create({
        data: { id: 1, ...policyData, updatedBy },
      });
    } else {
      policy = await prisma.securityPolicy.update({
        where: { id: 1 },
        data: { ...policyData, updatedBy },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: updatedBy,
        module: 'Admin',
        subModule: 'Security Policy',
        action: 'UPDATE',
        entityType: 'SecurityPolicy',
        entityId: '1',
        newValues: JSON.stringify(policyData),
        status: 'SUCCESS',
      },
    }).catch(() => {});

    return NextResponse.json({ data: policy });
  } catch (err) {
    console.error('[PATCH /api/admin/security-policy]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
