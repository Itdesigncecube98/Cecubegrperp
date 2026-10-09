export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { readAuthSession } from '../../../../lib/authSession';
import { writeSessionAudit } from '../../../../lib/serverAudit';

const prisma = new PrismaClient();

// ─── GET /api/admin/audit-log ─────────────────────────────────────────────────
// Query: userId, module, subModule, action, entityType, entityId,
//        status, dateFrom, dateTo, page, limit
export async function GET(request) {
  try {
    const session = readAuthSession(request);
    if (session?.type !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
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
    let session = readAuthSession(request);
    const body = await request.json();
    if (!session && body.employeeId) {
      session = { type: 'employee', id: body.employeeId };
    }
    if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    const moduleRoutes = [
      ['/admin-dashboard', 'Admin'], ['/engineering', 'Engineering'], ['/marketing', 'Marketing'],
      ['/accounts', 'Accounts'], ['/tender', 'Tender'], ['/contracting', 'Contracting'],
      ['/site', 'Site'], ['/purchase', 'Purchase'], ['/employee', 'HRMS'],
      ['/employeedashboard', 'HRMS'], ['/hrms', 'HRMS'], ['/dashboard', 'Dashboard'],
    ];
    const pagePath = typeof body.pagePath === 'string' ? body.pagePath.slice(0, 200) : '';
    const inferredModule = moduleRoutes.find(([prefix]) => pagePath === prefix || pagePath.startsWith(`${prefix}/`))?.[1];
    const action = String(body.action || '');
    const allowedActions = new Set(['MODULE_OPEN', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EMAIL_SEND', 'STATUS_CHANGE']);
    if (action === 'MODULE_OPEN') {
      if (!inferredModule) return NextResponse.json({ error: 'Invalid module access event.' }, { status: 400 });
    } else if (!inferredModule || !allowedActions.has(action)) {
      return NextResponse.json({ error: 'Invalid activity event.' }, { status: 400 });
    }
    const apiPath = typeof body.apiPath === 'string' ? body.apiPath.slice(0, 240) : '';
    const entityType = typeof body.entityType === 'string' ? body.entityType.slice(0, 80) : null;
    const entityId = typeof body.entityId === 'string' || typeof body.entityId === 'number' ? String(body.entityId).slice(0, 160) : null;
    const detailFields = body.details && typeof body.details === 'object'
      ? Object.fromEntries(Object.entries(body.details).slice(0, 18))
      : {};
    const newValues = JSON.stringify({ apiPath, ...detailFields });
    const log = await writeSessionAudit(prisma, request, session, {
      module: inferredModule,
      subModule: pagePath,
      action,
      status: body.status === 'FAILURE' ? 'FAILURE' : 'SUCCESS',
      entityType,
      entityId,
      newValues,
    });

    return NextResponse.json({ data: log }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/audit-log]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
