'use client';
import { useState, useEffect, useCallback } from 'react';
import '../purchase.css';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const fmt = (v) => INR.format(v || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_MAP = {
  ACTIVE:           { bg: '#fef3c7', text: '#b45309', label: 'Active' },
  FULLY_RECOVERED:  { bg: '#d1fae5', text: '#047857', label: 'Fully Recovered' },
  CANCELLED:        { bg: '#fee2e2', text: '#b91c1c', label: 'Cancelled' },
};

const PO_STATUS_MAP = {
  DRAFT:             'Draft',
  PENDING_APPROVAL:  'Pending Approval',
  APPROVED:          'Approved',
  SENT:              'Sent',
  PARTIALLY_RECEIVED:'Partially Received',
  FULLY_RECEIVED:    'Fully Received',
  CLOSED:            'Closed',
  CANCELLED:         'Cancelled',
};

const emptyForm = () => ({
  poId: '', poNo: '', poStatus: '',
  projectName: '', supplierName: '',
  advanceAmount: '', remarks: '',
  advDate: new Date().toISOString().split('T')[0],
});

/* ── component ────────────────────────────────────────────────────────────── */
export default function PurchaseAdvancePage() {
  const [advances, setAdvances]   = useState([]);
  const [pos, setPos]             = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'browse'
  const [form, setForm]           = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg]     = useState('');
  const [editId, setEditId]         = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [updateForm, setUpdateForm] = useState({ id: '', recoveredAmount: '', cancelledAmount: '', remarks: '' });
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [advRes, poRes] = await Promise.all([
        fetch('/api/advance-payments?referenceType=PO'),
        fetch('/api/purchase/po?status=APPROVED'),
      ]);
      const [advData, poData] = await Promise.all([advRes.json(), poRes.json()]);
      setAdvances(Array.isArray(advData) ? advData : []);
      setPos(Array.isArray(poData) ? poData : []);
    } catch { setAdvances([]); setPos([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── PO selection handler ──────────────────────────────────────────────────
  const handlePoSelect = (poId) => {
    const po = pos.find(p => p.id === poId);
    if (!po) { setForm(f => ({ ...f, poId: '', poNo: '', poStatus: '', projectName: '', supplierName: '' })); return; }
    setForm(f => ({
      ...f,
      poId:        po.id,
      poNo:        po.poNumber,
      poStatus:    po.status,
      projectName: po.projectName || '',
      supplierName: po.supplierName || '',
    }));
  };

  // ── submit new advance ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setSuccessMsg(''); setErrorMsg('');
    try {
      const body = { referenceType: 'PO', ...form, advanceAmount: parseFloat(form.advanceAmount) };
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

  // ── update (recover/cancel) ───────────────────────────────────────────────
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
    const matchSearch = !q || a.advNo?.toLowerCase().includes(q) || a.poNo?.toLowerCase().includes(q)
      || a.supplierName?.toLowerCase().includes(q) || a.projectName?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'All' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="pur-page-container">
      {/* HEADER */}
      <div className="pur-header">
        <div>
          <h1 className="pur-title">Purchase Advance Payments</h1>
          <p className="pur-subtitle">Track advance payments made to vendors against Purchase Orders</p>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['create', 'browse'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
              border: activeTab === tab ? 'none' : '1px solid #e2e8f0',
              background: activeTab === tab ? '#f59e0b' : '#fff',
              color: activeTab === tab ? '#fff' : '#334155',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'create' ? '+ New Advance' : '📋 Browse Advances'}
          </button>
        ))}
      </div>

      {/* ── CREATE FORM ───────────────────────────────────────────────────── */}
      {activeTab === 'create' && (
        <div className="pur-card" style={{ maxWidth: '760px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            Create PO Advance Payment
          </h2>

          {successMsg && <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', color: '#065f46', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>✓ {successMsg}</div>}
          {errorMsg   && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>✗ {errorMsg}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Advance No - auto */}
              <div>
                <label className="pur-label">Advance No.</label>
                <input className="pur-input" value="Auto-generated (ADV-YYYY-NNNN)" disabled style={{ background: '#f8fafc', color: '#94a3b8', fontStyle: 'italic' }} />
              </div>

              {/* Date */}
              <div>
                <label className="pur-label">Advance Date *</label>
                <input type="date" className="pur-input" value={form.advDate} onChange={e => setForm(f => ({ ...f, advDate: e.target.value }))} required />
              </div>

              {/* PO Select */}
              <div style={{ gridColumn: 'span 2' }}>
                <label className="pur-label">Purchase Order (PO) *</label>
                <select
                  className="pur-select"
                  style={{ width: '100%', padding: '9px 12px' }}
                  value={form.poId}
                  onChange={e => handlePoSelect(e.target.value)}
                  required
                >
                  <option value="">— Select Approved PO —</option>
                  {pos.map(po => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} | {po.supplierName} | {po.projectName || 'No Project'} | {fmt(po.totalAmount)}
                    </option>
                  ))}
                </select>
              </div>

              {/* PO No (readonly) */}
              <div>
                <label className="pur-label">PO Number</label>
                <input className="pur-input" value={form.poNo} disabled style={{ background: '#f8fafc' }} />
              </div>

              {/* PO Status (readonly) */}
              <div>
                <label className="pur-label">PO Status</label>
                <input className="pur-input" value={PO_STATUS_MAP[form.poStatus] || form.poStatus} disabled style={{ background: '#f8fafc' }} />
              </div>

              {/* Project Name (readonly) */}
              <div>
                <label className="pur-label">Project Name</label>
                <input className="pur-input" value={form.projectName} disabled style={{ background: '#f8fafc' }} />
              </div>

              {/* Supplier (readonly) */}
              <div>
                <label className="pur-label">Supplier / Vendor</label>
                <input className="pur-input" value={form.supplierName} disabled style={{ background: '#f8fafc' }} />
              </div>

              {/* Advance Amount */}
              <div>
                <label className="pur-label">Advance Amount (₹) *</label>
                <input
                  type="number" min="1" step="0.01" className="pur-input"
                  placeholder="Enter advance amount"
                  value={form.advanceAmount}
                  onChange={e => setForm(f => ({ ...f, advanceAmount: e.target.value }))}
                  required
                />
              </div>

              {/* Remarks */}
              <div style={{ gridColumn: 'span 2' }}>
                <label className="pur-label">Remarks</label>
                <textarea
                  className="pur-input" rows={2} placeholder="Optional remarks..."
                  value={form.remarks}
                  onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <button type="submit" disabled={submitting} className="pur-btn pur-btn-primary" style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}>
                {submitting ? 'Creating...' : '💾 Create Advance'}
              </button>
              <button type="button" className="pur-btn pur-btn-outline" onClick={() => setForm(emptyForm())}>
                Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── BROWSE TABLE ──────────────────────────────────────────────────── */}
      {activeTab === 'browse' && (
        <div className="pur-card">
          {/* Toolbar */}
          <div className="pur-toolbar" style={{ marginBottom: '16px' }}>
            <div className="pur-search">
              <input
                type="text" className="pur-search-input"
                placeholder="Search by Adv No, PO No, Supplier, Project..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select className="pur-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '6px 12px', width: 'auto' }}>
              <option value="All">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="FULLY_RECOVERED">Fully Recovered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button className="pur-btn pur-btn-outline" onClick={loadData} style={{ whiteSpace: 'nowrap' }}>🔄 Refresh</button>
          </div>

          <div className="pur-table-wrapper">
            {loading ? (
              <div className="pur-loading"><div className="pur-spinner"></div></div>
            ) : (
              <table className="pur-table">
                <thead>
                  <tr>
                    <th>Adv No / Date</th>
                    <th>PO No / Status</th>
                    <th>Project</th>
                    <th>Supplier</th>
                    <th style={{ textAlign: 'right' }}>Adv Amount</th>
                    <th style={{ textAlign: 'right' }}>Recovered</th>
                    <th style={{ textAlign: 'right' }}>Cancelled</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(adv => {
                    const st = STATUS_MAP[adv.status] || STATUS_MAP.ACTIVE;
                    return (
                      <tr key={adv.id}>
                        <td>
                          <div className="pur-font-semibold" style={{ color: '#0f172a' }}>{adv.advNo}</div>
                          <div className="pur-text-xs pur-text-muted">{fmtDate(adv.advDate)}</div>
                        </td>
                        <td>
                          <div className="pur-font-medium">{adv.poNo || '—'}</div>
                          <div className="pur-text-xs pur-text-muted">{PO_STATUS_MAP[adv.poStatus] || adv.poStatus || '—'}</div>
                        </td>
                        <td>{adv.projectName || '—'}</td>
                        <td>{adv.supplierName || '—'}</td>
                        <td style={{ textAlign: 'right' }} className="pur-font-semibold">{fmt(adv.advanceAmount)}</td>
                        <td style={{ textAlign: 'right', color: '#047857' }}>{fmt(adv.recoveredAmount)}</td>
                        <td style={{ textAlign: 'right', color: '#b91c1c' }}>{fmt(adv.cancelledAmount)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: adv.balanceAmount > 0 ? '#b45309' : '#047857' }}>{fmt(adv.balanceAmount)}</td>
                        <td>
                          <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: st.bg, color: st.text }}>
                            {st.label}
                          </span>
                        </td>
                        <td>
                          {adv.status === 'ACTIVE' && (
                            <button
                              className="pur-btn pur-btn-outline"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
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
                      <td colSpan={10} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>
                        No advance payments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── UPDATE MODAL ──────────────────────────────────────────────────── */}
      {showUpdateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>Update Advance Recovery</h3>
            <form onSubmit={handleUpdate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="pur-label">Recovered Amount (₹)</label>
                  <input
                    type="number" min="0" step="0.01" className="pur-input"
                    value={updateForm.recoveredAmount}
                    onChange={e => setUpdateForm(f => ({ ...f, recoveredAmount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="pur-label">Cancelled Amount (₹) <span style={{ fontSize: '12px', color: '#94a3b8' }}>(optional)</span></label>
                  <input
                    type="number" min="0" step="0.01" className="pur-input"
                    value={updateForm.cancelledAmount}
                    onChange={e => setUpdateForm(f => ({ ...f, cancelledAmount: e.target.value }))}
                  />
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Cancelled amount will be subtracted from balance & deducted during bill generation.</p>
                </div>
                <div>
                  <label className="pur-label">Remarks</label>
                  <textarea
                    className="pur-input" rows={2}
                    value={updateForm.remarks}
                    onChange={e => setUpdateForm(f => ({ ...f, remarks: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="pur-btn pur-btn-primary" style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}>
                  💾 Save
                </button>
                <button type="button" className="pur-btn pur-btn-outline" onClick={() => setShowUpdateModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
