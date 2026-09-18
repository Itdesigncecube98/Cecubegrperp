'use client';
import { useState, useEffect } from 'react';
import { FileText, Send, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';
import '../purchase.css';

const STATUS_STYLES = {
  UNPAID:  { bg: '#fef3c7', text: '#b45309', label: 'Pending Payment' },
  PARTIAL: { bg: '#dbeafe', text: '#1d4ed8', label: 'Partially Paid' },
  PAID:    { bg: '#d1fae5', text: '#047857', label: 'Paid' },
};

export default function PurchaseBillsPage() {
  const [approvedPOs, setApprovedPOs] = useState([]);
  const [bills, setBills]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [billsLoading, setBillsLoading] = useState(true);
  const [activeTab, setActiveTab]     = useState('create');
  const [expandedPO, setExpandedPO]   = useState(null);
  const [showBillForm, setShowBillForm] = useState(null);
  const [form, setForm] = useState({
    billDate: new Date().toISOString().split('T')[0],
    grossAmount: '',
    tdsAmount: '0',
    vendorInvoiceNo: '',
    remarks: ''
  });
  const [submitting, setSubmitting]   = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');
  const [errorMsg, setErrorMsg]       = useState('');

  useEffect(() => { fetchApprovedPOs(); fetchBills(); }, []);

  const fetchApprovedPOs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/purchase/po?status=APPROVED');
      const data = await res.json();
      setApprovedPOs(Array.isArray(data) ? data : []);
    } catch { setApprovedPOs([]); }
    finally { setLoading(false); }
  };

  const fetchBills = async () => {
    try {
      setBillsLoading(true);
      const res = await fetch('/api/purchase/bills');
      const data = await res.json();
      setBills(Array.isArray(data) ? data : []);
    } catch { setBills([]); }
    finally { setBillsLoading(false); }
  };

  const openBillForm = (po) => {
    setShowBillForm(po);
    setForm({
      billDate: new Date().toISOString().split('T')[0],
      grossAmount: String(po.totalAmount || ''),
      tdsAmount: '0',
      vendorInvoiceNo: '',
      remarks: `Bill for PO ${po.poNumber} — ${po.supplierName}`
    });
    setErrorMsg('');
  };

  const submitBill = async () => {
    if (!showBillForm || !form.billDate || !form.grossAmount) {
      setErrorMsg('Bill Date and Gross Amount are required.');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg('');
      const res = await fetch('/api/purchase/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poNumber:    showBillForm.poNumber,
          supplierId:  showBillForm.supplierId,
          supplierName: showBillForm.supplierName,
          companyId:   showBillForm.companyId,
          billDate:    form.billDate,
          grossAmount: parseFloat(form.grossAmount),
          tdsAmount:   parseFloat(form.tdsAmount) || 0,
          vendorInvoiceNo: form.vendorInvoiceNo,
          remarks:     form.remarks
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Bill ${data.bill.billNo} created and sent to accounts!`);
        setShowBillForm(null);
        fetchApprovedPOs();
        fetchBills();
        setActiveTab('history');
      } else {
        setErrorMsg(data.error || 'Failed to create bill');
      }
    } catch { setErrorMsg('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const gross = parseFloat(form.grossAmount) || 0;
  const tds   = parseFloat(form.tdsAmount) || 0;
  const net   = gross - tds;
  const fmt   = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return (
    <div className="pur-page-container">

      {/* Header */}
      <div className="pur-header">
        <div>
          <h1 className="pur-title">Purchase Bills</h1>
          <p className="pur-subtitle">Generate bills from approved POs and send to accounts for payment</p>
        </div>
        <div className="pur-flex" style={{ gap: '10px' }}>
          <button className="pur-btn pur-btn-outline" onClick={() => { fetchApprovedPOs(); fetchBills(); }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Workflow Steps Banner */}
      <div className="pur-card" style={{ padding: '20px 28px', background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', overflowX: 'auto' }}>
          {[
            { icon: '📋', label: 'Create PO', sub: 'Purchase team', done: true },
            { icon: '✅', label: 'Accounts Approves', sub: 'Vendor Payables', done: true },
            { icon: '🧾', label: 'Generate Bill', sub: 'You are here', active: true },
            { icon: '💳', label: 'Accounts Pays', sub: 'Payment processed', done: false },
          ].map((step, i, arr) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 'none' : '0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '20px',
                  background: step.active ? '#e0e7ff' : step.done ? '#d1fae5' : '#f1f5f9',
                  border: step.active ? '2px solid #6366f1' : step.done ? '2px solid #10b981' : '2px solid #e2e8f0',
                }}>
                  {step.icon}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: step.active ? '#4f46e5' : step.done ? '#047857' : '#94a3b8', marginTop: '6px', textAlign: 'center' }}>{step.label}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>{step.sub}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ flex: 1, height: '2px', background: '#e2e8f0', minWidth: '40px', margin: '0 4px', marginBottom: '20px' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Success message */}
      {successMsg && (
        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '12px 16px', color: '#047857', fontSize: '14px', fontWeight: 500 }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0' }}>
        {[
          { key: 'create', label: `🧾 Generate Bill (${approvedPOs.length} Approved POs)` },
          { key: 'history', label: `📋 Bill History (${bills.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '14px', fontWeight: 500, background: 'transparent',
              borderBottom: activeTab === tab.key ? '2px solid #4f46e5' : '2px solid transparent',
              color: activeTab === tab.key ? '#4f46e5' : '#64748b',
              transition: 'all .2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Generate Bill Tab ─── */}
      {activeTab === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div className="pur-loading"><div className="pur-spinner" /></div>
          ) : approvedPOs.length === 0 ? (
            <div className="pur-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 6px' }}>No Approved POs</h3>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Approved POs from accounts will appear here for billing</p>
            </div>
          ) : (
            approvedPOs.map(po => {
              const isExp = expandedPO === po.id;
              return (
                <div key={po.id} className="pur-card" style={{ overflow: 'visible' }}>
                  {/* PO Header Row */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer' }}
                    onClick={() => setExpandedPO(isExp ? null : po.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>{po.poNumber}</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{po.supplierName}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8' }}>
                        <span>📅 {new Date(po.poDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        {po.projectName && <span>🏗 {po.projectName}</span>}
                        <span>📦 {(po.items || []).length} item(s)</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>₹{fmt(po.totalAmount)}</div>
                      <span className="pur-badge pur-badge-emerald">✅ Approved</span>
                      <button
                        className="pur-btn pur-btn-primary"
                        style={{ fontSize: '13px', gap: '6px' }}
                        onClick={(e) => { e.stopPropagation(); openBillForm(po); }}
                      >
                        <FileText size={13} /> Generate Bill
                      </button>
                      <button className="pur-icon-btn" style={{ color: '#94a3b8' }}>
                        {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Line Items */}
                  {isExp && (
                    <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 20px', background: '#f8fafc' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>Line Items</div>
                      <div className="pur-table-wrapper">
                        <table className="pur-table">
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
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '32px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                        {[
                          { label: 'Subtotal', val: po.subTotal },
                          { label: 'Tax', val: po.totalTaxAmount },
                          { label: 'Grand Total', val: po.totalAmount, bold: true },
                        ].map(r => (
                          <div key={r.label} style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{r.label}</div>
                            <div style={{ fontSize: r.bold ? '17px' : '14px', fontWeight: r.bold ? 700 : 500, color: r.bold ? '#059669' : '#334155', marginTop: '2px' }}>₹{fmt(r.val)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Bill History Tab ─── */}
      {activeTab === 'history' && (
        <div className="pur-card">
          {billsLoading ? (
            <div className="pur-loading"><div className="pur-spinner" /></div>
          ) : bills.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧾</div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 6px' }}>No bills generated yet</h3>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Bills you generate will appear here</p>
            </div>
          ) : (
            <div className="pur-table-wrapper">
              <table className="pur-table">
                <thead>
                  <tr>
                    <th>Bill No.</th>
                    <th>Date</th>
                    <th>PO Reference</th>
                    <th>Remarks</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Gross</th>
                    <th style={{ textAlign: 'right' }}>TDS</th>
                    <th style={{ textAlign: 'right' }}>Net Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map(bill => {
                    const st = STATUS_STYLES[bill.status] || STATUS_STYLES.UNPAID;
                    return (
                      <tr key={bill.id}>
                        <td className="pur-font-semibold">{bill.billNo}</td>
                        <td>{new Date(bill.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td>
                          {bill.poNo
                            ? <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>PO: {bill.poNo}</span>
                            : <span className="pur-text-muted">—</span>}
                        </td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: '13px' }}>
                          {bill.remarks || '—'}
                        </td>
                        <td>
                          <span className="pur-badge" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>₹{fmt(bill.grossAmount)}</td>
                        <td style={{ textAlign: 'right', color: Number(bill.tdsAmount) > 0 ? '#ef4444' : '#94a3b8' }}>
                          {Number(bill.tdsAmount) > 0 ? `−₹${fmt(bill.tdsAmount)}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>₹{fmt(bill.netAmount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Bill Form Modal ─── */}
      {showBillForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={e => { if (e.target === e.currentTarget) setShowBillForm(null); }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>

            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>🧾 Generate Purchase Bill</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>Enter final invoice details and send to accounts</p>

            {/* PO Summary */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>{showBillForm.poNumber}</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>{showBillForm.supplierName}</div>
                  {showBillForm.projectName && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>🏗 {showBillForm.projectName}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>PO Value</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>₹{fmt(showBillForm.totalAmount)}</div>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#b91c1c', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={13} /> {errorMsg}
              </div>
            )}

            {/* Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="pur-form-group" style={{ marginBottom: 0 }}>
                <label className="pur-label">Bill Date <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="date" className="pur-input" value={form.billDate}
                  onChange={e => setForm(f => ({ ...f, billDate: e.target.value }))} />
              </div>
              <div className="pur-form-group" style={{ marginBottom: 0 }}>
                <label className="pur-label">Vendor Invoice No.</label>
                <input type="text" className="pur-input" value={form.vendorInvoiceNo}
                  placeholder="Supplier's invoice ref"
                  onChange={e => setForm(f => ({ ...f, vendorInvoiceNo: e.target.value }))} />
              </div>
            </div>

            <div className="pur-form-group" style={{ marginTop: '14px' }}>
              <label className="pur-label">Final Bill Amount (₹) <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="number" className="pur-input" value={form.grossAmount}
                placeholder="Enter actual invoice amount"
                style={{ fontSize: '16px', fontWeight: 600 }}
                onChange={e => setForm(f => ({ ...f, grossAmount: e.target.value }))} />
              {showBillForm.totalAmount && form.grossAmount && Math.abs(parseFloat(form.grossAmount) - showBillForm.totalAmount) > 1 && (
                <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px' }}>
                  ⚠ Differs from PO value by ₹{fmt(Math.abs(parseFloat(form.grossAmount) - showBillForm.totalAmount))}
                </div>
              )}
            </div>

            <div className="pur-form-group">
              <label className="pur-label">TDS Deduction (₹)</label>
              <input type="number" className="pur-input" value={form.tdsAmount} min="0"
                placeholder="0.00"
                onChange={e => setForm(f => ({ ...f, tdsAmount: e.target.value }))} />
            </div>

            <div className="pur-form-group">
              <label className="pur-label">Remarks</label>
              <input type="text" className="pur-input" value={form.remarks}
                onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>

            {/* Amount Summary */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
              {[
                { label: 'Gross Amount', val: `₹${fmt(gross)}`, color: '#1e293b' },
                { label: 'TDS Deduction', val: `− ₹${fmt(tds)}`, color: '#ef4444' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                  <span>{r.label}</span><span style={{ color: r.color, fontWeight: 500 }}>{r.val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Net Payable to Accounts</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>₹{fmt(net)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="pur-btn pur-btn-outline" onClick={() => setShowBillForm(null)} disabled={submitting}>
                Cancel
              </button>
              <button
                className="pur-btn pur-btn-primary"
                onClick={submitBill}
                disabled={submitting || !form.billDate || !form.grossAmount}
                style={{ gap: '8px', opacity: (submitting || !form.billDate || !form.grossAmount) ? 0.5 : 1 }}
              >
                <Send size={13} />
                {submitting ? 'Sending...' : 'Send Bill to Accounts'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
