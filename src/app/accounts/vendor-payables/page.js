'use client';
import { useState, useEffect } from 'react';
import AccountsSidebar from '@/components/AccountsSidebar';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import '../accounts.css';

const STATUS_TABS = [
  { key: 'PENDING_APPROVAL', label: 'Pending Approval', badgeClass: 'acc-badge-amber' },
  { key: 'APPROVED',         label: 'Approved',         badgeClass: 'acc-badge-emerald' },
  { key: 'SENT',             label: 'Sent',             badgeClass: 'acc-badge-blue' },
  { key: 'PARTIALLY_RECEIVED', label: 'Partially Received', badgeClass: 'acc-badge-purple' },
  { key: 'FULLY_RECEIVED',   label: 'Fully Received',   badgeClass: 'acc-badge-indigo' },
  { key: 'CANCELLED',        label: 'Cancelled',        badgeClass: 'acc-badge-red' },
];

const STATUS_BADGE = {
  DRAFT:              'acc-badge-slate',
  PENDING_APPROVAL:   'acc-badge-amber',
  APPROVED:           'acc-badge-emerald',
  SENT:               'acc-badge-blue',
  PARTIALLY_RECEIVED: 'acc-badge-purple',
  FULLY_RECEIVED:     'acc-badge-indigo',
  CLOSED:             'acc-badge-slate',
  CANCELLED:          'acc-badge-red',
  REJECTED:           'acc-badge-red',
};

export default function VendorPayablesPage() {
  const [payables, setPayables]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('PENDING_APPROVAL');
  const [counts, setCounts]         = useState({});
  const [expandedId, setExpandedId] = useState(null);

  // Approve/Reject modal
  const [selectedPO, setSelectedPO]   = useState(null);
  const [modalAction, setModalAction] = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [remarks, setRemarks]         = useState('');
  const [processing, setProcessing]   = useState(false);

  // Bill generation modal
  const [showBillModal, setShowBillModal]     = useState(false);
  const [billPO, setBillPO]                   = useState(null);
  const [billForm, setBillForm]               = useState({ billDate: '', tdsAmount: '0', remarks: '' });
  const [billProcessing, setBillProcessing]   = useState(false);
  const [billSuccess, setBillSuccess]         = useState('');

  useEffect(() => { fetchPayables(); }, [filter]);
  useEffect(() => { fetchCounts(); }, []);

  const fetchCounts = async () => {
    try {
      const tabs = STATUS_TABS.map(t => t.key);
      const results = await Promise.all(tabs.map(s => fetch(`/api/accounts/vendor-payables?status=${s}`).then(r => r.json())));
      const c = {};
      tabs.forEach((s, i) => { c[s] = Array.isArray(results[i]) ? results[i].length : 0; });
      setCounts(c);
    } catch {}
  };

  const fetchPayables = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/accounts/vendor-payables?status=${filter}`);
      const data = await res.json();
      setPayables(Array.isArray(data) ? data : []);
    } catch { setPayables([]); }
    finally { setLoading(false); }
  };

  const handleAction = (po, action) => {
    setSelectedPO(po); setModalAction(action); setRemarks(''); setShowModal(true);
  };

  const submitAction = async () => {
    if (!selectedPO) return;
    try {
      setProcessing(true);
      const res = await fetch('/api/accounts/vendor-payables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poId: selectedPO.id, action: modalAction, remarks, approvedById: 'ACCOUNTS_USER' })
      });
      if (res.ok) { setShowModal(false); fetchPayables(); fetchCounts(); }
      else { const e = await res.json(); alert(`Error: ${e.error}`); }
    } catch { alert('Failed to process action'); }
    finally { setProcessing(false); }
  };

  const handleGenerateBill = (po) => {
    setBillPO(po);
    setBillForm({ billDate: new Date().toISOString().split('T')[0], tdsAmount: '0', remarks: '' });
    setBillSuccess('');
    setShowBillModal(true);
  };

  const submitBill = async () => {
    if (!billPO) return;
    try {
      setBillProcessing(true);
      const gross = billPO.totalAmount || 0;
      const tds = parseFloat(billForm.tdsAmount) || 0;
      const res = await fetch('/api/accounts/purchase-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poNo: billPO.poNumber,
          vendorId: billPO.supplierId || billPO.id,
          companyId: billPO.companyId || 'DEFAULT',
          billDate: billForm.billDate,
          grossAmount: gross,
          tdsAmount: tds,
          remarks: billForm.remarks || `Bill for PO ${billPO.poNumber}`
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBillSuccess(`Bill ${data.billNo} created successfully!`);
        setShowBillModal(false);
        fetchPayables(); fetchCounts();
      } else {
        const e = await res.json(); alert(`Error: ${e.error}`);
      }
    } catch { alert('Failed to generate bill'); }
    finally { setBillProcessing(false); }
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const totalValue = payables.reduce((s, p) => s + (p.totalAmount || 0), 0);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <AccountsSidebar />

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div className="acc-page-container">

          {/* Header */}
          <div className="acc-header">
            <div>
              <h1 className="acc-title">Vendor Payables</h1>
              <p className="acc-subtitle">Review and approve purchase orders for payment</p>
            </div>
            <button className="acc-btn acc-btn-outline" onClick={() => { fetchPayables(); fetchCounts(); }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {billSuccess && (
            <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '12px 16px', color: '#047857', fontSize: '14px', fontWeight: 500 }}>
              ✅ {billSuccess}
            </div>
          )}

          {/* KPI Cards */}
          <div className="acc-grid-4">
            {[
              { label: 'Pending Approval', val: counts['PENDING_APPROVAL'] ?? 0, bg: '#fef3c7', color: '#b45309', icon: '⏳' },
              { label: 'Approved', val: counts['APPROVED'] ?? 0, bg: '#d1fae5', color: '#047857', icon: '✅' },
              { label: 'In Transit / Partial', val: (counts['SENT'] || 0) + (counts['PARTIALLY_RECEIVED'] || 0), bg: '#e0e7ff', color: '#4338ca', icon: '🚚' },
              { label: 'Current Tab Value', val: `₹${totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, bg: '#f0fdf4', color: '#15803d', icon: '💰', small: true },
            ].map(k => (
              <div key={k.label} className="acc-card acc-kpi-card">
                <div className="acc-kpi-icon" style={{ background: k.bg, color: k.color, fontSize: '22px' }}>{k.icon}</div>
                <div className="acc-kpi-info">
                  <p className="acc-kpi-label">{k.label}</p>
                  <h3 className="acc-kpi-value" style={{ fontSize: k.small ? '1.1rem' : undefined }}>{k.val}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 0, flexWrap: 'wrap' }}>
            {STATUS_TABS.map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                padding: '10px 18px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '13px', fontWeight: 500, background: 'transparent',
                borderBottom: filter === tab.key ? '2px solid #4f46e5' : '2px solid transparent',
                color: filter === tab.key ? '#4f46e5' : '#64748b', transition: 'all .2s',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                {tab.label}
                <span style={{
                  background: filter === tab.key ? '#e0e7ff' : '#f1f5f9',
                  color: filter === tab.key ? '#4338ca' : '#64748b',
                  padding: '1px 7px', borderRadius: '99px', fontSize: '11px', fontWeight: 600
                }}>{counts[tab.key] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="acc-card">
            {loading ? (
              <div className="acc-loading"><div className="acc-spinner" /></div>
            ) : payables.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 6px' }}>
                  No {STATUS_TABS.find(t => t.key === filter)?.label} purchase orders
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Purchase orders in this category will appear here</p>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 1fr 1fr 1.1fr 180px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['PO Number', 'Supplier', 'Project', 'Status', 'Amount', 'Actions'].map((h, i) => (
                    <div key={h} style={{ padding: '13px 20px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '.05em', textAlign: i >= 4 ? 'right' : 'left' }}>{h}</div>
                  ))}
                </div>

                {payables.map(po => {
                  const isExp = expandedId === po.id;
                  const badgeCls = STATUS_BADGE[po.status] || 'acc-badge-slate';
                  return (
                    <div key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Main Row */}
                      <div
                        style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 1fr 1fr 1.1fr 180px', alignItems: 'center', cursor: 'pointer', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => setExpandedId(isExp ? null : po.id)}
                      >
                        <div style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>{po.poNumber}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{new Date(po.poDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        </div>
                        <div style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 500, color: '#1e293b' }}>{po.supplierName}</div>
                          {po.supplierEmail && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{po.supplierEmail}</div>}
                        </div>
                        <div style={{ padding: '16px 20px', fontSize: '13px', color: '#64748b' }}>{po.projectName || '—'}</div>
                        <div style={{ padding: '16px 20px' }}>
                          <span className={`acc-badge ${badgeCls}`}>{po.status.replace(/_/g, ' ')}</span>
                        </div>
                        <div style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>₹{fmt(po.totalAmount)}</div>
                          {po.deliveryDate && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Due {new Date(po.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>}
                        </div>
                        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                          {po.status === 'PENDING_APPROVAL' && (
                            <>
                              <button className="acc-btn acc-btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: '#059669' }} onClick={() => handleAction(po, 'APPROVE')}>Approve</button>
                              <button className="acc-btn acc-btn-outline" style={{ padding: '6px 12px', fontSize: '12px', color: '#b91c1c', borderColor: '#fca5a5' }} onClick={() => handleAction(po, 'REJECT')}>Reject</button>
                            </>
                          )}
                          {po.status === 'APPROVED' && (
                            <button className="acc-btn acc-btn-primary" style={{ padding: '6px 12px', fontSize: '12px', gap: '5px' }} onClick={() => handleGenerateBill(po)}>
                              🧾 Generate Bill
                            </button>
                          )}
                          <button className="acc-icon-btn" onClick={() => setExpandedId(isExp ? null : po.id)}>
                            {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Section */}
                      {isExp && (
                        <div style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc', padding: '16px 24px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>Line Items</div>
                          {(po.items || []).length === 0 ? (
                            <p style={{ color: '#94a3b8', fontSize: '13px' }}>No line items found.</p>
                          ) : (
                            <div className="acc-table-wrapper">
                              <table className="acc-table">
                                <thead>
                                  <tr>
                                    <th>#</th><th>Description</th><th>HSN</th>
                                    <th style={{ textAlign: 'right' }}>Qty</th>
                                    <th style={{ textAlign: 'right' }}>Rate</th>
                                    <th style={{ textAlign: 'right' }}>GST %</th>
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(po.items || []).map((item, idx) => (
                                    <tr key={item.id}>
                                      <td>{item.sNo || idx + 1}</td>
                                      <td style={{ fontWeight: 500 }}>{item.description}</td>
                                      <td>{item.hsnCode || '—'}</td>
                                      <td style={{ textAlign: 'right' }}>{item.quantity} {item.unit}</td>
                                      <td style={{ textAlign: 'right' }}>₹{fmt(item.rate)}</td>
                                      <td style={{ textAlign: 'right' }}>{item.gstPercent}%</td>
                                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{fmt(item.totalAmount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '32px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                            {[['Subtotal', po.subTotal], ['Tax', po.totalTaxAmount], ['Grand Total', po.totalAmount]].map(([l, v], i) => (
                              <div key={l} style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>{l}</div>
                                <div style={{ fontSize: i === 2 ? '17px' : '14px', fontWeight: i === 2 ? 700 : 500, color: i === 2 ? '#059669' : '#334155', marginTop: '2px' }}>₹{fmt(v)}</div>
                              </div>
                            ))}
                          </div>
                          {/* Supplier & Terms */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '6px' }}>Supplier Info</div>
                              <div style={{ fontSize: '13px', color: '#334155' }}>{po.supplierAddress}</div>
                              {po.supplierPhone && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>📞 {po.supplierPhone}</div>}
                              {po.supplierGstin && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>GST: {po.supplierGstin}</div>}
                            </div>
                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '6px' }}>Payment Terms</div>
                              <div style={{ fontSize: '13px', color: '#334155' }}>{po.paymentTerms || 'Not specified'}</div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: '10px', marginBottom: '4px' }}>Prepared By</div>
                              <div style={{ fontSize: '13px', color: '#334155' }}>{po.preparedByName}</div>
                            </div>
                          </div>
                          {(po.remarks || po.accountsRemarks) && (
                            <div style={{ marginTop: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#1e40af' }}>
                              {po.remarks && <div><strong>Purchase Remarks:</strong> {po.remarks}</div>}
                              {po.accountsRemarks && <div style={{ marginTop: po.remarks ? '6px' : 0 }}><strong>Accounts Remarks:</strong> {po.accountsRemarks}</div>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>

        </div>
      </div>

      {/* Approve/Reject Modal */}
      {showModal && selectedPO && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '460px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
              {modalAction === 'APPROVE' ? '✅ Approve' : '❌ Reject'} Purchase Order
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
              {modalAction === 'APPROVE' ? 'Confirm approval to proceed with payment.' : 'Provide a reason for rejection.'}
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '18px' }}>
              {[['PO Number', selectedPO.poNumber], ['Supplier', selectedPO.supplierName], ['Amount', `₹${fmt(selectedPO.totalAmount)}`]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0' }}>
                  <span style={{ color: '#64748b' }}>{l}</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="acc-form-group">
              <label className="acc-label">Remarks {modalAction === 'REJECT' && <span style={{ color: '#ef4444' }}>*</span>}</label>
              <textarea className="acc-textarea" value={remarks} onChange={e => setRemarks(e.target.value)}
                placeholder={modalAction === 'APPROVE' ? 'Optional approval note...' : 'Reason for rejection (required)...'}
                rows={3} style={{ resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="acc-btn acc-btn-outline" onClick={() => setShowModal(false)} disabled={processing}>Cancel</button>
              <button
                className="acc-btn acc-btn-primary"
                onClick={submitAction}
                disabled={processing || (modalAction === 'REJECT' && !remarks.trim())}
                style={{ background: modalAction === 'APPROVE' ? '#059669' : '#dc2626', opacity: processing ? 0.6 : 1 }}
              >
                {processing ? 'Processing...' : modalAction === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Bill Modal */}
      {showBillModal && billPO && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={e => { if (e.target === e.currentTarget) setShowBillModal(false); }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>🧾 Generate Purchase Bill</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>Create a vendor bill from this approved purchase order</p>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#059669', fontSize: '15px' }}>{billPO.poNumber}</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{billPO.supplierName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>PO Value</div>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '18px' }}>₹{fmt(billPO.totalAmount)}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="acc-form-group" style={{ marginBottom: 0 }}>
                <label className="acc-label">Bill Date <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="date" className="acc-input" value={billForm.billDate} onChange={e => setBillForm(f => ({ ...f, billDate: e.target.value }))} />
              </div>
              <div className="acc-form-group" style={{ marginBottom: 0 }}>
                <label className="acc-label">TDS Amount (₹)</label>
                <input type="number" className="acc-input" value={billForm.tdsAmount} min="0" placeholder="0.00" onChange={e => setBillForm(f => ({ ...f, tdsAmount: e.target.value }))} />
              </div>
            </div>
            <div className="acc-form-group" style={{ marginTop: '14px' }}>
              <label className="acc-label">Remarks</label>
              <input type="text" className="acc-input" value={billForm.remarks} placeholder={`Bill for PO ${billPO.poNumber}`} onChange={e => setBillForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
              {[['Gross Amount', `₹${fmt(billPO.totalAmount)}`, '#1e293b'], ['TDS Deduction', `− ₹${fmt(parseFloat(billForm.tdsAmount) || 0)}`, '#ef4444']].map(([l, v, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                  <span>{l}</span><span style={{ color: c, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>Net Payable</span>
                <span style={{ fontWeight: 800, color: '#059669', fontSize: '17px' }}>₹{fmt((billPO.totalAmount || 0) - (parseFloat(billForm.tdsAmount) || 0))}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="acc-btn acc-btn-outline" onClick={() => setShowBillModal(false)} disabled={billProcessing}>Cancel</button>
              <button className="acc-btn acc-btn-primary" onClick={submitBill} disabled={billProcessing || !billForm.billDate} style={{ opacity: billProcessing || !billForm.billDate ? 0.6 : 1 }}>
                {billProcessing ? 'Creating...' : '🧾 Generate Bill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
