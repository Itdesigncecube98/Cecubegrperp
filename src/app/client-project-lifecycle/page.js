'use client';

import Link from 'next/link';
import { ArrowLeft, BriefcaseBusiness, Building2, FileCheck2, FileText, Landmark, PackageCheck, ReceiptText, SearchCheck } from 'lucide-react';

const capabilities = [
  { title: 'Client & Company', description: 'Review client, company and project master ownership before connecting records.', icon: Building2, color: '#2563eb' },
  { title: 'Project Lifecycle', description: 'Map project setup, milestones and lifecycle status to existing ERP project records.', icon: BriefcaseBusiness, color: '#0f766e' },
  { title: 'Billing & Advances', description: 'Assess billing, advances and credit note workflows alongside current accounts features.', icon: ReceiptText, color: '#7c3aed' },
  { title: 'GST Invoices & Banking', description: 'Review GST invoice generation and bank reconciliation requirements.', icon: Landmark, color: '#d97706' },
  { title: 'Procurement & Vendor Billing', description: 'Map procurement and vendor billing without duplicating existing purchase or contracting workflows.', icon: PackageCheck, color: '#0891b2' },
  { title: 'Documents & Reports', description: 'Identify required project documents, registers, reports and audit trail.', icon: FileText, color: '#db2777' },
];

const discoverySteps = [
  'Inspect the CompanyAutomation source workflows and confirm which capabilities are active and tested.',
  'Compare each workflow with current CECUBE project, accounts, purchase and contracting modules.',
  'Confirm shared client, company, vendor and project data ownership before defining any schema changes.',
  'Migrate one approved workflow at a time, then compare results with the source and retain a rollback path.',
];

const architectureLayers = [
  ['ERP UI', 'Next.js pages and reusable React components using current ERP conventions.'],
  ['API layer', 'Next.js route handlers with request validation, authentication, authorization and stable response contracts.'],
  ['Domain services', 'Domain-separated JavaScript/TypeScript modules for business rules and workflow orchestration.'],
  ['Data access', 'Prisma models/client and repository helpers, after schema ownership review.'],
  ['Background jobs', 'A reviewed worker/queue approach for OCR, large imports, exports and report generation.'],
  ['File storage', 'Approved secure storage with metadata, controlled retrieval and retention.'],
  ['Integration boundary', 'Versioned authenticated APIs with idempotency, retries and reconciliation.'],
  ['Audit & security', 'ERP role checks and audit conventions, extended only after review.'],
];

const misDecisions = [
  ['Company master', 'Prefer the approved ERP company, customer or vendor master; map identifiers and fields first.'],
  ['Project lifecycle / opportunity / amendments', 'Map to current project and engineering workflows; document gaps before adding capabilities.'],
  ['Billing / GST invoices / credit notes / advances', 'Review Accounts and billing first; do not create parallel financial ledgers.'],
  ['Bank reconciliation', 'Confirm whether an ERP workflow already owns this before migrating missing functions.'],
  ['Procurement / vendor billing', 'Map vendor identity, purchase workflow, invoice references and approval permissions.'],
  ['Project documents', 'Prefer a shared document metadata and access model.'],
  ['MIS workbooks / reports', 'Preserve approved layouts and calculations; use asynchronous generation for large reports.'],
];

const apiRules = [
  'Follow CECUBE API naming, response and error conventions after repository inspection.',
  'Validate request bodies, query parameters, file metadata and identifiers on the server.',
  'Require authentication and per-action authorization on protected endpoints.',
  'Use stable record IDs and explicit foreign-key mappings; paginate/filter large registers.',
  'Use idempotency keys for retryable create, import and synchronization operations.',
  'Return safe errors; do not expose secrets, stack traces or raw database details.',
  'Document request/response schemas and API versions for external integrations.',
];

const dataOwnership = [
  ['User / login', 'Reuse CECUBE identity; map legacy users and roles.'],
  ['Employee', 'Use the canonical ERP employee ID and reconcile source IDs.'],
  ['Company / client', 'Confirm system of record and duplicate-matching rules.'],
  ['Vendor', 'Map ERP vendor identifiers and active/inactive rules.'],
  ['Project / WBS', 'Map existing project IDs and parent-child relationships.'],
  ['Invoice / financial transaction', 'Keep ownership in existing Accounts/payroll domains; no parallel posting tables without approval.'],
  ['Tender / securities', 'Confirm domain, unique keys, lifecycle and retention.'],
  ['Document / attachment', 'Confirm storage, ownership, access, versioning and retention.'],
];

const proposedRoles = [
  ['System Administrator', 'Manage configuration and authorized access; audit controls still apply.'],
  ['MIS Operator', 'Submit/process permitted documents and view assigned registers.'],
  ['Reviewer', 'Review/correct assigned records; cannot self-approve restricted transactions.'],
  ['Approver', 'Approve/reject within assigned authority.'],
  ['HR Administrator', 'Access permitted HR appraisal and employee information.'],
  ['Accounts User', 'Access permitted billing, reconciliation and financial workflows.'],
  ['Tender User', 'Manage permitted tender and securities records.'],
  ['Auditor', 'Read-only access to authorized records and audit history.'],
];

const deliveryPhases = [
  ['0 · Read-only discovery', 'Inspect both repositories, routes, schemas, auth, jobs, databases and dependencies. Exit: signed technical baseline; no code changes.'],
  ['1 · Domain mapping', 'Compare workflows, ownership, identifiers, calculations, approvals and overlaps. Exit: approved domain/entity map, permission matrix and gap list.'],
  ['2 · Integration foundation', 'Review route/service conventions, audit, file handling, jobs and feature flags. Exit: reviewed architecture and implementation tickets.'],
  ['3 · Pilot workflow', 'Choose one bounded, low-risk gated workflow. Exit: automated tests, source/result comparison and user acceptance.'],
  ['4 · Document automation', 'Migrate intake, OCR/extraction, review and registration in controlled steps.'],
  ['5 · MIS modules', 'Integrate only missing validated workflows after overlap checks; reconcile reports.'],
  ['6 · HR and tender', 'Migrate with strict ownership/permissions; require calculation signoff and domain UAT.'],
  ['7 · Cutover', 'Backup, migration rehearsal, reconciliation, monitoring and rollback rehearsal. Exit: formal release approval.'],
];

const riskRegister = [
  ['Overlap with existing ERP modules', 'Duplicate screens, APIs or ledgers', 'Compare routes, models and domain ownership first.'],
  ['Unclear data ownership', 'Conflicting or duplicated records', 'Approve the system-of-record matrix.'],
  ['Unverified Python behavior', 'Incorrect migrated logic', 'Inspect source, fixtures and outputs; compare results.'],
  ['Financial / HR calculation drift', 'Incorrect payroll or accounting results', 'Use formula-level cases and obtain business signoff.'],
  ['Broad Prisma schema changes', 'Regression or data loss', 'Prefer reviewed additive migrations and restore-based testing.'],
  ['Long OCR/import requests', 'Timeouts and poor user experience', 'Use background jobs with progress status.'],
  ['Weak file access control', 'Sensitive document exposure', 'Use private storage and authorized download endpoints.'],
  ['Production change without rehearsal', 'Downtime or data loss', 'Rehearse in staging; verify backup and rollback.'],
];

const approvalRegister = [
  ['Current CECUBE route/folder conventions', 'Technical owner', 'Pending repository inspection'],
  ['Authentication and RBAC implementation', 'Technical owner', 'Pending repository inspection'],
  ['Source-to-ERP mapping and priorities', 'Business + technical owners', 'Pending'],
  ['System of record for employee/company/vendor/project/financial data', 'Business owners', 'Pending'],
  ['Document storage and background job approach', 'Technical owner', 'Pending design'],
  ['OCR/extraction engine and deployment boundary', 'Technical owner', 'Pending evaluation'],
  ['Role/permission matrix', 'Business + security owners', 'Pending'],
  ['Pilot workflow and acceptance cases', 'Business owner', 'Pending'],
  ['Migration/cutover and rollback plan', 'Management + technical owner', 'Pending'],
];

const discoveryChecklist = [
  'Obtain the current CECUBE ERP snapshot and confirm branch/commit.',
  'Inventory relevant employee, payroll, accounts, project, document and dashboard routes/APIs.',
  'Inspect Prisma schema, migrations and database ownership without exposing credentials.',
  'Map authentication, roles, permissions and audit helpers.',
  'Inspect CompanyAutomation modules, dependencies, database adapters and test fixtures.',
  'Build a source-to-target matrix of existing, missing, overlapping and duplicate capabilities.',
  'Identify one low-regression pilot workflow with clear acceptance data.',
  'Produce a technical design and ticket list for approval before integration code changes.',
];

const acceptanceCriteria = [
  'Each migrated workflow has a source-to-target map and named business owner.',
  'Outputs match approved reference cases; authorization covers allowed and denied actions.',
  'Sensitive actions create audit events; duplicate, retry and error scenarios are tested.',
  'Migration counts and relationships reconcile; user acceptance is recorded before production activation.',
  'Release requires code/security/database review, automated checks, backup verification, business UAT and rollback planning.',
  'Definition of done: ERP navigation/design integration, no duplicate login or unnecessary masters, server-side authorization/audit, reviewed data changes, regression pass, operational error/retry/monitoring notes, UAT signoff and approved release/rollback steps.',
];

const otherWorkstreams = [
  {
    title: 'Document Automation · CA-DOC-01–10',
    points: [
      'Authenticated intake; validate file type, size, readability and required metadata.',
      'Controlled OCR/classification, field extraction with confidence/error details and duplicate detection.',
      'Authorized review/correction, approval or rejection with reason, then register to the mapped ERP domain.',
      'Track status, errors, retries and audit events; support permitted search, filtering and export.',
      'Proposed states: Received → Validation Pending → Processing → Review Required → Approved/Rejected → Registered; Failed/Retry Pending are technical states.',
    ],
  },
  {
    title: 'HR Appraisal & Increment · CA-HR-01–07',
    points: [
      'Reuse the ERP employee identifier; document appraisal periods, reviewer assignment and approval hierarchy.',
      'Migrate appraisal forms only after permission mapping. Verify increment formulas against approved reference cases.',
      'Keep salary and arrears writes within existing payroll ownership; prevent duplicate posting.',
      'Restrict HR letters and reports by role/data scope; audit approvals, corrections and calculations.',
      'Do not change appraisal, increment, salary or arrears calculations to fit a new screen or schema.',
    ],
  },
  {
    title: 'Tender Management · CA-TND-01–06',
    points: [
      'Add tender navigation in the ERP shell and map company/client/user identities to existing masters.',
      'Support tender records, milestones and authorized status changes; model securities and related dates/amounts only after validation.',
      'Use controlled document upload/retrieval; provide reports, import validation and audit history.',
      'Confirm tender IDs, security types, amount/expiry rules, alerts and approval transitions from the source.',
    ],
  },
];

export default function ClientProjectLifecyclePage() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Link href="/portal" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#475569', textDecoration: 'none', fontWeight: 600, width: 'fit-content' }}>
        <ArrowLeft size={17} /> Back to modules
      </Link>

      <section style={{ background: 'linear-gradient(120deg, #0f766e, #115e59)', color: 'white', padding: '30px 32px', borderRadius: 18, boxShadow: '0 12px 30px rgba(15,118,110,.16)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <BriefcaseBusiness size={26} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .86 }}>MIS Production · Discovery</span>
        </div>
        <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(26px, 4vw, 38px)' }}>Client Project Lifecycle</h1>
        <p style={{ maxWidth: 900, margin: 0, fontSize: 16, lineHeight: 1.65, color: '#d1fae5' }}>
          A staged integration workspace for client and project workflows in CECUBE ERP. Existing ERP modules remain the system of record while source workflows are assessed and mapped.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 20, padding: '8px 12px', borderRadius: 999, background: 'rgba(255,255,255,.14)', fontSize: 13, fontWeight: 700 }}>
          <SearchCheck size={16} /> Current stage: Source and overlap review
        </div>
      </section>

      <section>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ margin: '0 0 5px', color: '#0f172a', fontSize: 20 }}>Capability areas</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Scope identified in the supplied CompanyAutomation integration brief.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(245px, 1fr))', gap: 14 }}>
          {capabilities.map(({ title, description, icon: Icon, color }) => (
            <article key={title} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, minHeight: 150, boxShadow: '0 2px 5px rgba(15,23,42,.03)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', color, background: `${color}14`, marginBottom: 14 }}><Icon size={21} /></div>
              <h3 style={{ margin: '0 0 7px', color: '#0f172a', fontSize: 16 }}>{title}</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.55 }}>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <article style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 18, color: '#0f172a' }}>Integration plan</h2>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 11, color: '#475569', fontSize: 14, lineHeight: 1.55 }}>
            {discoverySteps.map(step => <li key={step}>{step}</li>)}
          </ol>
        </article>
        <article style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, color: '#92400e' }}><FileCheck2 size={19} /><h2 style={{ margin: 0, fontSize: 18 }}>Rollout gate</h2></div>
          <p style={{ margin: 0, color: '#78350f', fontSize: 14, lineHeight: 1.65 }}>
            Source capabilities are not assumed to be production-ready. Business rules, outputs, data ownership, permissions and acceptance checks must be confirmed before live workflow or database changes are introduced.
          </p>
        </article>
      </section>

      <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ margin: '0 0 5px', color: '#0f172a', fontSize: 20 }}>Target architecture in CECUBE ERP</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Proposed responsibilities; final folder paths must follow the current repository and must not duplicate existing shared structures.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(225px, 1fr))', gap: 10 }}>
          {architectureLayers.map(([layer, responsibility]) => (
            <div key={layer} style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11 }}>
              <h3 style={{ margin: '0 0 5px', color: '#0f766e', fontSize: 14 }}>{layer}</h3>
              <p style={{ margin: 0, color: '#475569', fontSize: 12, lineHeight: 1.55 }}>{responsibility}</p>
            </div>
          ))}
        </div>
        <p style={{ margin: '14px 0 0', padding: 12, background: '#fefce8', borderRadius: 9, color: '#854d0e', fontSize: 13, lineHeight: 1.55 }}>
          Prisma schema/migrations require data ownership and schema review first. No direct database access from desktop/Python tools; no uncontrolled files in public paths. Production rollout requires tests, backup, review and approval.
        </p>
      </section>

      <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ margin: '0 0 5px', color: '#0f172a', fontSize: 20 }}>MIS Production overlap decisions</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Compare each capability with its current ERP owner before adding pages, tables or workflows.</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620, fontSize: 13 }}>
            <thead><tr style={{ background: '#f1f5f9', textAlign: 'left' }}><th style={{ padding: 11, color: '#334155' }}>Source capability</th><th style={{ padding: 11, color: '#334155' }}>Integration direction</th></tr></thead>
            <tbody>{misDecisions.map(([capability, direction]) => <tr key={capability} style={{ borderTop: '1px solid #e2e8f0' }}><td style={{ padding: 11, color: '#0f172a', fontWeight: 700, verticalAlign: 'top' }}>{capability}</td><td style={{ padding: 11, color: '#475569', lineHeight: 1.55 }}>{direction}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <article style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
          <h2 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: 19 }}>API and data contract rules</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8, color: '#475569', fontSize: 13, lineHeight: 1.55 }}>
            {apiRules.map(rule => <li key={rule}>{rule}</li>)}
          </ul>
        </article>
        <article style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
          <h2 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: 19 }}>Prisma & PostgreSQL safeguards</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8, color: '#475569', fontSize: 13, lineHeight: 1.55 }}>
            <li>Inspect current Prisma schema and migration history before proposing models.</li>
            <li>Do not rename, drop or repurpose existing models/columns for unrelated migration work.</li>
            <li>Prefer reviewed additive migrations; check indexes, uniqueness, foreign keys, nullability and transaction boundaries.</li>
            <li>Test migrations on a restored non-production database; keep production secrets out of source and documents.</li>
            <li>Reconcile record counts, identifiers and financial totals before cutover.</li>
          </ul>
        </article>
      </section>

      <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ margin: '0 0 5px', color: '#0f172a', fontSize: 20 }}>Data ownership matrix · pending approval</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Confirm the source of truth and mapping action for every shared entity before implementation.</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620, fontSize: 13 }}>
            <thead><tr style={{ background: '#f1f5f9', textAlign: 'left' }}><th style={{ padding: 11, color: '#334155' }}>Entity</th><th style={{ padding: 11, color: '#334155' }}>Required decision / action</th></tr></thead>
            <tbody>{dataOwnership.map(([entity, action]) => <tr key={entity} style={{ borderTop: '1px solid #e2e8f0' }}><td style={{ padding: 11, color: '#0f172a', fontWeight: 700, verticalAlign: 'top' }}>{entity}</td><td style={{ padding: 11, color: '#475569', lineHeight: 1.55 }}>{action}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <article style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
          <h2 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: 19 }}>Authentication, permissions & audit</h2>
          <p style={{ margin: '0 0 12px', color: '#475569', fontSize: 13, lineHeight: 1.6 }}>Reuse ERP authentication. Enforce action and record-level permissions in server-side APIs/services, and audit create/update/delete, file, export, submit, approval and integration actions as applicable. Do not log secrets or unnecessary personal data.</p>
          <div style={{ display: 'grid', gap: 8 }}>{proposedRoles.map(([role, scope]) => <div key={role} style={{ display: 'grid', gridTemplateColumns: 'minmax(125px, .8fr) 1.4fr', gap: 10, paddingBottom: 8, borderBottom: '1px solid #f1f5f9', fontSize: 12 }}><strong style={{ color: '#0f766e' }}>{role}</strong><span style={{ color: '#475569', lineHeight: 1.45 }}>{scope}</span></div>)}</div>
        </article>
        <article style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
          <h2 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: 19 }}>Background jobs & file handling</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8, color: '#475569', fontSize: 13, lineHeight: 1.55 }}>
            <li>OCR, bulk extraction, large imports and workbook creation should run asynchronously, not as long web requests.</li>
            <li>Use stable job IDs; track status, progress, result metadata, retry count and safe errors.</li>
            <li>Make retries idempotent; validate file content as well as extension and enforce size/type limits.</li>
            <li>Keep files outside publicly served paths unless approved protected storage is used; authorize every preview/download.</li>
            <li>Define retention, backup, restore and deletion policies.</li>
          </ul>
          <p style={{ margin: '13px 0 0', color: '#64748b', fontSize: 12, lineHeight: 1.55 }}>A restricted internal Python worker may be a temporary option if a verified library cannot be ported. CECUBE retains the ERP UI, authentication, permissions, orchestration and approved persistence.</p>
        </article>
      </section>

      <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
        <h2 style={{ margin: '0 0 14px', color: '#0f172a', fontSize: 20 }}>Migration & delivery gates</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
          {deliveryPhases.map(([phase, work]) => <article key={phase} style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11 }}><h3 style={{ margin: '0 0 6px', color: '#0f766e', fontSize: 14 }}>{phase}</h3><p style={{ margin: 0, color: '#475569', fontSize: 12, lineHeight: 1.55 }}>{work}</p></article>)}
        </div>
      </section>

      <section style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: 22 }}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ margin: '0 0 5px', color: '#1e3a8a', fontSize: 20 }}>First work package · read-only discovery</h2>
          <p style={{ margin: 0, color: '#1e40af', fontSize: 13, lineHeight: 1.55 }}>No CompanyAutomation integration edits or deployment during this package. Map the source and target first, then seek approval for code changes.</p>
        </div>
        <ol style={{ margin: 0, paddingLeft: 21, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, color: '#334155', fontSize: 13, lineHeight: 1.5 }}>
          {discoveryChecklist.map(item => <li key={item} style={{ paddingRight: 10 }}>{item}</li>)}
        </ol>
      </section>

      <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
        <h2 style={{ margin: '0 0 14px', color: '#0f172a', fontSize: 20 }}>Testing & acceptance gates</h2>
        <ul style={{ margin: 0, paddingLeft: 21, display: 'grid', gap: 9, color: '#475569', fontSize: 13, lineHeight: 1.55 }}>
          {acceptanceCriteria.map(item => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
        <h2 style={{ margin: '0 0 14px', color: '#0f172a', fontSize: 20 }}>Risk register</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700, fontSize: 12 }}>
            <thead><tr style={{ background: '#f1f5f9', textAlign: 'left' }}>{['Risk', 'Potential impact', 'Mitigation'].map(label => <th key={label} style={{ padding: 10, color: '#334155' }}>{label}</th>)}</tr></thead>
            <tbody>{riskRegister.map(([risk, impact, mitigation]) => <tr key={risk} style={{ borderTop: '1px solid #e2e8f0' }}><td style={{ padding: 10, color: '#0f172a', fontWeight: 700, verticalAlign: 'top' }}>{risk}</td><td style={{ padding: 10, color: '#475569', verticalAlign: 'top' }}>{impact}</td><td style={{ padding: 10, color: '#475569', lineHeight: 1.5 }}>{mitigation}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ margin: '0 0 5px', color: '#0f172a', fontSize: 20 }}>Open decisions · approval register</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>These decisions remain pending and are not treated as approved implementation choices.</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650, fontSize: 12 }}>
            <thead><tr style={{ background: '#f1f5f9', textAlign: 'left' }}>{['Decision', 'Owner', 'Status'].map(label => <th key={label} style={{ padding: 10, color: '#334155' }}>{label}</th>)}</tr></thead>
            <tbody>{approvalRegister.map(([decision, owner, status]) => <tr key={decision} style={{ borderTop: '1px solid #e2e8f0' }}><td style={{ padding: 10, color: '#0f172a', fontWeight: 600 }}>{decision}</td><td style={{ padding: 10, color: '#475569' }}>{owner}</td><td style={{ padding: 10, color: '#b45309', fontWeight: 700 }}>{status}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: '0 0 2px', color: '#0f172a', fontSize: 20 }}>Other CompanyAutomation workstreams</h2>
        {otherWorkstreams.map(workstream => (
          <details key={workstream.title} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '15px 18px' }}>
            <summary style={{ cursor: 'pointer', color: '#0f172a', fontWeight: 700 }}>{workstream.title}</summary>
            <ul style={{ margin: '12px 0 0', paddingLeft: 21, display: 'grid', gap: 8, color: '#475569', fontSize: 13, lineHeight: 1.55 }}>
              {workstream.points.map(point => <li key={point}>{point}</li>)}
            </ul>
          </details>
        ))}
        <article style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '15px 18px' }}>
          <h3 style={{ margin: '0 0 7px', color: '#0f172a', fontSize: 15 }}>Stage10 & Stage11</h3>
          <p style={{ margin: 0, color: '#475569', fontSize: 13, lineHeight: 1.6 }}>Treat as reference implementations, compare algorithms and outputs with Core Automation/MIS Pilot, choose the latest validated implementation for each distinct workflow, and port only unique tested logic. Document duplicate logic that is not carried forward.</p>
        </article>
      </section>
    </div>
  );
}
