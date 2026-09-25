'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Edit2, Trash2, ChevronRight, User,
  Phone, Mail, Briefcase, Filter, Download, MoreVertical,
  CheckCircle, XCircle, Clock, AlertCircle
} from 'lucide-react';

// Mock employee data — replace with real API calls
const MOCK_EMPLOYEES = [];

const STATUS_STYLES = {
  'Working':        { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
  'Apprenticeship': { bg: '#e0f2fe', color: '#0369a1', dot: '#0ea5e9' },
  'On Leave':       { bg: '#fef3c7', color: '#b45309', dot: '#f59e0b' },
  'Resigned':       { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  'Retired':        { bg: '#f3e8ff', color: '#7e22ce', dot: '#a855f7' },
  'Terminated':     { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
  'Transfer':       { bg: '#fff7ed', color: '#c2410c', dot: '#f97316' },
};

export default function EmployeesListPage({ module, basePath, headerGrad, accentColor, accentLight }) {
  const router = useRouter();
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');

  const filtered = employees.filter(emp => {
    const matchSearch = !search ||
      emp.name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.empId?.toLowerCase().includes(search.toLowerCase()) ||
      emp.department?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || emp.status === statusFilter;
    const matchDept   = deptFilter   === 'All' || emp.department === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const departments = ['All', ...new Set(employees.map(e => e.department).filter(Boolean))];

  return (
    <div style={{ padding: '24px', background: '#f0f9ff', minHeight: '100vh' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 5, height: 24, borderRadius: 3, background: headerGrad }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Employees</h1>
          </div>
          <p style={{ color: '#6b7280', fontSize: 13, fontWeight: 500, margin: 0, marginLeft: 13 }}>
            Manage all employees for {module}
          </p>
        </div>
        <button
          onClick={() => router.push(`${basePath}/employees/master`)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: accentColor, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14, boxShadow: `0 4px 12px ${accentColor}44`, transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${accentColor}55`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = `0 4px 12px ${accentColor}44`; }}
        >
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {/* Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total',      value: employees.length,                                     color: accentColor,  bg: accentLight },
          { label: 'Working',    value: employees.filter(e => e.status === 'Working').length,   color: '#059669',    bg: '#d1fae5'  },
          { label: 'On Leave',   value: employees.filter(e => e.status === 'On Leave').length,  color: '#d97706',    bg: '#fef3c7'  },
          { label: 'Resigned',   value: employees.filter(e => e.status === 'Resigned').length,  color: '#dc2626',    bg: '#fee2e2'  },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg, borderRadius: 12, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            placeholder="Search by name, ID or department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 38, paddingRight: 14, paddingTop: 9, paddingBottom: 9, border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = accentColor}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#374151', fontWeight: 500 }}
        >
          {['All','Working','Apprenticeship','On Leave','Resigned','Retired','Terminated','Transfer'].map(s => <option key={s}>{s}</option>)}
        </select>
        {/* Dept filter */}
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          style={{ padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#374151', fontWeight: 500 }}
        >
          {departments.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          /* Empty State */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <User size={36} color={accentColor} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>No Employees Yet</h3>
            <p style={{ fontSize: 14, color: '#6b7280', fontWeight: 500, margin: '0 0 24px', maxWidth: 340 }}>
              {search || statusFilter !== 'All' || deptFilter !== 'All'
                ? 'No employees match your current filters. Try adjusting them.'
                : 'Start building your team by adding your first employee.'}
            </p>
            {!search && statusFilter === 'All' && deptFilter === 'All' && (
              <button
                onClick={() => router.push(`${basePath}/employees/master`)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: accentColor, color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14, boxShadow: `0 4px 12px ${accentColor}44` }}
              >
                <Plus size={16} /> Add First Employee
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['#', 'Employee', 'Emp ID', 'Department', 'Phone', 'Email', 'Status', 'Joining Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, idx) => {
                  const st = STATUS_STYLES[emp.status] || STATUS_STYLES['Working'];
                  return (
                    <tr key={emp.id}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => router.push(`${basePath}/employees/${emp.id}`)}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 700, color: accentColor }}>
                            {emp.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{emp.name}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{emp.designation || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: accentColor }}>{emp.empId || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{emp.department || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{emp.phone || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{emp.email || '—'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: st.bg, color: st.color, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                          {emp.status || 'Working'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{emp.joiningDate || '—'}</td>
                      <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => router.push(`${basePath}/employees/${emp.id}`)}
                            style={{ width: 32, height: 32, border: `1.5px solid ${accentLight}`, background: accentLight, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: accentColor, transition: 'all 0.2s' }}
                            title="Edit"
                            onMouseEnter={e => e.currentTarget.style.background = accentColor}
                            onMouseLeave={e => e.currentTarget.style.background = accentLight}
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
              Showing {filtered.length} of {employees.length} employees
            </span>
          </div>
        )}
      </div>

    </div>
  );
}
