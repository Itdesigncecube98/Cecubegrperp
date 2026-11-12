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
  ['/contracting/labour/requisition', 'CONTRACT_REQ_GEN'],
  ['/contracting/labour/requisition-browse', 'CONTRACT_REQ_BROWSE'],
  ['/contracting/work-order/raise', ['CONTRACT_WO_RAISE', 'CONTRACT_WO_BROWSE', 'CONTRACT_WO_EDIT', 'CONTRACT_WO_PAGE']],
  ['/contracting/work-order/browse', 'CONTRACT_WO_PAGE'],
  ['/contracting/reports', 'CONTRACT_RA_BROWSE'],
  ['/contracting/ra-bills/generation', 'CONTRACT_RA_PAGE'],
  ['/contracting/ra-bills/', 'CONTRACT_RA_PAGE'],
  ['/contracting/ra-bills', 'CONTRACT_RA_PAGE'],
  ['/contracting/advance', 'CONTRACT_RA_ADVANCE'],
  ['/contracting/enquiry/enquiry-generation', 'CONTRACT_ENQUIRY_GEN'],
  ['/contracting/enquiry/browse', ['CONTRACT_ENQUIRY_GEN', 'CONTRACT_ENQUIRY_BROWSE']],
  ['/contracting/quotation/entry', 'CONTRACT_QUOTATION_ENTRY'],
  ['/contracting/quotation/browse', ['CONTRACT_QUOTATION_ENTRY', 'CONTRACT_QUOTATION_BROWSE']],
  ['/contracting/quotation/compare', 'CONTRACT_QUOTATION_COMPARE'],
  ['/engineering/dashboard', 'ENGG_PROJECT_DASHBOARD'], ['/engineering/projects', 'ENGG_PROJECT_MASTER'],
  ['/engineering/projects/add-project', 'ENGG_PROJECT_CREATE'],
  ['/engineering', 'ENGG_PROJECT_DASHBOARD'],
  ['/engineering/engineering/define-wbs', 'ENGG_DEFINE_WBS'], ['/engineering/projects/wbs-budget', 'ENGG_WBS_BUDGET'],
  ['/engineering/master/library-manager', 'ENGG_LIBRARY_MANAGER'], ['/engineering/library/task', 'ENGG_TASK_LIBRARY'],
  ['/engineering/library/material', 'ENGG_MATERIAL_LIBRARY'],
  ['/engineering/library/labour', 'ENGG_LABOUR_LIBRARY'], ['/engineering/master/unit-master', 'ENGG_UNIT_MASTER'],
  ['/engineering/library/project-category-1', 'ENGG_PROJECT_CATEGORY_1'], ['/engineering/library/project-category-2', 'ENGG_PROJECT_CATEGORY_2'],
  ['/engineering/library/company', 'ENGG_COMPANY_LIBRARY'],
  ['/engineering/library/project-status', 'ENGG_PROJECT_STATUS'],
  ['/engineering/engineering/manufacturing', 'ENGG_MANUFACTURING'],
  ['/engineering/quality-check/inspection-report', 'ENGG_QUALITY_INSPECTION'],
  ['/engineering/quality-check/checklist', 'ENGG_QUALITY_INSPECTION'],
  ['/engineering/quality-check/ncr/raise-ncr', 'ENGG_NCR_RAISE'],
  ['/engineering/quality-check/ncr-register', 'ENGG_NCR_VIEW'],
  ['/engineering/quality-check/ncr', 'ENGG_NCR_VIEW'],
  ['/engineering/billing/ra/create', 'ENGG_RA_BILLING_CREATE'],
  ['/engineering/billing/ra', 'ENGG_RA_BILLING_VIEW'],
  ['/engineering/billing/mb/create', 'ENGG_MB_CREATE'],
  ['/engineering/billing/mb', 'ENGG_MB_VIEW'],
  ['/engineering/billing/certification', 'ENGG_MB_CERTIFY'],
  ['/engineering/billing/dashboard', 'ENGG_BILLING_DASHBOARD'],
  ['/engineering/billing', 'ENGG_BILLING_DASHBOARD'],
  ['/purchase/dashboard', 'PURCHASE_DASHBOARD'], ['/purchase/pr', 'PURCHASE_PR'],
  ['/purchase/pr/create', 'PURCHASE_PR_CREATE'],
  ['/purchase', 'PURCHASE_DASHBOARD'],
  ['/purchase/vendors', 'PURCHASE_VENDOR_MASTER'], ['/purchase/brands', 'PURCHASE_BRANDS'],
  ['/purchase/enquiry/generation', 'PURCHASE_ENQUIRY_GENERATION'], ['/purchase/enquiry/browse', 'PURCHASE_ENQUIRY_BROWSE'],
  ['/purchase/quotation', 'PURCHASE_QUOTATION'], ['/purchase/po/browse', 'PURCHASE_PO_BROWSE'],
  ['/purchase/quotation/compare', 'PURCHASE_QUOTATION'], ['/purchase/quotation/entry', 'PURCHASE_QUOTATION'],
  ['/purchase/requisition/browse', 'PURCHASE_PR'],
  ['/purchase/po/print', 'PURCHASE_PO_VIEW'],
  ['/purchase/po', ['PURCHASE_PO_VIEW', 'PURCHASE_PO_EDIT', 'PURCHASE_PO_APPROVE', 'PURCHASE_PO_DELETE', 'PURCHASE_PO_CREATE']], ['/purchase/advance', 'PURCHASE_ADVANCE_MANAGE'], ['/purchase/bills', ['PURCHASE_BILLS_VIEW', 'PURCHASE_BILLS_EDIT', 'PURCHASE_BILLS_APPROVE', 'PURCHASE_BILLS_DELETE', 'PURCHASE_BILLS_CREATE']],
  ['/purchase/po/create', ['PURCHASE_PO_CREATE', 'PURCHASE_PO_EDIT']],
  ['/purchase/reports', 'PURCHASE_REPORTS'],
  ['/marketing/dashboard', 'MARKETING_DASHBOARD'], ['/marketing/analytics', 'MARKETING_ANALYTICS'],
  ['/marketing/leads', 'MARKETING_LEAD_REGISTER'], ['/marketing/clients', 'MARKETING_CUSTOMER_MASTER'],
  ['/marketing/opportunities', 'MARKETING_OPP_PIPELINE'], ['/marketing/proposals', 'MARKETING_TENDER_PROPOSAL'],
  ['/marketing/won-lost', 'MARKETING_HANDOVER'],
  ['/site/dashboard', 'SITE_DASHBOARD'], ['/site/dpr', 'SITE_DPR'], ['/site/work-completion', 'SITE_WORK_COMPLETION'],
  ['/site/material', 'SITE_MATERIAL_REQUISITION'], ['/site/material/gtn', 'SITE_GTN'], ['/site/material/grn', 'SITE_GRN'],
  ['/site/store', 'SITE_STORE'], ['/site/task-status', 'SITE_TASK_STATUS'],
  ['/site/dpr/new-dpr', 'SITE_DPR'], ['/site/dpr/', 'SITE_DPR'],
  ['/site/gtn', 'SITE_GTN'], ['/site/grn', 'SITE_GRN'], ['/site/material/new-requisition', 'SITE_MATERIAL_REQUISITION'],
  ['/marketing/enquiries/create', 'MARKETING_PROJECT_ENQUIRY_CREATE'],
  ['/marketing/enquiries/', 'MARKETING_PROJECT_ENQUIRY_EDIT'],
  ['/marketing/enquiries', 'MARKETING_PROJECT_ENQUIRIES'],
  ['/tender/dashboard', 'TENDER_DASHBOARD'],
  ['/tender/register', 'TENDER_REGISTER'],
  ['/tender/create', 'TENDER_CREATE'],
];

const TENDER_DETAIL_RIGHTS = {
  details: 'TENDER_DETAILS',
  boq: 'TENDER_BOQ',
  documents: 'TENDER_DOCUMENTS',
  bid: 'TENDER_BID',
  evaluation: 'TENDER_EVALUATION',
  submission: 'TENDER_SUBMISSION',
  result: 'TENDER_RESULT',
  approval: 'TENDER_APPROVAL',
};

export default function ProjectRoutePermissionGate({ children }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { activeEmployee, permissionsLoaded, hasRight } = usePermissions();
  useEffect(() => setMounted(true), []);
  const matchedRight = ROUTE_RIGHTS.slice().sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => path.endsWith('/') ? pathname.startsWith(path) : pathname === path || pathname.startsWith(`${path}/`))?.[1];
  const tenderDetail = pathname.match(/^\/tender\/[^/]+\/([^/]+)/)?.[1];
  const right = matchedRight || (tenderDetail ? TENDER_DETAIL_RIGHTS[tenderDetail] : null);
  const employeeSession = mounted && sessionStorage.getItem('isAdmin') !== 'true' &&
    (!!activeEmployee || !!localStorage.getItem('employeeData'));
  const hasRoutePermission = Array.isArray(right) ? right.some(hasRight) : right ? hasRight(right) : false;
  const allowed = !employeeSession || (!!activeEmployee && permissionsLoaded && hasRoutePermission);

  // Keep the server and first browser render identical; browser session storage
  // is only consulted after mount to avoid a hydration mismatch.
  if (!mounted) return <div style={{ padding: 32, color: '#64748b' }}>Preparing workspace…</div>;
  if (employeeSession && !activeEmployee) return <div style={{ padding: 32, color: '#64748b' }}>Loading employee session…</div>;
  if (employeeSession && activeEmployee && !permissionsLoaded) return <div style={{ padding: 32, color: '#64748b' }}>Loading project permissions…</div>;
  if (employeeSession && !allowed) return <div style={{ padding: 32, color: '#64748b' }}>You do not have access to this page for any assigned project.</div>;
  return children;
}
