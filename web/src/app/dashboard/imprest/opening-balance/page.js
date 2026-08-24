'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus, Save, Trash2, Search, CheckCircle, AlertCircle, X, RefreshCw, IndianRupee, Edit3 } from 'lucide-react';

export default function OpeningBalancePage() {
  const [employees, setEmployees] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  // Form state
  const [form, setForm] = useState({ employeeId: '', openingBalance: '', asOfDate: new Date().toISOString().split('T')[0], remarks: '' });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, balRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/imprest/opening-balance')
      ]);
      const emps = await empRes.json();
      const bals = await balRes.json();
      setEmployees(Array.isArray(emps) ? emps : []);
      setBalances(Array.isArray(bals) ? bals : []);
    } catch (e) {
      showToast('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || form.openingBalance === '') {
      showToast('error', 'Employee and opening balance are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/imprest/opening-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        showToast('success', editingId ? 'Opening balance updated!' : 'Opening balance saved!');
        setForm({ employeeId: '', openingBalance: '', asOfDate: new Date().toISOString().split('T')[0], remarks: '' });
        setEditingId(null);
        loadData();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to save');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (b) => {
    setForm({
      employeeId: b.employeeId,
      openingBalance: b.openingBalance,
      asOfDate: b.asOfDate || new Date().toISOString().split('T')[0],
      remarks: b.remarks || ''
    });
    setEditingId(b.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`/api/imprest/opening-balance?id=${deleteConfirmId}`, { method: 'DELETE' });
      if (res.ok) { showToast('success', 'Deleted successfully'); loadData(); }
      else showToast('error', 'Failed to delete');
    } catch { showToast('error', 'Network error'); }
    setDeleteConfirmId(null);
  };

  const filtered = balances.filter(b =>
    !search ||
    b.employee?.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.employee?.empId?.toLowerCase().includes(search.toLowerCase()) ||
    b.employee?.department?.toLowerCase().includes(search.toLowerCase())
  );

  const totalBalance = filtered.reduce((s, b) => s + (b.openingBalance || 0), 0);

  // Which employees don't have a balance yet
  const employeesWithBalance = new Set(balances.map(b => b.employeeId));
  const employeesForDropdown = employees;

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 18px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fff1f2',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecdd3'}`,
          color: toast.type === 'success' ? '#15803d' : '#be123c',
          minWidth: '300px'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span style={{ flex: 1, fontWeight: 600, fontSize: '14px' }}>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}><X size={16} /></button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '12px', borderRadius: '12px' }}>
          <Wallet size={28} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Imprest Opening Balance</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px', fontWeight: 500 }}>Set or update the imprest opening balance for each employee</p>
        </div>
      </div>

      {/* Form Card */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {editingId ? <><Edit3 size={16} color="#f59e0b" /> Edit Opening Balance</> : <><Plus size={16} color="#f59e0b" /> Add / Update Opening Balance</>}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Employee *</label>
              <select
                value={form.employeeId}
                onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                required
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', backgroundColor: '#fff', color: '#0f172a' }}
              >
                <option value="">Select Employee</option>
                {employeesForDropdown.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.empId}) {employeesWithBalance.has(emp.id) ? '✓' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Opening Balance (₹) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.openingBalance}
                onChange={e => setForm(f => ({ ...f, openingBalance: e.target.value }))}
                required
                placeholder="e.g. 5000"
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>As of Date *</label>
              <input
                type="date"
                value={form.asOfDate}
                onChange={e => setForm(f => ({ ...f, asOfDate: e.target.value }))}
                required
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Remarks</label>
              <input
                type="text"
                value={form.remarks}
                onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                placeholder="Optional note"
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}
              />
            </div>

          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 24px', borderRadius: '8px',
                backgroundColor: '#f59e0b', color: '#fff', border: 'none',
                fontWeight: 700, fontSize: '14px', cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1, boxShadow: '0 2px 4px rgba(245,158,11,0.3)'
              }}
            >
              <Save size={16} /> {submitting ? 'Saving...' : (editingId ? 'Update Balance' : 'Save Balance')}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setForm({ employeeId: '', openingBalance: '', asOfDate: new Date().toISOString().split('T')[0], remarks: '' }); }}
                style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Summary + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '12px 20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IndianRupee size={18} color="#f59e0b" />
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Opening Balance</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>₹{totalBalance.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '12px 20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wallet size={18} color="#0ea5e9" />
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Employees</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{filtered.length}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '34px', padding: '9px 12px 9px 34px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', width: '220px' }}
            />
          </div>
          <button onClick={loadData} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontWeight: 600, fontSize: '13px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            <Wallet size={48} color="#e2e8f0" style={{ display: 'block', margin: '0 auto 1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>No Opening Balances Set</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>Use the form above to add opening balances for employees.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Employee', 'Emp Code', 'Department', 'Opening Balance (₹)', 'As of Date', 'Remarks', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{b.employee?.name || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0ea5e9', fontFamily: 'monospace', fontWeight: 700 }}>{b.employee?.empId || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>{b.employee?.department || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '15px', fontWeight: 800, color: '#f59e0b' }}>
                      ₹{(b.openingBalance || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>{b.asOfDate || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', maxWidth: '180px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.remarks}>{b.remarks || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(b)}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f0f9ff', color: '#0284c7', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                        <button onClick={() => triggerDelete(b.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #fee2e2', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {deleteConfirmId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#ef4444' }}>
              <div style={{ backgroundColor: '#fef2f2', padding: '10px', borderRadius: '50%' }}>
                <AlertCircle size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Delete Opening Balance</h3>
            </div>
            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              Are you sure you want to delete this opening balance? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>
                Cancel
              </button>
              <button onClick={handleDelete} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: 'white', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
                <Trash2 size={16} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
