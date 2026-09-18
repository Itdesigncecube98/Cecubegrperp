import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── POST /api/admin/seed-super-admin ────────────────────────────────────────
// One-time bootstrap: creates super admin user + seeds all permissions + system roles
// Only works if no SystemUser exists yet OR ?force=true is passed
// Body: { username, email, password, displayName }
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const existing = await prisma.systemUser.count();
    if (existing > 0 && !force) {
      return NextResponse.json(
        { error: 'System already initialized. Pass ?force=true to override.' },
        { status: 409 },
      );
    }

    const body = await request.json();
    const {
      username    = 'superadmin',
      email       = 'admin@cecube.in',
      password    = 'Admin@1234',
      displayName = 'Super Administrator',
    } = body;

    // ── 1. Seed ALL permissions in a single batch ──────────────────────────
    const MODULE_MAP = {
      HR:              ['Employee Master','Attendance','Leave Management','Shift Management','Payroll','Appraisal','Recruitment','Imprest','Documents','Organization Chart','Reports'],
      Admin:           ['User Management','Role & Rights','Company Setup','Security Policy','Audit Log','License Management'],
      Engineering:     ['Projects','WBS','Budget','Estimate','Unit Library','Task Library','Material Library','Manufacturing','Quality Check','Project Wise Rate','Reports'],
      Purchase:        ['Requisitions','Purchase Orders','Vendors','Approvals'],
      Store:           ['Inventory','Issuing','Stock Reports'],
      Planning:        ['Schedule','Resource Planning','Progress Tracking'],
      Site:            ['Daily Progress','Site Attendance','Material Consumption'],
      Accounts:        ['Vouchers','Ledger','Reports','TDS','Bank'],
      Marketing:       ['Leads','Opportunities','Clients'],
      Tender:          ['Bids','Awards','Documents'],
      Quality:         ['Checklists','Inspection Reports','Punch Points'],
      Safety:          ['Incidents','Safety Inspections','Training'],
      'Project Billing':['Client Billing','Revenue Recognition','Reports'],
      Subcontractor:   ['Contracts','Bills','Payments'],
    };
    const ACTIONS = ['View','Add','Edit','Delete','Approve','Reject','Export','Print','Download','Import','Submit','Cancel'];

    const permissionsData = [];
    for (const [module, subModules] of Object.entries(MODULE_MAP)) {
      for (const subModule of subModules) {
        for (const action of ACTIONS) {
          permissionsData.push({ module, subModule, action, description: `${action} on ${module} → ${subModule}` });
        }
      }
    }

    // Single batch insert — skipDuplicates makes this idempotent
    await prisma.permission.createMany({ data: permissionsData, skipDuplicates: true });

    // ── 2. Super Admin role (all permissions) ─────────────────────────────
    let superAdminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
    if (!superAdminRole) {
      const allPerms = await prisma.permission.findMany({ select: { id: true } });
      superAdminRole = await prisma.role.create({
        data: {
          name: 'Super Admin', description: 'Full access to all modules', isSystem: true,
          rolePermissions: {
            createMany: { data: allPerms.map((p) => ({ permissionId: p.id })), skipDuplicates: true },
          },
        },
      });
    }

    // ── 3. Other default system roles ─────────────────────────────────────
    const defaultRoles = [
      { name: 'HR Manager',       modules: ['HR'],                           description: 'Full HR module access' },
      { name: 'Site Engineer',    modules: ['Engineering','Site'],           description: 'Engineering & Site access' },
      { name: 'Purchase Manager', modules: ['Purchase','Store'],             description: 'Purchase & Store access' },
      { name: 'Accounts Manager', modules: ['Accounts','Project Billing'],   description: 'Accounts & Billing access' },
      { name: 'Viewer',           modules: Object.keys(MODULE_MAP), actionsFilter: ['View'], description: 'Read-only across all modules' },
    ];

    for (const spec of defaultRoles) {
      const exists = await prisma.role.findUnique({ where: { name: spec.name } });
      if (!exists) {
        const perms = await prisma.permission.findMany({
          where: { module: { in: spec.modules }, ...(spec.actionsFilter ? { action: { in: spec.actionsFilter } } : {}) },
          select: { id: true },
        });
        await prisma.role.create({
          data: {
            name: spec.name, description: spec.description, isSystem: true,
            rolePermissions: {
              createMany: { data: perms.map((p) => ({ permissionId: p.id })), skipDuplicates: true },
            },
          },
        });
      }
    }

    // ── 4. Super admin user ───────────────────────────────────────────────
    const passwordHash  = await bcrypt.hash(password, 12);
    const existingUser  = await prisma.systemUser.findFirst({ where: { OR: [{ username }, { email }] } });

    let user;
    if (existingUser) {
      user = await prisma.systemUser.update({
        where: { id: existingUser.id },
        data:  { passwordHash, isSuperAdmin: true, status: 'Active' },
      });
    } else {
      user = await prisma.systemUser.create({
        data: {
          username, email, passwordHash, displayName, isSuperAdmin: true,
          userRoles: { create: [{ roleId: superAdminRole.id }] },
        },
      });
    }

    // ── 5. Default security policy ────────────────────────────────────────
    await prisma.securityPolicy.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

    return NextResponse.json({
      message: 'System initialized successfully',
      permissionsSeeded: permissionsData.length,
      superAdminUserId:  user.id,
      credentials: { username, email, note: 'Change your password after first login!' },
    });
  } catch (err) {
    console.error('[POST /api/admin/seed-super-admin]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
