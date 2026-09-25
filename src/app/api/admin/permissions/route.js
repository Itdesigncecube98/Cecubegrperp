import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STANDARD_ACTIONS = [
  'View', 'Add', 'Edit', 'Delete',
  'Approve', 'Reject', 'Export', 'Print',
  'Download', 'Import', 'Submit', 'Cancel',
];

const MODULE_MAP = {
  HR: [
    'Employee Master', 'Attendance', 'Leave Management', 'Shift Management',
    'Payroll', 'Appraisal', 'Recruitment', 'Imprest', 'Documents',
    'Organization Chart', 'Reports',
  ],
  Admin: [
    'User Management', 'Role & Rights', 'Company Setup',
    'Security Policy', 'Audit Log', 'License Management',
  ],
  Engineering: [
    'Projects', 'WBS', 'Budget', 'Estimate', 'Unit Library',
    'Task Library', 'Material Library', 'Manufacturing', 'Quality Check',
    'Project Wise Rate', 'Reports',
  ],
  Purchase: ['Requisitions', 'Purchase Orders', 'Vendors', 'Approvals'],
  Store: ['Inventory', 'Issuing', 'Stock Reports'],
  Planning: ['Schedule', 'Resource Planning', 'Progress Tracking'],
  Site: ['Daily Progress', 'Site Attendance', 'Material Consumption'],
  Accounts: ['Vouchers', 'Ledger', 'Reports', 'TDS', 'Bank'],
  Marketing: ['Leads', 'Opportunities', 'Clients'],
  Tender: ['Bids', 'Awards', 'Documents'],
  Quality: ['Checklists', 'Inspection Reports', 'Punch Points'],
  Safety: ['Incidents', 'Safety Inspections', 'Training'],
  'Project Billing': ['Client Billing', 'Revenue Recognition', 'Reports'],
  Subcontractor: ['Contracts', 'Bills', 'Payments'],
};

// ─── GET /api/admin/permissions ───────────────────────────────────────────────
// Returns all permissions, optionally filtered by module
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const module = searchParams.get('module');

    const where = module ? { module } : {};

    const permissions = await prisma.permission.findMany({
      where,
      orderBy: [{ module: 'asc' }, { subModule: 'asc' }, { action: 'asc' }],
    });

    // Group by module → subModule for UI consumption
    const grouped = {};
    for (const p of permissions) {
      if (!grouped[p.module]) grouped[p.module] = {};
      const sub = p.subModule || '_';
      if (!grouped[p.module][sub]) grouped[p.module][sub] = [];
      grouped[p.module][sub].push(p);
    }

    return NextResponse.json({ data: permissions, grouped, total: permissions.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST /api/admin/permissions/seed ─────────────────────────────────────────
// Seeds ALL permissions for all modules (idempotent via upsert)
// Call once during setup or when adding new modules
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;

    const existingCount = await prisma.permission.count();
    if (existingCount > 0 && !force) {
      return NextResponse.json({
        message: `${existingCount} permissions already exist. Pass force:true to re-seed.`,
        total: existingCount,
      });
    }

    const permissionsToCreate = [];
    for (const [module, subModules] of Object.entries(MODULE_MAP)) {
      for (const subModule of subModules) {
        for (const action of STANDARD_ACTIONS) {
          permissionsToCreate.push({
            module,
            subModule,
            action,
            description: `${action} access for ${module} → ${subModule}`,
          });
        }
      }
    }

    // Upsert all (createMany with skipDuplicates)
    let created = 0;
    for (const p of permissionsToCreate) {
      await prisma.permission.upsert({
        where: {
          module_subModule_action: {
            module: p.module,
            subModule: p.subModule,
            action: p.action,
          },
        },
        update: {},
        create: p,
      });
      created++;
    }

    // Seed default system roles
    await seedSystemRoles();

    return NextResponse.json({
      message: `Seeded ${created} permissions and default system roles`,
      total: created,
    });
  } catch (err) {
    console.error('[POST /api/admin/permissions]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Helper: seed default system roles ───────────────────────────────────────
async function seedSystemRoles() {
  const systemRoles = [
    {
      name: 'Super Admin',
      description: 'Full access to all modules and settings',
      isSystem: true,
      modules: Object.keys(MODULE_MAP), // all modules
    },
    {
      name: 'HR Manager',
      description: 'Full access to HR module',
      isSystem: true,
      modules: ['HR'],
    },
    {
      name: 'Site Engineer',
      description: 'View and Submit access to Engineering and Site modules',
      isSystem: true,
      modules: ['Engineering', 'Site'],
    },
    {
      name: 'Purchase Manager',
      description: 'Full access to Purchase module',
      isSystem: true,
      modules: ['Purchase', 'Store'],
    },
    {
      name: 'Accounts Manager',
      description: 'Full access to Accounts module',
      isSystem: true,
      modules: ['Accounts', 'Project Billing'],
    },
    {
      name: 'Viewer',
      description: 'Read-only access across all modules',
      isSystem: true,
      modules: Object.keys(MODULE_MAP),
      actionsFilter: ['View'],
    },
  ];

  for (const roleSpec of systemRoles) {
    const existing = await prisma.role.findUnique({ where: { name: roleSpec.name } });

    // Get relevant permissions
    const permWhere = {
      module: { in: roleSpec.modules },
      ...(roleSpec.actionsFilter ? { action: { in: roleSpec.actionsFilter } } : {}),
    };
    const perms = await prisma.permission.findMany({ where: permWhere });

    if (!existing) {
      await prisma.role.create({
        data: {
          name: roleSpec.name,
          description: roleSpec.description,
          isSystem: roleSpec.isSystem,
          rolePermissions: {
            create: perms.map((p) => ({ permissionId: p.id })),
          },
        },
      });
    }
  }
}
