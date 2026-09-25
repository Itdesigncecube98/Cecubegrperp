import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Checks whether the bearer token in the request has a given permission.
 *
 * Usage inside any API route:
 *   const check = await checkPermission(request, 'HR', 'Employee Master', 'Edit');
 *   if (!check.ok) return check.response;
 *   // proceed...
 *
 * @param {Request} request
 * @param {string}  module     - e.g. "HR"
 * @param {string}  subModule  - e.g. "Employee Master"
 * @param {string}  action     - e.g. "Edit"
 * @returns {{ ok: boolean, user?, response? }}
 */
export async function checkPermission(request, module, subModule, action) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized: no token' }, { status: 401 }),
    };
  }

  const session = await prisma.userSession.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session || !session.isActive) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized: session invalid' }, { status: 401 }),
    };
  }

  if (session.expiresAt && new Date() > session.expiresAt) {
    await prisma.userSession.update({
      where: { token },
      data: { isActive: false, logoutAt: new Date() },
    });
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized: session expired' }, { status: 401 }),
    };
  }

  const user = session.user;

  // Super admins bypass all permission checks
  if (user.isSuperAdmin) {
    return { ok: true, user };
  }

  // Check permission across all roles
  const hasPermission = user.userRoles.some((ur) =>
    ur.role.rolePermissions.some((rp) => {
      const p = rp.permission;
      return (
        p.module === module &&
        (p.subModule === subModule || p.subModule === null) &&
        p.action === action
      );
    }),
  );

  if (!hasPermission) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Forbidden: missing ${action} on ${module} → ${subModule}` },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user };
}

/**
 * Get all permissions for a token as a flat set and grouped map.
 */
export async function getUserPermissions(token) {
  if (!token) return { permissions: [], permissionsMap: {} };

  const session = await prisma.userSession.findUnique({
    where: { token },
    include: {
      user: {
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
      },
    },
  });

  if (!session || !session.isActive) return { permissions: [], permissionsMap: {} };

  const permissionsSet = new Set();
  const permissionsMap = {};

  for (const ur of session.user.userRoles) {
    for (const rp of ur.role.rolePermissions) {
      const p = rp.permission;
      permissionsSet.add(`${p.module}:${p.subModule || '*'}:${p.action}`);
      if (!permissionsMap[p.module]) permissionsMap[p.module] = {};
      const sub = p.subModule || '*';
      if (!permissionsMap[p.module][sub]) permissionsMap[p.module][sub] = [];
      if (!permissionsMap[p.module][sub].includes(p.action)) {
        permissionsMap[p.module][sub].push(p.action);
      }
    }
  }

  return {
    permissions: [...permissionsSet],
    permissionsMap,
    user: session.user,
    isSuperAdmin: session.user.isSuperAdmin,
  };
}
