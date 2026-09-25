import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── GET /api/admin/audit-log ─────────────────────────────────────────────────
// Query: userId, module, subModule, action, entityType, entityId,
//        status, dateFrom, dateTo, page, limit
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const userId     = searchParams.get('userId');
    const module     = searchParams.get('module');
    const subModule  = searchParams.get('subModule');
    const action     = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const entityId   = searchParams.get('entityId');
    const status     = searchParams.get('status');
    const dateFrom   = searchParams.get('dateFrom');
    const dateTo     = searchParams.get('dateTo');
    const page       = parseInt(searchParams.get('page') || '1', 10);
    const limit      = parseInt(searchParams.get('limit') || '50', 10);

    const where = {
      ...(userId     && { userId }),
      ...(module     && { module }),
      ...(subModule  && { subModule }),
      ...(action     && { action }),
      ...(entityType && { entityType }),
      ...(entityId   && { entityId }),
      ...(status     && { status }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo   && { lte: new Date(dateTo + 'T23:59:59') }),
            },
          }
        : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, displayName: true },
          },
        },
      }),
    ]);

    return NextResponse.json({ data: logs, total, page, limit });
  } catch (err) {
    console.error('[GET /api/admin/audit-log]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST /api/admin/audit-log ────────────────────────────────────────────────
// Internal: create an audit entry programmatically from other routes
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      userId, employeeId, module, subModule,
      action, entityType, entityId,
      oldValues, newValues, ipAddress, userAgent,
      status = 'SUCCESS', remarks,
    } = body;

    if (!module || !action) {
      return NextResponse.json(
        { error: 'module and action are required' },
        { status: 400 },
      );
    }

    const log = await prisma.auditLog.create({
      data: {
        userId, employeeId, module, subModule,
        action, entityType, entityId,
        oldValues: typeof oldValues === 'object'
          ? JSON.stringify(oldValues)
          : oldValues,
        newValues: typeof newValues === 'object'
          ? JSON.stringify(newValues)
          : newValues,
        ipAddress, userAgent, status, remarks,
      },
    });

    return NextResponse.json({ data: log }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/audit-log]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
