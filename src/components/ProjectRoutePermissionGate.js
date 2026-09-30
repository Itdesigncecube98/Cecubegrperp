'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { usePermissions } from '@/context/PermissionsContext';

const ROUTE_RIGHTS = [
  ['/contracting/contractors/contractor-list', 'CONTRACT_CONTRACTOR_LIST'],
  ['/contracting/contractors/add-contractor', 'CONTRACT_CONTRACTOR_EDIT'],
  ['/contracting/contractors/add-group', 'CONTRACT_ADD_GROUP'],
  ['/contracting/contractors/registered-suppliers', 'CONTRACT_REG_SUPPLIERS'],
  ['/contracting/contractors/insurance/policy-detail', 'CONTRACT_INSURANCE_POLICY'],
  ['/contracting/contractors/insurance', 'CONTRACT_INSURANCE_POLICY'],
  ['/contracting/contractors/labour-master', 'CONTRACT_LABOUR_MASTER'],
  ['/contracting/labour/requisition', 'CONTRACT_REQ_GEN'],
  ['/contracting/labour/requisition-browse', 'CONTRACT_REQ_BROWSE'],
  ['/contracting/work-order/raise', 'CONTRACT_WO_PAGE'],
  ['/contracting/work-order/browse', 'CONTRACT_WO_BROWSE'],
  ['/contracting/labour/rate-master', 'CONTRACT_LABOUR_RATE_MASTER'],
  ['/contracting/ra-bills/generation', 'CONTRACT_RA_PAGE'],
  ['/contracting/ra-bills/', 'CONTRACT_RA_PAGE'],
  ['/contracting/ra-bills', 'CONTRACT_RA_BROWSE'],
  ['/contracting/advance', 'CONTRACT_RA_ADVANCE'],
  ['/contracting/enquiry/enquiry-generation', 'CONTRACT_ENQUIRY_GEN'],
  ['/contracting/enquiry/browse', 'CONTRACT_ENQUIRY_BROWSE'],
  ['/contracting/quotation/entry', 'CONTRACT_QUOTATION_ENTRY'],
  ['/contracting/quotation/browse', 'CONTRACT_QUOTATION_BROWSE'],
  ['/contracting/quotation/compare', 'CONTRACT_QUOTATION_COMPARE'],
  ['/engineering/dashboard', 'ENGG_PROJECT_DASHBOARD'], ['/engineering/projects', 'ENGG_PROJECT_MASTER'],
  ['/engineering/projects/add-project', 'ENGG_PROJECT_CREATE'],
  ['/engineering', 'ENGG_PROJECT_DASHBOARD'],
  ['/engineering/projects/scope', 'ENGG_CONTRACT_SCOPE'], ['/engineering/projects/team', 'ENGG_TEAM_ALLOCATION'],
  ['/engineering/engineering/define-wbs', 'ENGG_DEFINE_WBS'], ['/engineering/projects/wbs-budget', 'ENGG_WBS_BUDGET'],
  ['/engineering/projects/budget-transaction-browse', 'ENGG_BUDGET_TXN_BROWSE'],
  ['/engineering/master/library-manager', 'ENGG_LIBRARY_MANAGER'], ['/engineering/library/task', 'ENGG_TASK_LIBRARY'],
  ['/engineering/library/material', 'ENGG_MATERIAL_LIBRARY'], ['/engineering/library/equipment', 'ENGG_EQUIPMENT_LIBRARY'],
  ['/engineering/library/labour', 'ENGG_LABOUR_LIBRARY'], ['/engineering/master/unit-master', 'ENGG_UNIT_MASTER'],
  ['/engineering/library/project-category-1', 'ENGG_PROJECT_CATEGORY_1'], ['/engineering/library/project-category-2', 'ENGG_PROJECT_CATEGORY_2'],
  ['/engineering/library/company', 'ENGG_LIBRARY_MANAGER'],
  ['/purchase/dashboard', 'PURCHASE_DASHBOARD'], ['/purchase/pr', 'PURCHASE_PR'],
  ['/purchase', 'PURCHASE_DASHBOARD'],
  ['/purchase/vendors', 'PURCHASE_VENDOR_MASTER'], ['/purchase/brands', 'PURCHASE_BRAND_MASTER'],
  ['/purchase/enquiry/generation', 'PURCHASE_ENQUIRY_GENERATION'], ['/purchase/enquiry/browse', 'PURCHASE_ENQUIRY_BROWSE'],
  ['/purchase/quotation', 'PURCHASE_QUOTATION'], ['/purchase/po/browse', 'PURCHASE_PO_BROWSE'],
  ['/purchase/quotation/compare', 'PURCHASE_QUOTATION'], ['/purchase/quotation/entry', 'PURCHASE_QUOTATION'],
  ['/purchase/requisition/browse', 'PURCHASE_PR'],
  ['/purchase/po/print', 'PURCHASE_PO_VIEW'],
  ['/purchase/po', 'PURCHASE_PO'], ['/purchase/advance', 'PURCHASE_ADVANCE'], ['/purchase/bills', 'PURCHASE_BILLS'],
  ['/purchase/po/create', 'PURCHASE_PO'],
  ['/marketing/dashboard', 'MARKETING_DASHBOARD'], ['/marketing/analytics', 'MARKETING_ANALYTICS'],
  ['/marketing/leads', 'MARKETING_LEAD_REGISTER'], ['/marketing/clients', 'MARKETING_CUSTOMER_MASTER'],
  ['/marketing/opportunities', 'MARKETING_OPP_PIPELINE'], ['/marketing/proposals', 'MARKETING_TENDER_PROPOSAL'],
  ['/marketing/won-lost', 'MARKETING_HANDOVER'],
  ['/site/dashboard', 'SITE_DASHBOARD'], ['/site/dpr', 'SITE_DPR'], ['/site/work-completion', 'SITE_WORK_COMPLETION'],
  ['/site/material', 'SITE_MATERIAL_REQUISITION'], ['/site/material/gtn', 'SITE_GTN'], ['/site/material/grn', 'SITE_GRN'],
  ['/site/store', 'SITE_STORE'], ['/site/task-status', 'SITE_TASK_STATUS'], ['/site/quality', 'SITE_QUALITY'],
  ['/site/dpr/new-dpr', 'SITE_DPR'], ['/site/dpr/', 'SITE_DPR'],
  ['/site/gtn', 'SITE_GTN'], ['/site/grn', 'SITE_GRN'], ['/site/material/new-requisition', 'SITE_MATERIAL_REQUISITION'],
  ['/marketing/enquiries/create', 'MARKETING_PROJECT_ENQUIRY_CREATE'],
  ['/marketing/enquiries/', 'MARKETING_PROJECT_ENQUIRY_EDIT'],
  ['/marketing/enquiries', 'MARKETING_PROJECT_ENQUIRIES'],
];

export default function ProjectRoutePermissionGate({ children }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { activeEmployee, permissionsLoaded, hasRight } = usePermissions();
  useEffect(() => setMounted(true), []);
  const right = ROUTE_RIGHTS.slice().sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => path.endsWith('/') ? pathname.startsWith(path) : pathname === path || pathname.startsWith(`${path}/`))?.[1];
  const employeeSession = mounted && sessionStorage.getItem('isAdmin') !== 'true' &&
    (!!activeEmployee || !!localStorage.getItem('employeeData'));
  const allowed = !employeeSession || (!!activeEmployee && permissionsLoaded && !!right && hasRight(right));

  // Keep the server and first browser render identical; browser session storage
  // is only consulted after mount to avoid a hydration mismatch.
  if (!mounted) return <div style={{ padding: 32, color: '#64748b' }}>Preparing workspace…</div>;
  if (employeeSession && !activeEmployee) return <div style={{ padding: 32, color: '#64748b' }}>Loading employee session…</div>;
  if (employeeSession && activeEmployee && !permissionsLoaded) return <div style={{ padding: 32, color: '#64748b' }}>Loading project permissions…</div>;
  if (employeeSession && !allowed) return <div style={{ padding: 32, color: '#64748b' }}>You do not have access to this page for any assigned project.</div>;
  return children;
}
