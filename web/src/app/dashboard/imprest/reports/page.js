'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Filter, Users, Calendar, RefreshCw, TrendingUp, IndianRupee, CheckCircle, XCircle, Clock } from 'lucide-react';

const STATUS_COLORS = {
  PENDING_SUPERVISOR: { bg: '#fef9c3', color: '#854d0e', label: 'Pending Supervisor' },
  PENDING_PROJECTS_HEAD: { bg: '#fff7ed', color: '#9a3412', label: 'Pending Projects Head' },
  PENDING_ACCOUNTS: { bg: '#f0f9ff', color: '#0c4a6e', label: 'Pending Accounts' },
  PENDING_ADMIN: { bg: '#faf5ff', color: '#581c87', label: 'Pending Admin' },
  APPROVED: { bg: '#f0fdf4', color: '#14532d', label: 'Approved' },
  REJECTED: { bg: '#fff1f2', color: '#881337', label: 'Rejected' },
  RETURNED: { bg: '#fffbeb', color: '#78350f', label: 'Returned' },
  ISSUED: { bg: '#ecfdf5', color: '#065f46', label: 'Issued' },
};

export default function ImprestReportsPage() {
  const [mode, setMode] = useState('monthly'); // 'monthly' | 'employee'
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    fetch('/api/employees?fields=id,name,empId,department')
      .then(r => r.json())
      .then(d => setEmployees(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setHasFetched(true);
    try {
      const params = new URLSearchParams();
      if (mode === 'monthly') params.set('month', selectedMonth);
      if (mode === 'employee' && selectedEmployee) params.set('employeeId', selectedEmployee);

      const res = await fetch(`/api/imprest/reports?${params}`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [mode, selectedMonth, selectedEmployee]);

  // Summary stats
  const stats = {
    total: data.length,
    totalAmount: data.reduce((s, r) => s + (r.amountRequested || 0), 0),
    approvedAmount: data.filter(r => ['APPROVED', 'ISSUED'].includes(r.status)).reduce((s, r) => s + (r.approvedAmount || r.amountRequested || 0), 0),
    approved: data.filter(r => ['APPROVED', 'ISSUED'].includes(r.status)).length,
    pending: data.filter(r => r.status?.startsWith('PENDING')).length,
    rejected: data.filter(r => r.status === 'REJECTED').length,
  };

  const exportToExcel = () => {
    if (!data.length) return;

    const headers = ['Imprest ID', 'Employee Name', 'Emp Code', 'Department', 'Imprest Head', 'Amount Requested (₹)', 'Approved Amount (₹)', 'Purpose', 'Project/Site', 'Required Date', 'Status', 'Request Date'];
    const rows = data.map(r => [
      r.requestId || '',
      r.employee?.name || '',
      r.employee?.empId || '',
      r.employee?.department || '',
      r.imprestHead || '',
      r.amountRequested || 0,
      r.approvedAmount || 0,
      r.purpose || '',
      r.projectSite || '',
      r.requiredDate || '',
      (STATUS_COLORS[r.status]?.label || r.status || '').replace(/_/g, ' '),
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const reportName = mode === 'monthly'
      ? `Imprest_Report_${selectedMonth}`
      : `Imprest_Report_${employees.find(e => e.id === selectedEmployee)?.name?.replace(/\s+/g, '_') || 'Employee'}`;
    a.download = `${reportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', padding: '12px', borderRadius: '12px' }}>
            <FileText size={28} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Imprest Reports</h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px', fontWeight: 500 }}>Generate employee-wise and monthly imprest summaries</p>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Filter size={16} color="#0ea5e9" />
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Report Filters</span>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[{ id: 'monthly', label: 'Monthly Report', icon: Calendar }, { id: 'employee', label: 'Employee Report', icon: Users }].map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setHasFetched(false); setData([]); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                border: mode === m.id ? '2px solid #0ea5e9' : '2px solid #e2e8f0',
                backgroundColor: mode === m.id ? '#e0f2fe' : '#f8fafc',
                color: mode === m.id ? '#0284c7' : '#64748b',
                transition: 'all 0.15s'
              }}
            >
              <m.icon size={14} /> {m.label}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {mode === 'monthly' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Select Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#0f172a', outline: 'none' }}
              />
            </div>
          )}

          {mode === 'employee' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Select Employee</label>
              <select
                value={selectedEmployee}
                onChange={e => setSelectedEmployee(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#0f172a', backgroundColor: '#fff', outline: 'none' }}
              >
                <option value="">-- All Employees --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.empId})</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={fetchReport}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 24px', borderRadius: '8px', backgroundColor: '#0ea5e9',
              color: '#fff', border: 'none', fontWeight: 700, fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              boxShadow: '0 2px 4px rgba(14,165,233,0.3)'
            }}
          >
            {loading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Filter size={16} />}
            {loading ? 'Loading...' : 'Generate Report'}
          </button>

          {data.length > 0 && (
            <button
              onClick={exportToExcel}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 24px', borderRadius: '8px', backgroundColor: '#16a34a',
                color: '#fff', border: 'none', fontWeight: 700, fontSize: '14px',
                cursor: 'pointer', boxShadow: '0 2px 4px rgba(22,163,74,0.3)'
              }}
            >
              <Download size={16} /> Export Excel
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {hasFetched && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Requests', value: stats.total, icon: FileText, color: '#0ea5e9', bg: '#e0f2fe' },
            { label: 'Total Amount', value: `₹${stats.totalAmount.toLocaleString('en-IN')}`, icon: IndianRupee, color: '#8b5cf6', bg: '#f5f3ff' },
            { label: 'Approved Amount', value: `₹${stats.approvedAmount.toLocaleString('en-IN')}`, icon: TrendingUp, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Approved', value: stats.approved, icon: CheckCircle, color: '#16a34a', bg: '#dcfce7' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: '#f59e0b', bg: '#fef9c3' },
            { label: 'Rejected', value: stats.rejected, icon: XCircle, color: '#ef4444', bg: '#fee2e2' },
          ].map(stat => (
            <div key={stat.label} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <stat.icon size={16} color={stat.color} />
                </div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {hasFetched && !loading && (
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {data.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <FileText size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>No Records Found</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>Try changing the filters and regenerating the report.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['Imprest ID', 'Employee', 'Dept', 'Head', 'Amount (₹)', 'Approved (₹)', 'Purpose', 'Project/Site', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((r, i) => {
                    const sc = STATUS_COLORS[r.status] || { bg: '#f1f5f9', color: '#475569', label: r.status };
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#0ea5e9', whiteSpace: 'nowrap' }}>{r.requestId}</td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{r.employee?.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{r.employee?.empId}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>{r.employee?.department || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>{r.imprestHead || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>₹{(r.amountRequested || 0).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>{r.approvedAmount ? `₹${r.approvedAmount.toLocaleString('en-IN')}` : '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', maxWidth: '160px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.purpose}>{r.purpose}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>{r.projectSite || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, backgroundColor: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>
                            {sc.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!hasFetched && (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
          <FileText size={56} color="#e2e8f0" style={{ margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#64748b' }}>Select filters and click <strong>Generate Report</strong> to get started.</p>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
