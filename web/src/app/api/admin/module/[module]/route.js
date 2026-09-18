import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/module/[module]
// Returns all roles and users with their access status for a specific module
export async function GET(request, { params }) {
  try {
    const moduleName = decodeURIComponent(params.module);

    // Get all roles
    const roles = await prisma.role.findMany({ select: { id: true, name: true, isSystem: true } });
    // Get all users
    const users = await prisma.systemUser.findMany({ select: { id: true, username: true, displayName: true, status: true } });
    
    // Get module rights for this specific module
    const rights = await prisma.moduleRight.findMany({ where: { module: moduleName } });

    // Map the rights
    const roleRights = {};
    const userRights = {};

    rights.forEach(r => {
      if (r.roleId) roleRights[r.roleId] = r.isEnabled;
      if (r.userId) userRights[r.userId] = r.isEnabled;
    });

    return NextResponse.json({
      roles: roles.map(r => ({ ...r, isEnabled: roleRights[r.id] ?? false })), // Default to false if not specified
      users: users.map(u => ({ ...u, isEnabled: userRights[u.id] ?? false })), // Default to false if not specified
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/module/[module]
// Updates the access list for a specific module
// Body: { roleIds: ['id1', 'id2'], userIds: ['id1'] }
export async function POST(request, { params }) {
  try {
    const moduleName = decodeURIComponent(params.module);
    const { roleIds = [], userIds = [], updatedBy } = await request.json();

    // Strategy: We will delete existing rights for this module, then insert the new ones.
    // Or rather, we should update/upsert them. Since false might be useful for explicit deny, 
    // but the schema says isEnabled Boolean @default(true).
    // The simplest way to handle this is: Delete all records for this module, then create the active ones.
    
    await prisma.$transaction(async (tx) => {
      // Clear existing assignments for this module
      await tx.moduleRight.deleteMany({ where: { module: moduleName } });

      const dataToInsert = [];
      
      roleIds.forEach(roleId => {
        dataToInsert.push({ roleId, module: moduleName, isEnabled: true, createdBy: updatedBy });
      });

      userIds.forEach(userId => {
        dataToInsert.push({ userId, module: moduleName, isEnabled: true, createdBy: updatedBy });
      });

      if (dataToInsert.length > 0) {
        await tx.moduleRight.createMany({ data: dataToInsert, skipDuplicates: true });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: updatedBy,
          module: 'Admin',
          subModule: 'Module Access',
          action: 'UPDATE',
          entityType: 'ModuleRight',
          entityId: moduleName,
          newValues: JSON.stringify({ rolesAssigned: roleIds.length, usersAssigned: userIds.length }),
          status: 'SUCCESS',
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[POST /api/admin/module/${params.module}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
