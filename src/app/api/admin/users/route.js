import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// Query params: status, companyId, search, page, limit
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status    = searchParams.get('status');
    const companyId = searchParams.get('companyId');
    const search    = searchParams.get('search') || '';
    const page      = parseInt(searchParams.get('page') || '1', 10);
    const limit     = parseInt(searchParams.get('limit') || '50', 10);

    const where = {
      AND: [
        status    ? { status }    : {},
        companyId ? { companyId } : {},
        search    ? {
          OR: [
            { username:    { contains: search, mode: 'insensitive' } },
            { email:       { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
          ],
        } : {},
        // never surface deleted users in normal listing
        { status: { not: 'Deleted' } },
      ],
    };

    const [total, users] = await Promise.all([
      prisma.systemUser.count({ where }),
      prisma.systemUser.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id:            true,
          username:      true,
          email:         true,
          displayName:   true,
          employeeId:    true,
          companyId:     true,
          status:        true,
          isSuperAdmin:  true,
          lastLoginAt:   true,
          failedAttempts: true,
          lockedAt:      true,
          createdAt:     true,
          createdBy:     true,
          userRoles: {
            include: {
              role: { select: { id: true, name: true, isActive: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({ data: users, total, page, limit });
  } catch (err) {
    console.error('[GET /api/admin/users]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST /api/admin/users ────────────────────────────────────────────────────
// Body: { username, email, password, displayName, employeeId?, companyId?,
//         isSuperAdmin?, roleIds?, createdBy? }
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      username, email, password, displayName,
      employeeId, companyId, isSuperAdmin = false,
      roleIds = [], createdBy,
    } = body;

    if (!username || !email || !password || !displayName) {
      return NextResponse.json(
        { error: 'username, email, password and displayName are required' },
        { status: 400 },
      );
    }

    // Uniqueness check
    const existing = await prisma.systemUser.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.systemUser.create({
      data: {
        username, email, passwordHash, displayName,
        employeeId, companyId,
        isSuperAdmin, createdBy,
        userRoles: roleIds.length > 0
          ? {
              create: roleIds.map((roleId) => ({
                roleId,
                assignedBy: createdBy,
              })),
            }
          : undefined,
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: createdBy,
        module: 'Admin',
        subModule: 'User Management',
        action: 'CREATE',
        entityType: 'SystemUser',
        entityId: user.id,
        newValues: JSON.stringify({ username, email, displayName }),
        status: 'SUCCESS',
      },
    }).catch(() => {});

    const { passwordHash: _, ...safe } = user;
    return NextResponse.json({ data: safe }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/users]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
