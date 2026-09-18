import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// All 12 standard actions across the ERP
export const STANDARD_ACTIONS = [
  'View', 'Add', 'Edit', 'Delete',
  'Approve', 'Reject', 'Export', 'Print',
  'Download', 'Import', 'Submit', 'Cancel',
];

// All ERP modules and their sub-modules
export const MODULE_MAP = {
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
  Purchase: [
    'Requisitions', 'Purchase Orders', 'Vendors', 'Approvals',
  ],
  Store: [
    'Inventory', 'Issuing', 'Stock Reports',
  ],
  Planning: [
    'Schedule', 'Resource Planning', 'Progress Tracking',
  ],
  Site: [
    'Daily Progress', 'Site Attendance', 'Material Consumption',
  ],
  Accounts: [
    'Vouchers', 'Ledger', 'Reports', 'TDS', 'Bank',
  ],
  Marketing: [
    'Leads', 'Opportunities', 'Clients',
  ],
  Tender: [
    'Bids', 'Awards', 'Documents',
  ],
  Quality: [
    'Checklists', 'Inspection Reports', 'Punch Points',
  ],
  Safety: [
    'Incidents', 'Safety Inspections', 'Training',
  ],
  'Project Billing': [
    'Client Billing', 'Revenue Recognition', 'Reports',
  ],
  Subcontractor: [
    'Contracts', 'Bills', 'Payments',
  ],
};

// ─── GET /api/admin/roles ─────────────────────────────────────────────────────
// Returns all roles with their permission counts
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const includePermissions = searchParams.get('includePermissions') === 'true';

    const where = {};
    if (companyId) {
      where.OR = [{ companyId }, { companyId: null }];
    }

    const roles = await prisma.role.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { rolePermissions: true, userRoles: true } },
        rolePermissions: includePermissions
          ? { include: { permission: true } }
          : false,
      },
    });

    return NextResponse.json({ data: roles });
  } catch (err) {
    console.error('[GET /api/admin/roles]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST /api/admin/roles ────────────────────────────────────────────────────
// Body: { name, description?, companyId?, isSystem?, permissionIds?, createdBy? }
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name, description, companyId,
      isSystem = false, permissionIds = [], createdBy,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const role = await prisma.role.create({
      data: {
        name, description, companyId, isSystem, createdBy,
        rolePermissions: permissionIds.length > 0
          ? {
              create: permissionIds.map((permissionId) => ({
                permissionId,
                grantedBy: createdBy,
              })),
            }
          : undefined,
      },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: createdBy,
        module: 'Admin',
        subModule: 'Role & Rights',
        action: 'CREATE',
        entityType: 'Role',
        entityId: role.id,
        newValues: JSON.stringify({ name, permissionCount: permissionIds.length }),
        status: 'SUCCESS',
      },
    }).catch(() => {});

    return NextResponse.json({ data: role }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/roles]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
