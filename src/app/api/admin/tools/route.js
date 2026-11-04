import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PROJECT_EMPLOYEE_TOOLS } from '@/lib/employeeToolCatalog';
import { readAuthSession } from '@/lib/authSession';

// ─── All canonical admin tools ─────────────────────────────────────────────────
const LEGACY_ADMIN_TOOLS = {
  Contracting: [
    { name: 'Contractor List', code: 'CONTRACT_CONTRACTOR_LIST' },
    { name: 'Add Group', code: 'CONTRACT_ADD_GROUP' },
    { name: 'Registered Suppliers', code: 'CONTRACT_REG_SUPPLIERS' },
    { name: 'Insurance Policy Detail', code: 'CONTRACT_INSURANCE_POLICY' },
    { name: 'Labour Master', code: 'CONTRACT_LABOUR_MASTER' },
    { name: 'Requisition Generation', code: 'CONTRACT_REQ_GEN' },
    { name: 'Requisition Browse', code: 'CONTRACT_REQ_BROWSE' },
    { name: 'Labour Requisition Approve', code: 'CONTRACT_REQ_APPROVE' },
    { name: 'Labour Requisition wise WO Generation', code: 'CONTRACT_REQ_WO_GEN' },
    { name: 'Create Work Order', code: 'CONTRACT_WO_RAISE' },
    { name: 'View Work Order', code: 'CONTRACT_WO_BROWSE' },
    { name: 'Create RA Bill', code: 'CONTRACT_RA_GEN' },
    { name: 'RA Bill Advance', code: 'CONTRACT_RA_ADVANCE' },
    { name: 'Enquiry Generation', code: 'CONTRACT_ENQUIRY_GEN' },
    { name: 'Enquiry Browse', code: 'CONTRACT_ENQUIRY_BROWSE' },
    { name: 'Quotation Entry', code: 'CONTRACT_QUOTATION_ENTRY' },
    { name: 'Quotation Browse', code: 'CONTRACT_QUOTATION_BROWSE' },
    { name: 'Quotation Compare', code: 'CONTRACT_QUOTATION_COMPARE' },
  ],
  Engineering: [
    { name: 'Project Dashboard', code: 'ENGG_PROJECT_DASHBOARD' },
    { name: 'Project Master', code: 'ENGG_PROJECT_MASTER' },
    { name: 'Contract & Scope', code: 'ENGG_CONTRACT_SCOPE' },
    { name: 'Team Allocation', code: 'ENGG_TEAM_ALLOCATION' },
    { name: 'Define WBS', code: 'ENGG_DEFINE_WBS' },
    { name: 'WBS Budget', code: 'ENGG_WBS_BUDGET' },
    { name: 'Library Manager', code: 'ENGG_LIBRARY_MANAGER' },
    { name: 'Task Library', code: 'ENGG_TASK_LIBRARY' },
    { name: 'Material Library', code: 'ENGG_MATERIAL_LIBRARY' },
    { name: 'Equipment Library', code: 'ENGG_EQUIPMENT_LIBRARY' },
    { name: 'Labour Library', code: 'ENGG_LABOUR_LIBRARY' },
    { name: 'Unit Master', code: 'ENGG_UNIT_MASTER' },
    { name: 'Project Category 1', code: 'ENGG_PROJECT_CATEGORY_1' },
    { name: 'Project Category 2', code: 'ENGG_PROJECT_CATEGORY_2' },
  ],
  Purchase: [
    { name: 'Purchase Dashboard', code: 'PURCHASE_DASHBOARD' },
    { name: 'Purchase Indent (PR)', code: 'PURCHASE_PR' },
    { name: 'Vendor Master', code: 'PURCHASE_VENDOR_MASTER' },
    { name: 'Brand Master', code: 'PURCHASE_BRAND_MASTER' },
    { name: 'Enquiry Generation', code: 'PURCHASE_ENQUIRY_GENERATION' },
    { name: 'Enquiry Browse', code: 'PURCHASE_ENQUIRY_BROWSE' },
    { name: 'Quotation', code: 'PURCHASE_QUOTATION' },
    { name: 'Purchase Orders (PO)', code: 'PURCHASE_PO' },
    { name: 'PO Material Browse', code: 'PURCHASE_PO_BROWSE' },
    { name: 'Purchase Advance', code: 'PURCHASE_ADVANCE' },
    { name: 'Purchase Bills', code: 'PURCHASE_BILLS' },
    { name: 'Supplier', code: 'PURCHASE_REPORT_SUPPLIER' },
    { name: 'Short Supplier', code: 'PURCHASE_REPORT_SHORT_SUPPLIER' },
    { name: 'Supplier Summary', code: 'PURCHASE_REPORT_SUPPLIER_SUMMARY' },
    { name: 'Supplier Rating', code: 'PURCHASE_REPORT_SUPPLIER_RATING' },
    { name: 'PO Analysis', code: 'PURCHASE_REPORT_PO_ANALYSIS' },
    { name: 'Supplier Wise Transaction', code: 'PURCHASE_REPORT_SUPPLIER_TXN' },
    { name: 'Supplier Wise PO', code: 'PURCHASE_REPORT_SUPPLIER_PO' },
    { name: 'Payment Summary', code: 'PURCHASE_REPORT_PAYMENT_SUMMARY' },
    { name: 'Payment Details', code: 'PURCHASE_REPORT_PAYMENT_DETAILS' },
    { name: 'Date Tracking', code: 'PURCHASE_REPORT_DATE_TRACKING' },
    { name: 'Ageing', code: 'PURCHASE_REPORT_AGEING' },
  ],
  Site: [
    { name: 'Site Dashboard', code: 'SITE_DASHBOARD' },
    { name: 'Daily Progress (DPR)', code: 'SITE_DPR' },
    { name: 'Work Completion', code: 'SITE_WORK_COMPLETION' },
    { name: 'Material Requisition', code: 'SITE_MATERIAL_REQUISITION' },
    { name: 'GTN (Testing Note)', code: 'SITE_GTN' },
    { name: 'GRN Register', code: 'SITE_GRN' },
    { name: 'Site Store', code: 'SITE_STORE' },
    { name: 'Task Status', code: 'SITE_TASK_STATUS' },
    { name: 'Quality & Safety', code: 'SITE_QUALITY' },
  ],
  Marketing: [
    { name: 'Marketing Dashboard', code: 'MARKETING_DASHBOARD' },
    { name: 'Analytics', code: 'MARKETING_ANALYTICS' },
    { name: 'Lead Register', code: 'MARKETING_LEAD_REGISTER' },
    { name: 'Customer Master', code: 'MARKETING_CUSTOMER_MASTER' },
    { name: 'Opportunity Pipeline', code: 'MARKETING_OPP_PIPELINE' },
    { name: 'Tender & Proposal', code: 'MARKETING_TENDER_PROPOSAL' },
    { name: 'Handover to Project', code: 'MARKETING_HANDOVER' },
  ]
};

// Employee Tools is the source of truth for project-wise module permissions.
// Marketing keeps its independent, non-project role permissions.
export const ALL_ADMIN_TOOLS = {
  ...PROJECT_EMPLOYEE_TOOLS,
  Marketing: [...new Map([...LEGACY_ADMIN_TOOLS.Marketing, ...(PROJECT_EMPLOYEE_TOOLS.Marketing || [])].map(tool => [tool.name, tool])).values()],
};

// Tool catalog seeding used by Employee Access only.
// Role-based tool permission reads and writes have been removed.
export async function POST(req) {
  try {
    const session = readAuthSession(req);
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: 'Administrator access is required to sync the Employee Access tool catalog.' }, { status: session ? 403 : 401 });
    }
    const body = await req.json();

    // Seed all tools — purge old entries first so stale items are gone
    if (body.action === 'seed') {
      // Build the set of valid (module, name) pairs from the new list
      const validPairs = new Set(
        Object.entries(ALL_ADMIN_TOOLS).flatMap(([module, tools]) =>
          tools.map(t => `${module}||${t.name}`)
        )
      );

      const existing = await prisma.adminTool.findMany({
        select: {
          id: true, module: true, name: true,
          employeeProjectAccess: { select: { employeeId: true, projectId: true, granted: true } },
        },
      });
      const staleTools = existing.filter(tool => !validPairs.has(`${tool.module}||${tool.name}`));
      const toDelete = staleTools.map(tool => tool.id);

      // Move access from renamed combined tools to the nearest read permission;
      // never silently broaden an existing grant to Create/Edit.
      const renamedTargets = {
        'Contracting||Raise Work Order': 'Create Work Order',
        'Contracting||Browse Work Order': 'View Work Order',
        'Contracting||RA Bill Generation': 'Create RA Bill',
        'Contracting||RA Bill Browse': 'View RA Bill',
        'Contracting||RA Bill Approval': 'Approve RA Bill',
        'Purchase||Purchase Indent (PR)': 'Purchase Indent View',
        'Purchase||Purchase Indent (PR) Create/View/Edit': 'Purchase Indent View',
        'Purchase||Vendor Master': 'Vendor Master View',
        'Purchase||Vendor Master Create/View/Edit': 'Vendor Master View',
        'Purchase||Purchase Orders (PO)': 'Purchase Orders View',
        'Purchase||Purchase Bills': 'Purchase Bills View',
      };

      // Upsert all canonical tools
      let count = 0;
      const seededTools = new Map();
      for (const [module, tools] of Object.entries(ALL_ADMIN_TOOLS)) {
        for (const t of tools) {
          const saved = await prisma.adminTool.upsert({
            where: { module_name: { module, name: t.name } },
            update: { code: t.code },
            create: { module, name: t.name, code: t.code },
          });
          seededTools.set(`${module}||${t.name}`, saved.id);
          count++;
        }
      }

      const employeeMigrations = [];
      for (const oldTool of staleTools) {
        const targetName = renamedTargets[`${oldTool.module}||${oldTool.name}`];
        const targetId = targetName && seededTools.get(`${oldTool.module}||${targetName}`);
        if (!targetId) continue;
        oldTool.employeeProjectAccess.forEach(access => employeeMigrations.push({ ...access, toolId: targetId }));
      }
      if (employeeMigrations.length) await prisma.employeeProjectToolAccess.createMany({ data: employeeMigrations, skipDuplicates: true });
      if (toDelete.length) await prisma.adminTool.deleteMany({ where: { id: { in: toDelete } } });
      return NextResponse.json({
        seeded: count,
        purged: toDelete.length,
        migratedEmployeeGrants: employeeMigrations.length,
      });
    }

    return NextResponse.json({ error: 'Only Employee Access catalog sync is supported.' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
