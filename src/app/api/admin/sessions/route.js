import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── GET /api/admin/sessions?userId= ─────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page   = parseInt(searchParams.get('page') || '1');
    const limit  = parseInt(searchParams.get('limit') || '50');

    const where = { isActive: true, ...(userId ? { userId } : {}) };

    const [total, sessions] = await Promise.all([
      prisma.userSession.count({ where }),
      prisma.userSession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { loginAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, displayName: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({ data: sessions, total, page, limit });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE /api/admin/sessions?token=&forceBy= ──────────────────────────────
// Force-logout a session
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token   = searchParams.get('token');
    const userId  = searchParams.get('userId');  // force logout ALL sessions for a user
    const forceBy = searchParams.get('forceBy');

    if (token) {
      await prisma.userSession.updateMany({
        where: { token },
        data:  { isActive: false, logoutAt: new Date() },
      });
    } else if (userId) {
      await prisma.userSession.updateMany({
        where: { userId, isActive: true },
        data:  { isActive: false, logoutAt: new Date() },
      });
    } else {
      return NextResponse.json({ error: 'token or userId required' }, { status: 400 });
    }

    await prisma.auditLog.create({
      data: {
        userId: forceBy, module: 'Admin', subModule: 'Security Policy',
        action: 'FORCE_LOGOUT',
        entityType: userId ? 'AllUserSessions' : 'UserSession',
        entityId: userId || token,
        status: 'SUCCESS',
        remarks: 'Force logout by admin',
      },
    }).catch(() => {});

    return NextResponse.json({ message: 'Session(s) terminated' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
