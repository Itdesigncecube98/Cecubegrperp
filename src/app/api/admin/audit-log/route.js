export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readAuthSession } from '../../../../lib/authSession';
import { writeSessionAudit } from '../../../../lib/serverAudit';

function readJsonObject(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getOwnerIds(logs) {
  const ids = new Set();
  for (const log of logs) {
    if (log.employeeId) ids.add(String(log.employeeId));
    for (const values of [readJsonObject(log.oldValues), readJsonObject(log.newValues)]) {
      if (!values) continue;
      for (const [key, value] of Object.entries(values)) {
        if (['ownerid', 'employeeid'].includes(key.toLowerCase()) && typeof value === 'string' && value.trim()) ids.add(value.trim());
      }
    }
  }
  return [...ids];
}

function replaceOwnerIdsWithEmployeeCodes(log, employeeCodes) {
  const next = { ...log };
  for (const field of ['oldValues', 'newValues']) {
    const values = readJsonObject(next[field]);
    if (!values) continue;
    let changed = false;
    for (const [key, value] of Object.entries(values)) {
      if (!['ownerid', 'employeeid'].includes(key.toLowerCase()) || typeof value !== 'string') continue;
      const employeeCode = employeeCodes.get(value.trim());
      if (employeeCode) {
        values[key] = employeeCode;
        changed = true;
      }
    }
    if (changed) next[field] = JSON.stringify(values);
  }
  return next;
}

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
    const actions    = (searchParams.get('actions') || '').split(',').map(value => value.trim()).filter(Boolean);
    const entityType = searchParams.get('entityType');
    const entityId   = searchParams.get('entityId');
    const status     = searchParams.get('status');
    const dateFrom   = searchParams.get('dateFrom');
    const dateTo     = searchParams.get('dateTo');
    const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? requestedLimit : 50;
    const skip = (page - 1) * limit;
    if (!Number.isSafeInteger(skip)) {
      return NextResponse.json({ error: 'Invalid page number.' }, { status: 400 });
    }

    const where = {
      ...(userId     && { userId }),
      ...(module     && { module }),
      ...(subModule  && { subModule }),
      ...(actions.length ? { action: { in: actions } } : action && { action }),
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
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, displayName: true },
          },
        },
      }),
    ]);

    const ownerIds = getOwnerIds(logs);
    const employees = ownerIds.length
      ? await prisma.employee.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, empId: true },
        })
      : [];
    const employeeCodes = new Map(employees.filter(employee => employee.empId).map(employee => [employee.id, employee.empId]));

    const data = logs.map(log => ({
      ...replaceOwnerIdsWithEmployeeCodes(log, employeeCodes),
      actorEmployeeCode: log.employeeId ? employeeCodes.get(String(log.employeeId)) || null : null,
    }));
    return NextResponse.json({ data, total, page, limit });
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
    // Module-open tracking is best-effort: the global tracker can run on a
    // public route before login state is available. Ignore anonymous opens
    // without weakening authentication for other audit events.
    if (!session && body.action === 'MODULE_OPEN' && !body.employeeId) {
      return new Response(null, { status: 204 });
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
    const employeeIdKeys = Object.keys(detailFields).filter(key => ['ownerid', 'employeeid'].includes(key.toLowerCase()));
    const internalEmployeeIds = employeeIdKeys
      .map(key => detailFields[key])
      .filter(value => typeof value === 'string' && value.trim());
    if (internalEmployeeIds.length) {
      const employees = await prisma.employee.findMany({
        where: { id: { in: internalEmployeeIds } },
        select: { id: true, empId: true },
      }).catch(() => []);
      const employeeCodes = new Map(employees.filter(employee => employee.empId).map(employee => [employee.id, employee.empId]));
      for (const key of employeeIdKeys) {
        const employeeCode = employeeCodes.get(detailFields[key]);
        if (employeeCode) detailFields[key] = employeeCode;
      }
    }
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
