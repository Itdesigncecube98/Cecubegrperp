'use client';
import { useState, useEffect, useCallback } from 'react';
import '../contracting.css';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const fmt = (v) => INR.format(v || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_MAP = {
  ACTIVE:           { bg: '#fef3c7', text: '#b45309', label: 'Active' },
  FULLY_RECOVERED:  { bg: '#d1fae5', text: '#047857', label: 'Fully Recovered' },
  CANCELLED:        { bg: '#fee2e2', text: '#b91c1c', label: 'Cancelled' },
};

const WO_STATUS_OPTIONS = ['Draft', 'Active', 'Closed', 'Cancelled'];

const emptyForm = () => ({
  woId: '', woNo: '', woStatus: '',
  projectName: '', supplierName: '',
  advanceAmount: '', remarks: '',
  advDate: new Date().toISOString().split('T')[0],
});

const s = {
  page:       { padding: '24px', fontFamily: 'inherit' },
  h1:         { fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 },
  subtitle:   { fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: '20px' },
  card:       { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  label:      { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' },
  input:      { width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#0f172a', outline: 'none', boxSizing: 'border-box' },
  select:     { width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', background: '#fff' },
  btn:        { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: 'none' },
  btnPrimary: { background: '#0d9488', color: '#fff' },
  btnOutline: { background: '#fff', color: '#374151', border: '1px solid #cbd5e1' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th:         { padding: '10px 14px', textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569', fontSize: '13px' },
  td:         { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
};

export default function ContractingAdvancePage() {
  const [advances, setAdvances]   = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('create');
  const [form, setForm]           = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg]     = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [updateForm, setUpdateForm] = useState({ id: '', recoveredAmount: '', cancelledAmount: '', remarks: '' });
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [advRes, woRes] = await Promise.all([
        fetch('/api/advance-payments?referenceType=WO'),
        fetch('/api/contracting/work-orders'),
      ]);
      const [advData, woData] = await Promise.all([advRes.json(), woRes.json()]);
      setAdvances(Array.isArray(advData) ? advData : []);
      setWorkOrders(Array.isArray(woData) ? woData : []);
    } catch { setAdvances([]); setWorkOrders([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── WO selection handler ──────────────────────────────────────────────────
  const handleWoSelect = (woId) => {
    const wo = workOrders.find(w => w.id === woId);
    if (!wo) { setForm(f => ({ ...f, woId: '', woNo: '', woStatus: '', projectName: '', supplierName: '' })); return; }
    setForm(f => ({
      ...f,
      woId:        wo.id,
      woNo:        wo.woNo,
      woStatus:    wo.status,
      projectName: wo.project?.name || '',
      supplierName: wo.contractorName || '',
    }));
  };

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setSuccessMsg(''); setErrorMsg('');
    try {
      const body = { referenceType: 'WO', ...form, advanceAmount: parseFloat(form.advanceAmount) };
      const res = await fetch('/api/advance-payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create advance');
      setSuccessMsg(`Advance created: ${data.advNo}`);
      setForm(emptyForm());
      loadData();
      setActiveTab('browse');
    } catch (err) { setErrorMsg(err.message); }
    finally { setSubmitting(false); }
  };

  // ── update ────────────────────────────────────────────────────────────────
  const openUpdate = (adv) => {
    setUpdateForm({ id: adv.id, recoveredAmount: adv.recoveredAmount, cancelledAmount: adv.cancelledAmount, remarks: adv.remarks || '' });
    setShowUpdateModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/advance-payments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setAdvances(prev => prev.map(a => a.id === data.id ? data : a));
      setShowUpdateModal(false);
    } catch (err) { alert(err.message); }
  };

  // ── filter ────────────────────────────────────────────────────────────────
  const filtered = advances.filter(a => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || a.advNo?.toLowerCase().includes(q) || a.woNo?.toLowerCase().includes(q)
      || a.supplierName?.toLowerCase().includes(q) || a.projectName?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'All' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div>
          <h1 style={s.h1}>RA Bill Advance Payments</h1>
          <p style={s.subtitle}>Track advance payments made to contractors against Work Orders</p>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { key: 'create', label: '+ New Advance' },
          { key: 'browse', label: '📋 Browse Advances' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...s.btn,
              ...(activeTab === tab.key ? { background: '#0d9488', color: '#fff', border: 'none' } : { ...s.btnOutline }),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CREATE FORM ───────────────────────────────────────────────────── */}
      {activeTab === 'create' && (
        <div style={{ ...s.card, maxWidth: '760px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            Create Work Order Advance Payment
          </h2>

          {successMsg && <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>✓ {successMsg}</div>}
          {errorMsg   && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>✗ {errorMsg}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Advance No - auto */}
              <div>
                <label style={s.label}>Advance No.</label>
                <input style={{ ...s.input, background: '#f8fafc', color: '#94a3b8', fontStyle: 'italic' }} value="Auto-generated (ADV-YYYY-NNNN)" disabled />
              </div>

              {/* Date */}
              <div>
                <label style={s.label}>Advance Date *</label>
                <input type="date" style={s.input} value={form.advDate} onChange={e => setForm(f => ({ ...f, advDate: e.target.value }))} required />
              </div>

              {/* WO Select */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={s.label}>Work Order *</label>
                <select
                  style={s.select}
                  value={form.woId}
                  onChange={e => handleWoSelect(e.target.value)}
                  required
                >
                  <option value="">— Select Work Order —</option>
                  {workOrders.map(wo => (
                    <option key={wo.id} value={wo.id}>
                      {wo.woNo} | {wo.contractorName} | {wo.project?.name || 'No Project'} | {wo.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* WO No (readonly) */}
              <div>
                <label style={s.label}>Work Order No.</label>
                <input style={{ ...s.input, background: '#f8fafc' }} value={form.woNo} disabled />
              </div>

              {/* WO Status (readonly) */}
              <div>
                <label style={s.label}>Work Order Status</label>
                <input style={{ ...s.input, background: '#f8fafc' }} value={form.woStatus} disabled />
              </div>

              {/* Project (readonly) */}
              <div>
                <label style={s.label}>Project Name</label>
                <input style={{ ...s.input, background: '#f8fafc' }} value={form.projectName} disabled />
              </div>

              {/* Contractor (readonly) */}
              <div>
                <label style={s.label}>Contractor</label>
                <input style={{ ...s.input, background: '#f8fafc' }} value={form.supplierName} disabled />
              </div>

              {/* Advance Amount */}
              <div>
                <label style={s.label}>Advance Amount (₹) *</label>
                <input
                  type="number" min="1" step="0.01" style={s.input}
                  placeholder="Enter advance amount"
                  value={form.advanceAmount}
                  onChange={e => setForm(f => ({ ...f, advanceAmount: e.target.value }))}
                  required
                />
              </div>

              {/* Remarks */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={s.label}>Remarks</label>
                <textarea
                  style={{ ...s.input, resize: 'vertical' }} rows={2}
                  placeholder="Optional remarks..."
                  value={form.remarks}
                  onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <button type="submit" disabled={submitting} style={{ ...s.btn, ...s.btnPrimary }}>
                {submitting ? 'Creating...' : '💾 Create Advance'}
              </button>
              <button type="button" style={{ ...s.btn, ...s.btnOutline }} onClick={() => setForm(emptyForm())}>
                Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── BROWSE TABLE ──────────────────────────────────────────────────── */}
      {activeTab === 'browse' && (
        <div style={s.card}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              type="text" style={{ ...s.input, maxWidth: '320px' }}
              placeholder="Search Adv No, WO No, Contractor, Project..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
            <select style={{ ...s.select, maxWidth: '180px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="FULLY_RECOVERED">Fully Recovered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button style={{ ...s.btn, ...s.btnOutline }} onClick={loadData}>🔄 Refresh</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Adv No / Date', 'WO No / Status', 'Project', 'Contractor', 'Adv Amount', 'Recovered', 'Cancelled', 'Balance', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ ...s.th, textAlign: h.includes('Amount') || h === 'Recovered' || h === 'Cancelled' || h === 'Balance' ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(adv => {
                    const st = STATUS_MAP[adv.status] || STATUS_MAP.ACTIVE;
                    return (
                      <tr key={adv.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={s.td}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{adv.advNo}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{fmtDate(adv.advDate)}</div>
                        </td>
                        <td style={s.td}>
                          <div style={{ fontWeight: 500 }}>{adv.woNo || '—'}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{adv.woStatus || '—'}</div>
                        </td>
                        <td style={s.td}>{adv.projectName || '—'}</td>
                        <td style={s.td}>{adv.supplierName || '—'}</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>{fmt(adv.advanceAmount)}</td>
                        <td style={{ ...s.td, textAlign: 'right', color: '#047857' }}>{fmt(adv.recoveredAmount)}</td>
                        <td style={{ ...s.td, textAlign: 'right', color: '#b91c1c' }}>{fmt(adv.cancelledAmount)}</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: adv.balanceAmount > 0 ? '#b45309' : '#047857' }}>
                          {fmt(adv.balanceAmount)}
                        </td>
                        <td style={s.td}>
                          <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: st.bg, color: st.text }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={s.td}>
                          {adv.status === 'ACTIVE' && (
                            <button
                              style={{ ...s.btn, padding: '4px 10px', fontSize: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#374151' }}
                              onClick={() => openUpdate(adv)}
                            >
                              Update
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ ...s.td, textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                        No advance payments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── UPDATE MODAL ──────────────────────────────────────────────────── */}
      {showUpdateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>
              Update Advance Recovery
            </h3>
            <form onSubmit={handleUpdate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={s.label}>Recovered Amount (₹)</label>
                  <input type="number" min="0" step="0.01" style={s.input} value={updateForm.recoveredAmount} onChange={e => setUpdateForm(f => ({ ...f, recoveredAmount: e.target.value }))} />
                </div>
                <div>
                  <label style={s.label}>Cancelled Amount (₹) <span style={{ fontSize: '12px', color: '#94a3b8' }}>(optional)</span></label>
                  <input type="number" min="0" step="0.01" style={s.input} value={updateForm.cancelledAmount} onChange={e => setUpdateForm(f => ({ ...f, cancelledAmount: e.target.value }))} />
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Cancelled amount will be subtracted from balance and deducted during RA Bill generation.
                  </p>
                </div>
                <div>
                  <label style={s.label}>Remarks</label>
                  <textarea style={{ ...s.input, resize: 'vertical' }} rows={2} value={updateForm.remarks} onChange={e => setUpdateForm(f => ({ ...f, remarks: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" style={{ ...s.btn, ...s.btnPrimary }}>💾 Save</button>
                <button type="button" style={{ ...s.btn, ...s.btnOutline }} onClick={() => setShowUpdateModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
