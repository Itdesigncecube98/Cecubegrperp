import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── GET /api/admin/data-rights?userId=&roleId=&module= ──────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const roleId = searchParams.get('roleId');
    const module = searchParams.get('module');

    const where = {};
    if (userId) where.userId = userId;
    if (roleId) where.roleId = roleId;
    if (module) where.module = module;

    const scopes = await prisma.dataScopeAccess.findMany({
      where,
      orderBy: [{ scopeType: 'asc' }, { createdAt: 'desc' }],
    });

    // Group by scopeType
    const grouped = {};
    scopes.forEach(s => {
      if (!grouped[s.scopeType]) grouped[s.scopeType] = [];
      grouped[s.scopeType].push(s);
    });

    return NextResponse.json({ data: scopes, grouped });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST /api/admin/data-rights ──────────────────────────────────────────────
// Body: { userId?, roleId?, scopeType, scopeValue, module, createdBy? }
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, roleId, scopeType, scopeValue, module = '*', createdBy } = body;

    if (!scopeType || !scopeValue) {
      return NextResponse.json({ error: 'scopeType and scopeValue are required' }, { status: 400 });
    }
    if (!userId && !roleId) {
      return NextResponse.json({ error: 'userId or roleId required' }, { status: 400 });
    }

    const scope = await prisma.dataScopeAccess.create({
      data: { userId, roleId, scopeType, scopeValue, module, createdBy },
    });

    await prisma.auditLog.create({
      data: {
        userId: createdBy,
        module: 'Admin',
        subModule: 'Role & Rights',
        action: 'CREATE',
        entityType: 'DataScopeAccess',
        entityId: scope.id,
        newValues: JSON.stringify({ scopeType, scopeValue, module }),
        status: 'SUCCESS',
      },
    }).catch(() => {});

    return NextResponse.json({ data: scope }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE /api/admin/data-rights?id= ───────────────────────────────────────
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deletedBy = searchParams.get('deletedBy');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await prisma.dataScopeAccess.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: deletedBy,
        module: 'Admin',
        subModule: 'Role & Rights',
        action: 'DELETE',
        entityType: 'DataScopeAccess',
        entityId: id,
        status: 'SUCCESS',
      },
    }).catch(() => {});

    return NextResponse.json({ message: 'Scope deleted' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
