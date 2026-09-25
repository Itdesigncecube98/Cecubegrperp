import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── GET /api/admin/roles/[id] ────────────────────────────────────────────────
export async function GET(request, { params }) {
  try {
    const role = await prisma.role.findUnique({
      where: { id: params.id },
      include: {
        rolePermissions: { include: { permission: true } },
        userRoles: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, status: true },
            },
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({ data: role });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH /api/admin/roles/[id] ─────────────────────────────────────────────
// Body: { name?, description?, isActive?, permissionIds?, updatedBy? }
export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const { name, description, isActive, permissionIds, updatedBy } = body;

    const role = await prisma.role.findUnique({ where: { id: params.id } });
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    const updateData = {};
    if (name        !== undefined) updateData.name        = name;
    if (description !== undefined) updateData.description = description;
    if (isActive    !== undefined) updateData.isActive    = isActive;

    // Replace permissions if provided
    if (Array.isArray(permissionIds)) {
      await prisma.rolePermission.deleteMany({ where: { roleId: params.id } });
      if (permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: params.id,
            permissionId,
            grantedBy: updatedBy,
          })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await prisma.role.update({
      where: { id: params.id },
      data: updateData,
      include: {
        rolePermissions: { include: { permission: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: updatedBy,
        module: 'Admin',
        subModule: 'Role & Rights',
        action: 'UPDATE',
        entityType: 'Role',
        entityId: params.id,
        newValues: JSON.stringify(updateData),
        status: 'SUCCESS',
      },
    }).catch(() => {});

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE /api/admin/roles/[id] ────────────────────────────────────────────
export async function DELETE(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const deletedBy = searchParams.get('deletedBy');

    const role = await prisma.role.findUnique({ where: { id: params.id } });
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    if (role.isSystem) {
      return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 403 });
    }

    // Check if role is assigned to users
    const usersWithRole = await prisma.userRole.count({ where: { roleId: params.id } });
    if (usersWithRole > 0) {
      return NextResponse.json(
        { error: `Role is assigned to ${usersWithRole} user(s). Remove assignments first.` },
        { status: 409 },
      );
    }

    await prisma.role.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        userId: deletedBy,
        module: 'Admin',
        subModule: 'Role & Rights',
        action: 'DELETE',
        entityType: 'Role',
        entityId: params.id,
        status: 'SUCCESS',
      },
    }).catch(() => {});

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
