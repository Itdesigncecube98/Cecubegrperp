'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import DocApprovalsPanel from '../../../components/DocApprovalsPanel';

// ---------------------------------------------------------------------------
// Name-based overrides — only needed if employee.role is not set correctly.
// 'match' is a lowercase substring of the employee name.
// ---------------------------------------------------------------------------
const ROLE_BY_NAME = [
  { match: 'kavinder', role: 'ACCOUNTS' },
  { match: 'sanjay arora', role: 'HOD' },
  { match: 'raj kumar', role: 'HOD' },
  // { match: 'hr person name', role: 'HR' },
];

// Which employee.role values map to which panel role
const ROLE_MAP = {
  HOD: 'HOD',
  HR: 'HR',
  ACCOUNTS: 'ACCOUNTS',
  SUPERVISOR: 'SUPERVISOR',
  ADMIN: 'HOD', // Admins can act as HOD
};

const SUBTITLE = {
  ACCOUNTS: 'Manage document requests pending accounts processing.',
  HR: 'HR verification queue and document history.',
  SUPERVISOR: 'Documents awaiting your approval, and HOD approvals based on org structure.',
  HOD: 'Review and approve documents as HOD — all PENDING_HOD submissions appear here.',
};

export default function DocApprovalsPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [role, setRole] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const init = async () => {
      const empData = localStorage.getItem('employeeData');
      if (!empData) { setChecked(true); return; }
      const emp = JSON.parse(empData);
      setEmployee(emp);

      const empName = (emp.name || '').toLowerCase();
      const empRole = (emp.role || '').toUpperCase();

      // 1) Name-based override (highest priority — explicit config)
      const nameHit = ROLE_BY_NAME.find(r => empName.includes(r.match));
      if (nameHit) { setRole(nameHit.role); setChecked(true); return; }

      // 2) Employee's own role field (set at login from DB)
      if (ROLE_MAP[empRole]) { setRole(ROLE_MAP[empRole]); setChecked(true); return; }

      // 3) assignedModules check — if any module gives approval rights
      const modules = Array.isArray(emp.assignedModules) ? emp.assignedModules : [];
      if (modules.some(m => String(m).toLowerCase().includes('hod'))) {
        setRole('HOD'); setChecked(true); return;
      }
      if (modules.some(m => String(m).toLowerCase().includes('hr'))) {
        setRole('HR'); setChecked(true); return;
      }
      if (modules.some(m => String(m).toLowerCase().includes('account'))) {
        setRole('ACCOUNTS'); setChecked(true); return;
      }

      // 4) DB fallback — check if this employee is a HOD for anyone via DocWorkflowMapping
      try {
        const res = await fetch(`/api/doc-workflow?hodId=${emp.id}`);
        if (res.ok) {
          const mappings = await res.json();
          if (Array.isArray(mappings) && mappings.length > 0) {
            setRole('HOD'); setChecked(true); return;
          }
        }
      } catch { /* DB offline */ }

      setChecked(true); // no role found → will show "no permission"
    };
    init();
  }, []);

  if (!checked) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
      Loading…
    </div>
  );

  if (!employee || !role) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Access Restricted</div>
        <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
          You do not have permission to access this dashboard.<br />
          This page is for HOD, HR, Accounts, and Supervisor roles.
        </div>
        <button
          onClick={() => router.back()}
          style={{ padding: '8px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <button
            onClick={() => router.back()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#64748b', fontSize: '14px', cursor: 'pointer', padding: 0, marginBottom: '12px' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
            Doc Approvals Dashboard
            <span style={{
              marginLeft: '12px', fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
              background: role === 'HOD' ? '#fce7f3' : role === 'HR' ? '#dbeafe' : role === 'ACCOUNTS' ? '#dcfce7' : '#fef9c3',
              color: role === 'HOD' ? '#9d174d' : role === 'HR' ? '#1e40af' : role === 'ACCOUNTS' ? '#166534' : '#854d0e',
            }}>
              {role}
            </span>
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{SUBTITLE[role]}</p>
        </div>
        <button
          onClick={() => router.push('/employee/dashboard/doc-generator')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={16} /> Generate Document
        </button>
      </div>
      <DocApprovalsPanel role={role} currentEmployee={employee} />
    </div>
  );
}