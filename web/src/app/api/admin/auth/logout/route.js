import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── POST /api/admin/auth/logout ──────────────────────────────────────────────
// Body: { token }
export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 });
    }

    const session = await prisma.userSession.findUnique({ where: { token } });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await prisma.userSession.update({
      where: { token },
      data: { isActive: false, logoutAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId:     session.userId,
        module:     'Admin',
        subModule:  'Auth',
        action:     'LOGOUT',
        entityType: 'UserSession',
        entityId:   session.id,
        status:     'SUCCESS',
      },
    }).catch(() => {});

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('[POST /api/admin/auth/logout]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── GET /api/admin/auth/logout ───────────────────────────────────────────────
// Verify session token validity
// Query: ?token=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 });
    }

    const session = await prisma.userSession.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true, username: true, displayName: true,
            email: true, status: true, isSuperAdmin: true, companyId: true,
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: { include: { permission: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session || !session.isActive) {
      return NextResponse.json({ valid: false, error: 'Session expired or not found' }, { status: 401 });
    }

    if (session.expiresAt && new Date() > session.expiresAt) {
      await prisma.userSession.update({
        where: { token },
        data: { isActive: false, logoutAt: new Date() },
      });
      return NextResponse.json({ valid: false, error: 'Session expired' }, { status: 401 });
    }

    // Build permissions map
    const permissionsMap = {};
    for (const ur of session.user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        const p = rp.permission;
        if (!permissionsMap[p.module]) permissionsMap[p.module] = {};
        if (!permissionsMap[p.module][p.subModule || '*']) {
          permissionsMap[p.module][p.subModule || '*'] = [];
        }
        if (!permissionsMap[p.module][p.subModule || '*'].includes(p.action)) {
          permissionsMap[p.module][p.subModule || '*'].push(p.action);
        }
      }
    }

    return NextResponse.json({
      valid: true,
      user: session.user,
      permissionsMap,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    console.error('[GET /api/admin/auth/logout]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
