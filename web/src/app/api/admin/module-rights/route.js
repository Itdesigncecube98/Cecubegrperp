import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALL_MODULES = [
  'HR', 'Admin', 'Marketing', 'Tender', 'Engineering',
  'Planning', 'Site', 'Purchase', 'Store', 'Subcontractor',
  'Quality', 'Safety', 'Project Billing', 'Accounts',
  'Workflow', 'Reports', 'Management Dashboard',
];

// ─── GET /api/admin/module-rights?userId=&roleId= ────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const roleId = searchParams.get('roleId');

    const where = {};
    if (userId) where.userId = userId;
    if (roleId) where.roleId = roleId;

    const rights = await prisma.moduleRight.findMany({ where });

    // Return as map: { module: isEnabled }
    const map = {};
    ALL_MODULES.forEach(m => { map[m] = true; }); // default all enabled
    rights.forEach(r => { map[r.module] = r.isEnabled; });

    return NextResponse.json({ data: rights, map, allModules: ALL_MODULES });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST /api/admin/module-rights ────────────────────────────────────────────
// Body: { userId?, roleId?, moduleRights: { [module]: boolean }, updatedBy? }
export async function POST(request) {
  try {
    const { userId, roleId, moduleRights, updatedBy } = await request.json();

    if (!userId && !roleId) {
      return NextResponse.json({ error: 'userId or roleId required' }, { status: 400 });
    }

    const results = [];
    for (const [module, isEnabled] of Object.entries(moduleRights)) {
      const where = userId
        ? { userId_module: { userId, module } }
        : { roleId_module: { roleId, module } };

      const data = userId
        ? { userId, module, isEnabled, createdBy: updatedBy }
        : { roleId, module, isEnabled, createdBy: updatedBy };

      const right = await prisma.moduleRight.upsert({
        where,
        update: { isEnabled },
        create: data,
      });
      results.push(right);
    }

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: updatedBy,
        module: 'Admin',
        subModule: 'Role & Rights',
        action: 'UPDATE',
        entityType: userId ? 'UserModuleRights' : 'RoleModuleRights',
        entityId: userId || roleId,
        newValues: JSON.stringify(moduleRights),
        status: 'SUCCESS',
      },
    }).catch(() => {});

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error('[POST /api/admin/module-rights]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
