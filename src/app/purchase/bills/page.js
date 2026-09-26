'use client';
import { useState, useEffect } from 'react';
import { FileText, Send, ChevronDown, ChevronUp, AlertCircle, RefreshCw, Eye, Pencil } from 'lucide-react';
import '../purchase.css';

const STATUS_STYLES = {
  UNPAID:  { bg: '#fef3c7', text: '#b45309', label: 'Pending Payment' },
  PARTIAL: { bg: '#dbeafe', text: '#1d4ed8', label: 'Partially Paid' },
  PAID:    { bg: '#d1fae5', text: '#047857', label: 'Paid' },
};
const displayBillNo = (value, billDate) => String(value || '').replace(/^VB-0*(\d+)$/i, (_, number) => {
  const year = billDate ? new Date(billDate).getFullYear() : new Date().getFullYear();
  return `PB-${year}-${String(Number(number)).padStart(4, '0')}`;
});

export default function PurchaseBillsPage() {
  const [approvedPOs, setApprovedPOs] = useState([]);
  const [bills, setBills]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [billsLoading, setBillsLoading] = useState(true);
  const [activeTab, setActiveTab]     = useState('create');
  const [expandedPO, setExpandedPO]   = useState(null);
  const [showBillForm, setShowBillForm] = useState(null);
  const [editingBillId, setEditingBillId] = useState(null);
  const [billMode, setBillMode] = useState('create');
  const [billPreviewLoading, setBillPreviewLoading] = useState(false);
  const [form, setForm] = useState({
    billDate: new Date().toISOString().split('T')[0],
    vendorInvoiceNo: '',
    taxableAmount: '',
    cgstAmount: '0',
    sgstAmount: '0',
    cartageCharges: '0',
    roundOff: '0',
    tdsAmount: '0',
    companyPan: '',
    companyBankName: '',
    companyBankAccount: '',
    companyBankIfsc: '',
    remarks: ''
  });
  const [submitting, setSubmitting]   = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');
  const [errorMsg, setErrorMsg]       = useState('');

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

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/purchase/po?status=APPROVED').then(response => response.json()),
      fetch('/api/purchase/bills').then(response => response.json()),
    ]).then(([poData, billData]) => {
      if (cancelled) return;
      setApprovedPOs(Array.isArray(poData) ? poData : []);
      setBills(Array.isArray(billData) ? billData : []);
    }).catch(() => {
      if (!cancelled) {
        setApprovedPOs([]);
        setBills([]);
      }
    }).finally(() => {
      if (!cancelled) {
        setLoading(false);
        setBillsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const openSavedBill = async (bill, mode) => {
    setBillPreviewLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`/api/purchase/bills?id=${encodeURIComponent(bill.id)}`, { cache: 'no-store' });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error || 'Unable to open bill.');
      const po = saved.po || {};
      setEditingBillId(saved.id);
      setBillMode(mode);
      setShowBillForm({ ...po, id: po.id, billNo: saved.billNo, poNumber: saved.poNo || po.poNumber || '', supplierName: po.supplierName || '', items: saved.items || [], billRecord: saved });
      setForm({
        billDate: saved.billDate ? new Date(saved.billDate).toISOString().slice(0, 10) : '',
        vendorInvoiceNo: saved.vendorInvoiceNo || `INV-${new Date(saved.billDate).getFullYear()}-${String(Number(String(saved.billNo || '').match(/(\d+)$/)?.[1]) || 1).padStart(4, '0')}`,
        taxableAmount: Number(saved.taxableAmount || 0).toFixed(2),
        cgstAmount: Number(saved.cgstAmount || 0).toFixed(2),
        sgstAmount: Number(saved.sgstAmount || 0).toFixed(2),
        cartageCharges: String(saved.cartageCharges || 0),
        roundOff: String(saved.roundOff || 0),
        tdsAmount: String(saved.tdsAmount || 0),
        companyPan: saved.companyPan || saved.buyerPan || 'AAJCC2203M',
        companyBankName: saved.companyBankName || '',
        companyBankAccount: saved.companyBankAccount || '',
        companyBankIfsc: saved.companyBankIfsc || '',
        remarks: saved.remarks || '',
        vendorName: po.supplierName || '',
        vendorAddress: po.supplierAddress || '',
        vendorGstin: po.supplierGstin || '',
        buyerName: 'CECUBE ENGINEERING INDIA PRIVATE LIMITED',
        buyerAddress: 'A-121&A-122, NEW PALAM VIHAR, Near St. Soldier School\nState : 06Gurugram, Haryana,',
        buyerGstin: '06AAJCC2203M1ZT',
        buyerPan: 'AAJCC2203M',
        shippedTo: po.projectName || po.project?.name || po.deliveryAddress || '',
      });
    } catch (error) {
      setErrorMsg(error.message || 'Unable to open bill.');
    } finally {
      setBillPreviewLoading(false);
    }
  };

  const openBillForm = async (po) => {
    setEditingBillId(null);
    setBillMode('create');
    setBillPreviewLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`/api/purchase/bills?previewPoNumber=${encodeURIComponent(po.poNumber)}`, { cache: 'no-store' });
      const preview = await response.json();
      if (!response.ok) throw new Error(preview.error || 'Unable to calculate eligible PO quantities.');
      if (!preview.items?.length || preview.grossAmount <= 0) {
        setShowBillForm(null);
        setErrorMsg('No accepted quantities are available to bill. Rejected and failed-GTN quantities are excluded.');
        return;
      }

      setShowBillForm({ ...po, billNo: preview.billNo, items: preview.items, billablePreview: preview });
      setForm({
        billDate: new Date().toISOString().split('T')[0],
        vendorInvoiceNo: preview.invoiceNo,
        taxableAmount: Number(preview.taxableAmount).toFixed(2),
        cgstAmount: Number(preview.cgstAmount).toFixed(2),
        sgstAmount: Number(preview.sgstAmount).toFixed(2),
        cartageCharges: '0',
        roundOff: '0',
        tdsAmount: '0',
        companyPan: 'AAJCC2203M',
        companyBankName: '',
        companyBankAccount: '',
        companyBankIfsc: '',
        remarks: `Bill for PO ${po.poNumber} — ${po.supplierName}`,
        vendorName: po.supplierName || '',
        vendorAddress: po.supplierAddress || '',
        vendorGstin: po.supplierGstin || '',
        buyerName: 'CECUBE ENGINEERING INDIA PRIVATE LIMITED',
        buyerAddress: 'A-121&A-122, NEW PALAM VIHAR, Near St. Soldier School\nState : 06Gurugram, Haryana,',
        buyerGstin: '06AAJCC2203M1ZT',
        buyerPan: 'AAJCC2203M',
        shippedTo: po.projectName || po.project?.name || po.deliveryAddress || '',
      });
    } catch (error) {
      setErrorMsg(error.message || 'Unable to calculate eligible PO quantities.');
    } finally {
      setBillPreviewLoading(false);
    }
  };

  const submitBill = async () => {
    if (!showBillForm || !form.billDate || !form.taxableAmount) {
      setErrorMsg('Bill Date and Taxable Amount are required.');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg('');

      const taxable = parseFloat(form.taxableAmount) || 0;
      const cgst = parseFloat(form.cgstAmount) || 0;
      const sgst = parseFloat(form.sgstAmount) || 0;
      const cartage = parseFloat(form.cartageCharges) || 0;
      const roundOff = parseFloat(form.roundOff) || 0;
      const totalAmount = taxable + cgst + sgst + cartage + roundOff;
      const tds = parseFloat(form.tdsAmount) || 0;
      const netAmount = totalAmount - tds;

      const res = await fetch('/api/purchase/bills', {
        method: editingBillId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBillId,
          poNumber:    showBillForm.poNumber,
          supplierId:  showBillForm.supplierId,
          supplierName: showBillForm.supplierName,
          companyId:   showBillForm.companyId,
          billDate:    form.billDate,
          vendorInvoiceNo: form.vendorInvoiceNo,
          taxableAmount: taxable,
          cgstAmount:  cgst,
          sgstAmount:  sgst,
          cartageCharges: cartage,
          roundOff:    roundOff,
          grossAmount: totalAmount,
          tdsAmount:   tds,
          netAmount:   netAmount,
          companyPan:  form.companyPan,
          companyBankName: form.companyBankName,
          companyBankAccount: form.companyBankAccount,
          companyBankIfsc: form.companyBankIfsc,
          remarks:     form.remarks
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(editingBillId ? `Bill ${displayBillNo(data.billNo, data.billDate)} updated.` : `Bill ${displayBillNo(data.bill.billNo, data.bill.billDate)} created and sent to accounts!`);
        setShowBillForm(null);
        setEditingBillId(null);
        setBillMode('create');
        if (!editingBillId) fetchApprovedPOs();
        fetchBills();
        setActiveTab('history');
      } else {
        setErrorMsg(data.error || 'Failed to create bill');
      }
    } catch { setErrorMsg('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const handlePrint = () => {
    const doc = document.getElementById('invoice-document');
    if (doc) {
      doc.querySelectorAll('input').forEach(el => el.setAttribute('value', el.value));
      doc.querySelectorAll('textarea').forEach(el => { el.textContent = el.value; });
    }
    window.print();
  };

  const taxable = parseFloat(form.taxableAmount) || 0;
  const cgst = parseFloat(form.cgstAmount) || 0;
  const sgst = parseFloat(form.sgstAmount) || 0;
  const cartage = parseFloat(form.cartageCharges) || 0;
  const roundOff = parseFloat(form.roundOff) || 0;
  const totalAmount = taxable + cgst + sgst + cartage + roundOff;
  const tds = parseFloat(form.tdsAmount) || 0;
  const net = totalAmount - tds;
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

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
    {errorMsg && !showBillForm && (
      <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500 }}>
        ⚠️ {errorMsg}
      </div>
    )}
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
                        disabled={billPreviewLoading}
                        onClick={(e) => { e.stopPropagation(); openBillForm(po); }}
                      >
                        <FileText size={13} /> {billPreviewLoading ? 'Calculating...' : 'Generate Bill'}
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
                                <td style={{ textAlign: 'right' }}>{fmt(item.quantity)} {item.unit}</td>
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
                    <th style={{ textAlign: 'right' }}>Taxable</th>
                    <th style={{ textAlign: 'right' }}>CGST</th>
                    <th style={{ textAlign: 'right' }}>SGST</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>TDS</th>
                    <th style={{ textAlign: 'right' }}>Net Payable</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map(bill => {
                    const st = STATUS_STYLES[bill.status] || STATUS_STYLES.UNPAID;
                    return (
                      <tr key={bill.id}>
                        <td className="pur-font-semibold">{displayBillNo(bill.billNo, bill.billDate)}</td>
                        <td>{new Date(bill.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td>
                          {bill.poNo
                            ? <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>PO: {bill.poNo}</span>
                            : <span className="pur-text-muted">—</span>}
                        </td>
                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: '13px' }}>
                          {bill.remarks || '—'}
                        </td>
                        <td>
                          <span className="pur-badge" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>₹{fmt(bill.taxableAmount || 0)}</td>
                        <td style={{ textAlign: 'right', color: '#6366f1' }}>₹{fmt(bill.cgstAmount || 0)}</td>
                        <td style={{ textAlign: 'right', color: '#6366f1' }}>₹{fmt(bill.sgstAmount || 0)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{fmt(bill.grossAmount)}</td>
                        <td style={{ textAlign: 'right', color: Number(bill.tdsAmount) > 0 ? '#ef4444' : '#94a3b8' }}>
                          {Number(bill.tdsAmount) > 0 ? `−₹${fmt(bill.tdsAmount)}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>₹{fmt(bill.netAmount)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={() => openSavedBill(bill, 'view')} title="Open bill" aria-label={`Open bill ${displayBillNo(bill.billNo, bill.billDate)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 4, background: '#fff', color: '#334155', cursor: 'pointer' }}><Eye size={14} /> Open</button>
                            <button type="button" onClick={() => openSavedBill(bill, 'edit')} title="Edit bill" aria-label={`Edit bill ${displayBillNo(bill.billNo, bill.billDate)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 8px', border: '1px solid #bfdbfe', borderRadius: 4, background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer' }}><Pencil size={14} /> Edit</button>
                          </div>
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

      {/* ─── Bill WYSIWYG Form Modal ─── */}
      {showBillForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', zIndex: 9999, padding: '20px 0' }}>

          <style>{`
            .inv-doc-input { border: 1px solid transparent; background: transparent; padding: 2px 4px; font-family: inherit; font-size: inherit; width: 100%; transition: all 0.2s; outline: none; }
            .inv-doc-input:hover { border-color: #cbd5e1; background: #f8fafc; }
            .inv-doc-input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }

            .inv-table { width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; box-sizing: border-box; }
            .inv-table th, .inv-table td { border: 1px solid #000; padding: 4px; vertical-align: top; box-sizing: border-box; overflow-wrap: anywhere; }
            .inv-table th { font-weight: bold; text-align: center; font-size: 11px; }
            .invoice-footer { display: grid; grid-template-columns: 60% 40%; min-height: 140px; border: 1px solid #000; border-top: 0; box-sizing: border-box; font-size: 10px; }
            .invoice-footer-left, .invoice-footer-right { min-width: 0; box-sizing: border-box; padding: 6px; }
            .invoice-footer-left { display: flex; flex-direction: column; justify-content: space-between; gap: 12px; }
            .invoice-footer-right { display: flex; flex-direction: column; border-left: 1px solid #000; }
            .invoice-bank-table, .invoice-bank-table tbody, .invoice-bank-table tr, .invoice-bank-table td { background: #fff !important; border: 0 !important; }
            .invoice-bank-table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10px; }
            .invoice-bank-table td { padding: 4px 2px; vertical-align: middle; line-height: 1.25; }
            .invoice-bank-label { width: 72px; white-space: nowrap; }
            .invoice-footer .inv-doc-input { box-sizing: border-box; min-width: 0; }
            .invoice-declaration { line-height: 1.25; overflow-wrap: anywhere; }
            .invoice-signature { display: flex; flex: 1; flex-direction: column; justify-content: flex-end; align-items: flex-end; margin-top: 14px; text-align: center; }

            @media print {
              @page { size: A4 portrait; margin: 8mm; }
              html, body { width: 100%; margin: 0 !important; padding: 0 !important; }
              body * { visibility: hidden; }
              #invoice-document, #invoice-document * { visibility: visible; }
              #invoice-document { position: absolute; left: 0; top: 0; box-sizing: border-box !important; box-shadow: none !important; margin: 0 !important; width: 194mm !important; min-height: 281mm !important; padding: 8mm !important; overflow: visible !important; }
              #invoice-document > table { page-break-inside: avoid; }
              .no-print { display: none !important; }
            }
          `}</style>

          {/* Action Bar */}
          <div className="no-print" style={{ width: '210mm', display: 'flex', justifyContent: 'space-between', marginBottom: '16px', background: '#fff', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Generate Purchase Bill</h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Enter invoice details and save to accounts.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {errorMsg && <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 'bold' }}>{errorMsg}</span>}
              <button onClick={() => setShowBillForm(null)} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={handlePrint} style={{ padding: '8px 16px', background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Print</button>
              <button onClick={submitBill} disabled={submitting || !form.billDate || !form.taxableAmount} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {submitting ? 'Saving...' : 'Save Bill'} <Send size={14} />
              </button>
            </div>
          </div>

          {/* Document Frame */}
          <div id="invoice-document" style={{ background: '#fff', boxSizing: 'border-box', width: '210mm', minHeight: '297mm', padding: '10mm', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'Arial, sans-serif', color: '#000', fontSize: '11px', position: 'relative' }}>

            <div style={{ position: 'relative', textAlign: 'center', padding: '2px 90px 7px', marginBottom: 8, borderBottom: '1px solid #000' }}>
              <div style={{ fontWeight: 'bold', fontSize: 14 }}>GST INVOICE</div>
              <div style={{ fontSize: 10, marginTop: 2 }}>Original for Buyer</div>
              <div style={{ fontSize: 9, marginTop: 2 }}>Purchase Bill No: {displayBillNo(showBillForm.billNo, showBillForm.billRecord?.billDate)}</div>
              <img src="/logo.png" alt="CeCube Group" style={{ position: 'absolute', right: 0, top: 0, width: 70, maxHeight: 30, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
            </div>

            <div style={{ border: '1px solid #000', display: 'flex' }}>

              {/* Left Column: Vendor & Buyer */}
              <div style={{ width: '50%', boxSizing: 'border-box', borderRight: '1px solid #000' }}>
                <div style={{ padding: '8px', borderBottom: '1px solid #000', display: 'flex', minHeight: '90px' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <input type="text" className="inv-doc-input" style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', padding: '0 4px', marginLeft: '-4px' }} value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))} />
                    <div style={{ display: 'flex' }}>
                      <span style={{ color: '#4b5563', paddingTop: '2px' }}>Address:</span>
                      <textarea className="inv-doc-input" rows="2" style={{ flex: 1, padding: '0 4px', resize: 'none' }} value={form.vendorAddress} onChange={e => setForm(f => ({ ...f, vendorAddress: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', marginTop: '4px', fontWeight: 'bold' }}>
                      <span style={{ paddingTop: '2px' }}>GSTIN :</span>
                      <input type="text" className="inv-doc-input" style={{ flex: 1, fontWeight: 'bold', textTransform: 'uppercase', padding: '0 4px' }} value={form.vendorGstin} onChange={e => setForm(f => ({ ...f, vendorGstin: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div style={{ padding: '4px', minHeight: '110px' }}>
                  <div style={{ fontSize: '10px', color: '#4b5563' }}>Buyer</div>
                  <input type="text" className="inv-doc-input" style={{ fontWeight: 'bold', fontSize: '12px', padding: '0 4px', marginLeft: '-4px', width: 'calc(100% + 4px)' }} value={form.buyerName} onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))} />
                  <textarea className="inv-doc-input" rows="2" style={{ padding: '0 4px', marginLeft: '-4px', resize: 'none', width: 'calc(100% + 4px)' }} value={form.buyerAddress} onChange={e => setForm(f => ({ ...f, buyerAddress: e.target.value }))} />
                  <div style={{ display: 'flex', marginTop: '4px' }}>
                    <span style={{ paddingTop: '2px' }}>GSTIN / UIN :</span>
                    <input type="text" className="inv-doc-input" style={{ flex: 1, padding: '0 4px' }} value={form.buyerGstin} onChange={e => setForm(f => ({ ...f, buyerGstin: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex' }}>
                    <span style={{ paddingTop: '2px' }}>PAN / IT No :</span>
                    <input type="text" className="inv-doc-input" style={{ flex: 1, padding: '0 4px' }} value={form.buyerPan} onChange={e => setForm(f => ({ ...f, buyerPan: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Right Column: Invoice Details */}
              <div style={{ width: '50%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                  <div style={{ width: '50%', boxSizing: 'border-box', borderRight: '1px solid #000', padding: '4px' }}>
                    <div style={{ fontSize: '9px' }}>Invoice No.</div>
                    <input type="text" className="inv-doc-input" style={{ fontWeight: 'bold' }} value={form.vendorInvoiceNo} readOnly />
                  </div>
                  <div style={{ width: '50%', boxSizing: 'border-box', padding: '4px' }}>
                    <div style={{ fontSize: '9px' }}>Date</div>
                    <input type="date" className="inv-doc-input" style={{ fontWeight: 'bold' }} value={form.billDate} onChange={e => setForm(f => ({ ...f, billDate: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                  <div style={{ width: '50%', boxSizing: 'border-box', borderRight: '1px solid #000', padding: '4px' }}>
                    <div style={{ fontSize: '9px' }}>Delivery Note</div>
                    <input type="text" className="inv-doc-input" placeholder="-" />
                  </div>
                  <div style={{ width: '50%', boxSizing: 'border-box', padding: '4px' }}>
                    <div style={{ fontSize: '9px' }}>Terms Of Payment</div>
                    <input type="text" className="inv-doc-input" placeholder="-" />
                  </div>
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                  <div style={{ width: '50%', boxSizing: 'border-box', borderRight: '1px solid #000', padding: '4px' }}>
                    <div style={{ fontSize: '9px' }}>Buyer Order No (PO)</div>
                    <div style={{ fontWeight: 'bold', padding: '2px 4px' }}>{showBillForm.poNumber}</div>
                  </div>
                  <div style={{ width: '50%', boxSizing: 'border-box', padding: '4px' }}>
                    <div style={{ fontSize: '9px' }}>Dated</div>
                    <div style={{ padding: '2px 4px' }}>{new Date(showBillForm.poDate).toLocaleDateString('en-GB')}</div>
                  </div>
                </div>

                <div style={{ padding: '4px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '10px' }}>Shipped to :</div>
                  <textarea className="inv-doc-input" style={{ flex: 1, fontWeight: 'bold', resize: 'none', padding: '0 4px', marginLeft: '-4px' }} value={form.shippedTo} onChange={e => setForm(f => ({ ...f, shippedTo: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="inv-table" style={{ borderTop: 'none', borderBottom: 'none' }}>
              <thead>
                <tr>
                  <th style={{ width: '6%', borderTop: 'none' }}>SR No.</th>
                  <th style={{ width: '43%', borderTop: 'none' }}>Description of Goods</th>
                  <th style={{ width: '10%', borderTop: 'none' }}>HSN/SAC</th>
                  <th style={{ width: '10%', borderTop: 'none' }}>Quantity</th>
                  <th style={{ width: '10%', borderTop: 'none' }}>Rate</th>
                  <th style={{ width: '7%', borderTop: 'none' }}>Gst%</th>
                  <th style={{ width: '14%', borderTop: 'none' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(showBillForm.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', borderBottom: 'none', borderTop: 'none' }}>{idx + 1}</td>
                    <td style={{ borderBottom: 'none', borderTop: 'none', fontWeight: 'bold' }}>{item.description}</td>
                    <td style={{ textAlign: 'center', borderBottom: 'none', borderTop: 'none' }}>{item.hsnCode || '—'}</td>
                    <td style={{ textAlign: 'right', borderBottom: 'none', borderTop: 'none' }}>{fmt(item.quantity)} {item.unit}</td>
                    <td style={{ textAlign: 'right', borderBottom: 'none', borderTop: 'none' }}>{item.rate?.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', borderBottom: 'none', borderTop: 'none' }}>{item.gstPercent}%</td>
                    <td style={{ textAlign: 'right', borderBottom: 'none', borderTop: 'none' }}>{item.totalAmount?.toFixed(2)}</td>
                  </tr>
                ))}
                {/* Empty padding rows to stretch the table a bit */}
                <tr><td style={{ borderTop: 'none', borderBottom: 'none', height: '40px' }}></td><td style={{ borderTop: 'none', borderBottom: 'none' }}></td><td style={{ borderTop: 'none', borderBottom: 'none' }}></td><td style={{ borderTop: 'none', borderBottom: 'none' }}></td><td style={{ borderTop: 'none', borderBottom: 'none' }}></td><td style={{ borderTop: 'none', borderBottom: 'none' }}></td><td style={{ borderTop: 'none', borderBottom: 'none' }}></td></tr>

                {/* Manual Editable Rows for Freight/Roundoff */}
                <tr>
                  <td style={{ borderTop: 'none', borderBottom: 'none' }}></td>
                  <td style={{ borderTop: 'none', borderBottom: 'none', textAlign: 'right', fontWeight: 'bold', paddingRight: '20px' }}>CARTAGE</td>
                  <td style={{ borderTop: 'none', borderBottom: 'none' }}></td>
                  <td style={{ borderTop: 'none', borderBottom: 'none' }}></td>
                  <td style={{ borderTop: 'none', borderBottom: 'none' }}></td>
                  <td style={{ borderTop: 'none', borderBottom: 'none' }}></td>
                  <td style={{ borderTop: 'none', borderBottom: 'none' }}><input type="number" className="inv-doc-input" style={{ textAlign: 'right', fontWeight: 'bold' }} value={form.cartageCharges} onChange={e => setForm(f => ({ ...f, cartageCharges: e.target.value }))} /></td>
                </tr>
                <tr>
                  <td style={{ borderTop: 'none', borderBottom: 'none' }}></td>
                  <td style={{ borderTop: 'none', borderBottom: 'none', textAlign: 'right', fontWeight: 'bold', paddingRight: '20px' }}>Roundoff</td>
                  <td style={{ borderTop: 'none', borderBottom: 'none' }}></td>
                  <td style={{ borderTop: 'none', borderBottom: 'none' }}></td>
                  <td style={{ borderTop: 'none', borderBottom: 'none' }}></td>
                  <td style={{ borderTop: 'none', borderBottom: 'none' }}></td>
                  <td style={{ borderTop: 'none', borderBottom: 'none' }}><input type="number" className="inv-doc-input" style={{ textAlign: 'right', fontWeight: 'bold' }} value={form.roundOff} onChange={e => setForm(f => ({ ...f, roundOff: e.target.value }))} /></td>
                </tr>

                {/* Total Row */}
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }}>Total</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>{totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Bottom Tax Breakdown Table */}
            <table className="inv-table" style={{ borderTop: 'none', marginTop: '-1px' }}>
              <thead>
                <tr>
                  <th rowSpan="2" style={{ borderTop: 'none' }}>HSN/SAC</th>
                  <th rowSpan="2" style={{ borderTop: 'none' }}>Taxable<br/>Value</th>
                  <th colSpan="2" style={{ borderTop: 'none' }}>CGST Tax</th>
                  <th colSpan="2" style={{ borderTop: 'none' }}>SGST TAX</th>
                  <th rowSpan="2" style={{ borderTop: 'none' }}>Total<br/>Tax Amount</th>
                </tr>
                <tr>
                  <th>Rate</th><th>Amount</th><th>Rate</th><th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div style={{ color: '#64748b', fontSize: '10px' }}>(Aggregated)</div>
                  </td>
                  <td>
                    <input type="number" className="inv-doc-input" style={{ textAlign: 'right', fontWeight: 'bold' }} value={form.taxableAmount} onChange={e => setForm(f => ({ ...f, taxableAmount: e.target.value }))} />
                  </td>
                  <td style={{ textAlign: 'right' }}>9%</td>
                  <td>
                    <input type="number" className="inv-doc-input" style={{ textAlign: 'right' }} value={form.cgstAmount} onChange={e => setForm(f => ({ ...f, cgstAmount: e.target.value }))} />
                  </td>
                  <td style={{ textAlign: 'right' }}>9%</td>
                  <td>
                    <input type="number" className="inv-doc-input" style={{ textAlign: 'right' }} value={form.sgstAmount} onChange={e => setForm(f => ({ ...f, sgstAmount: e.target.value }))} />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {(parseFloat(form.cgstAmount || 0) + parseFloat(form.sgstAmount || 0)).toFixed(2)}
                  </td>
                </tr>
                {/* TDS Deduction Row */}
                <tr>
                  <td colSpan="6" style={{ textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>TDS Deduction:</td>
                  <td><input type="number" className="inv-doc-input" style={{ textAlign: 'right', color: '#ef4444', fontWeight: 'bold' }} value={form.tdsAmount} onChange={e => setForm(f => ({ ...f, tdsAmount: e.target.value }))} /></td>
                </tr>
              </tbody>
            </table>

            {/* Footer Details */}
            <div className="invoice-footer">
              <div className="invoice-footer-left">
                <div>
                  <div style={{ fontSize: '10px', color: '#4b5563' }}>Amount Chargeable (in words)</div>
                  <div style={{ fontWeight: 'bold', fontStyle: 'italic' }}>
                    INR {totalAmount > 0 ? (totalAmount).toLocaleString('en-IN') : 'ZERO'} ONLY.
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: '0 0 100px' }}>Company&apos;s PAN:</span>
                    <input type="text" className="inv-doc-input" style={{ flex: '0 0 120px', width: 120, maxWidth: '55%', fontWeight: 'bold', textTransform: 'uppercase' }} value={form.companyPan} onChange={e => setForm(f => ({ ...f, companyPan: e.target.value.toUpperCase() }))} placeholder="PAN No" />
                  </div>
                  <div style={{ textDecoration: 'underline', marginTop: '4px' }}>Declaration</div>
                  <div className="invoice-declaration" style={{ fontSize: '10px', fontStyle: 'italic' }}>
                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                  </div>
                </div>
              </div>

              <div className="invoice-footer-right">
                <div style={{ textDecoration: 'underline' }}>Company&apos;s Bank Details</div>
                <table className="invoice-bank-table" style={{ marginTop: '4px' }}>
                  <tbody>
                    <tr>
                      <td className="invoice-bank-label">Bank Name</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>:</span>
                          <input type="text" className="inv-doc-input" style={{ flex: 1, minWidth: 0 }} value={form.companyBankName} onChange={e => setForm(f => ({ ...f, companyBankName: e.target.value }))} placeholder="Bank Name" />
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="invoice-bank-label">A/C NO.</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>:</span>
                          <input type="text" className="inv-doc-input" style={{ flex: 1, minWidth: 0 }} value={form.companyBankAccount} onChange={e => setForm(f => ({ ...f, companyBankAccount: e.target.value }))} placeholder="Account No" />
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="invoice-bank-label">IFS Code</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>:</span>
                          <input type="text" className="inv-doc-input" style={{ flex: 1, minWidth: 0, textTransform: 'uppercase' }} value={form.companyBankIfsc} onChange={e => setForm(f => ({ ...f, companyBankIfsc: e.target.value.toUpperCase() }))} placeholder="IFSC Code" />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="invoice-signature">
                  <div style={{ fontWeight: 'bold' }}>for {showBillForm.supplierName}</div>
                  <div style={{ height: '40px' }}></div>
                  <div>Authorised Signatory</div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}