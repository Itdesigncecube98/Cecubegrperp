import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { attachAuthSession } from '@/lib/authSession';

const prisma = new PrismaClient();

// ─── POST /api/admin/auth/login ───────────────────────────────────────────────
// Body: { username (or email), password, ipAddress?, userAgent? }
export async function POST(request) {
  let ipAddress, usernameOrEmail;
  try {
    const body = await request.json();
    usernameOrEmail = body.username || body.email;
    const { password, userAgent } = body;
    ipAddress = body.ipAddress || request.headers.get('x-forwarded-for') || 'unknown';

    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { error: 'username/email and password are required' },
        { status: 400 },
      );
    }

    // Find user
    const user = await prisma.systemUser.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail },
          { email:    usernameOrEmail },
        ],
        status: { not: 'Deleted' },
      },
      include: {
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
    });

    if (!user) {
      await logFailedAttempt(null, 'Admin', 'Login', 'SystemUser', usernameOrEmail, ipAddress, 'User not found');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check lockout
    if (user.status === 'Locked') {
      return NextResponse.json({ error: 'Account is locked. Contact administrator.' }, { status: 403 });
    }
    if (user.status === 'Inactive') {
      return NextResponse.json({ error: 'Account is inactive.' }, { status: 403 });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      // Increment failed attempts; lock if threshold reached
      const policy = await prisma.securityPolicy.findUnique({ where: { id: 1 } });
      const maxAttempts = policy?.maxFailedAttempts ?? 5;
      const newAttempts = user.failedAttempts + 1;

      const updateData = { failedAttempts: newAttempts };
      if (newAttempts >= maxAttempts) {
        updateData.status  = 'Locked';
        updateData.lockedAt = new Date();
      }
      await prisma.systemUser.update({ where: { id: user.id }, data: updateData });

      await logFailedAttempt(user.id, 'Admin', 'Login', 'SystemUser', user.id, ipAddress, 'Wrong password');

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Success — reset failed attempts, update last login
    await prisma.systemUser.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lastLoginAt: new Date(), lockedAt: null },
    });

    // Create session token
    const token = crypto.randomBytes(48).toString('hex');
    const policy = await prisma.securityPolicy.findUnique({ where: { id: 1 } });
    const timeoutMins = policy?.sessionTimeoutMins ?? 480;

    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + timeoutMins * 60 * 1000),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId:     user.id,
        module:     'Admin',
        subModule:  'Auth',
        action:     'LOGIN',
        entityType: 'SystemUser',
        entityId:   user.id,
        ipAddress,
        userAgent,
        status: 'SUCCESS',
      },
    }).catch(() => {});

    // Build permissions map
    const permissionsSet = new Set();
    const permissionsMap = {};
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        const p = rp.permission;
        const key = `${p.module}:${p.subModule || '*'}:${p.action}`;
        permissionsSet.add(key);
        if (!permissionsMap[p.module]) permissionsMap[p.module] = {};
        if (!permissionsMap[p.module][p.subModule || '*']) {
          permissionsMap[p.module][p.subModule || '*'] = [];
        }
        if (!permissionsMap[p.module][p.subModule || '*'].includes(p.action)) {
          permissionsMap[p.module][p.subModule || '*'].push(p.action);
        }
      }
    }

    const { passwordHash, ...safeUser } = user;

    const response = NextResponse.json({
      data: {
        user: safeUser,
        token: session.token,
        expiresAt: session.expiresAt,
        permissions: [...permissionsSet],
        permissionsMap,
      },
    });
    return attachAuthSession(response, { type: 'admin', id: user.id });
  } catch (err) {
    console.error('[POST /api/admin/auth/login]', err);
    await logFailedAttempt(null, 'Admin', 'Login', 'SystemUser', usernameOrEmail || 'unknown', ipAddress, err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function logFailedAttempt(userId, module, action, entityType, entityId, ipAddress, remarks) {
  await prisma.auditLog.create({
    data: {
      userId, module, subModule: 'Auth',
      action, entityType, entityId: String(entityId),
      ipAddress, status: 'FAILURE', remarks,
    },
  }).catch(() => {});
}
