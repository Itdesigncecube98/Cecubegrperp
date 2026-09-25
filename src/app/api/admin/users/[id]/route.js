import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── GET /api/admin/users/[id] ───────────────────────────────────────────────
export async function GET(request, { params }) {
  try {
    const user = await prisma.systemUser.findUnique({
      where: { id: params.id },
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
        sessions: {
          where: { isActive: true },
          orderBy: { loginAt: 'desc' },
          take: 5,
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { passwordHash, ...safe } = user;
    return NextResponse.json({ data: safe });
  } catch (err) {
    console.error('[GET /api/admin/users/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH /api/admin/users/[id] ─────────────────────────────────────────────
// Body: any updatable field; password requires currentPassword or superAdmin flag
export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const {
      displayName, email, username, companyId, employeeId,
      isSuperAdmin, status, password, roleIds,
      updatedBy,
    } = body;

    const current = await prisma.systemUser.findUnique({ where: { id: params.id } });
    if (!current) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (email       !== undefined) updateData.email       = email;
    if (username    !== undefined) updateData.username    = username;
    if (companyId   !== undefined) updateData.companyId   = companyId;
    if (employeeId  !== undefined) updateData.employeeId  = employeeId;
    if (isSuperAdmin !== undefined) updateData.isSuperAdmin = isSuperAdmin;
    if (status      !== undefined) {
      updateData.status = status;
      if (status === 'Active') {
        updateData.failedAttempts = 0;
        updateData.lockedAt       = null;
      }
    }
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    // Role replacement
    if (Array.isArray(roleIds)) {
      // Delete existing then recreate
      await prisma.userRole.deleteMany({ where: { userId: params.id } });
      if (roleIds.length > 0) {
        await prisma.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: params.id,
            roleId,
            assignedBy: updatedBy,
          })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await prisma.systemUser.update({
      where: { id: params.id },
      data: updateData,
      include: { userRoles: { include: { role: true } } },
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: updatedBy,
        module: 'Admin',
        subModule: 'User Management',
        action: 'UPDATE',
        entityType: 'SystemUser',
        entityId: params.id,
        oldValues: JSON.stringify({
          status: current.status,
          email: current.email,
        }),
        newValues: JSON.stringify(updateData),
        status: 'SUCCESS',
      },
    }).catch(() => {});

    const { passwordHash, ...safe } = updated;
    return NextResponse.json({ data: safe });
  } catch (err) {
    console.error('[PATCH /api/admin/users/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE /api/admin/users/[id] ────────────────────────────────────────────
// Soft-delete by setting status = 'Deleted'
export async function DELETE(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const deletedBy = searchParams.get('deletedBy');

    const user = await prisma.systemUser.findUnique({ where: { id: params.id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.isSuperAdmin) {
      return NextResponse.json({ error: 'Cannot delete a Super Admin' }, { status: 403 });
    }

    await prisma.systemUser.update({
      where: { id: params.id },
      data: { status: 'Deleted' },
    });

    await prisma.auditLog.create({
      data: {
        userId: deletedBy,
        module: 'Admin',
        subModule: 'User Management',
        action: 'DELETE',
        entityType: 'SystemUser',
        entityId: params.id,
        status: 'SUCCESS',
      },
    }).catch(() => {});

    return NextResponse.json({ message: 'User soft-deleted successfully' });
  } catch (err) {
    console.error('[DELETE /api/admin/users/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
