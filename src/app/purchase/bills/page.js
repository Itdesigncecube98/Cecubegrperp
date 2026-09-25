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
    // Calculate taxable and tax from PO totalAmount (assuming 18% GST split equally)
    const total = po.totalAmount || 0;
    const taxable = total / 1.18; // Reverse calculate taxable
    const totalTax = total - taxable;
    const cgst = totalTax / 2;
    const sgst = totalTax / 2;
    
    setForm({
      billDate: new Date().toISOString().split('T')[0],
      vendorInvoiceNo: '',
      taxableAmount: taxable.toFixed(2),
      cgstAmount: cgst.toFixed(2),
      sgstAmount: sgst.toFixed(2),
      cartageCharges: '0',
      roundOff: '0',
      tdsAmount: '0',
      companyPan: '',
      companyBankName: '',
      companyBankAccount: '',
      companyBankIfsc: '',
      remarks: `Bill for PO ${po.poNumber} — ${po.supplierName}`,
      // New editable fields
      vendorName: po.supplierName || '',
      vendorAddress: po.supplierAddress || '',
      vendorGstin: po.supplierGstin || '',
      buyerName: 'CECUBE ENGINEERING INDIA PRIVATE LIMITED',
      buyerAddress: 'A-121&A-122, NEW PALAM VIHAR, Near St. Soldier School\nState : 06Gurugram, Haryana,',
      buyerGstin: '06AAJCC2203M1ZT',
      buyerPan: 'AAJCC2203M',
      shippedTo: 'GLOBAL BUSINESS PARK\nTOWER-A&B MG ROAD\nGURUGRAM HR 122001'
    });
    setErrorMsg('');
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
                    <th style={{ textAlign: 'right' }}>Taxable</th>
                    <th style={{ textAlign: 'right' }}>CGST</th>
                    <th style={{ textAlign: 'right' }}>SGST</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
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
            
            .inv-table { width: 100%; border-collapse: collapse; }
            .inv-table th, .inv-table td { border: 1px solid #000; padding: 4px; vertical-align: top; }
            .inv-table th { font-weight: bold; text-align: center; font-size: 11px; }
            
            @media print {
              body * { visibility: hidden; }
              #invoice-document, #invoice-document * { visibility: visible; }
              #invoice-document { position: absolute; left: 0; top: 0; box-shadow: none !important; margin: 0 !important; width: 210mm !important; }
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
              <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Print</button>
              <button onClick={submitBill} disabled={submitting || !form.billDate || !form.taxableAmount} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {submitting ? 'Saving...' : 'Save Bill'} <Send size={14} />
              </button>
            </div>
          </div>

          {/* Document Frame */}
          <div id="invoice-document" style={{ background: '#fff', width: '210mm', minHeight: '297mm', padding: '10mm', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'Arial, sans-serif', color: '#000', fontSize: '11px', position: 'relative' }}>
            
            <div style={{ position: 'absolute', top: '10mm', right: '10mm' }}>
              <img src="/logo.png" alt="CeCube Logo" style={{ width: '70px', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
            </div>

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>GST INVOICE</div>
            <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>Original for Buyer</div>

            <div style={{ border: '1px solid #000', display: 'flex' }}>
              
              {/* Left Column: Vendor & Buyer */}
              <div style={{ width: '50%', borderRight: '1px solid #000' }}>
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
              <div style={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                  <div style={{ width: '50%', borderRight: '1px solid #000', padding: '4px' }}>
                    <div style={{ fontSize: '9px' }}>Invoice No.</div>
                    <input type="text" className="inv-doc-input" style={{ fontWeight: 'bold' }} value={form.vendorInvoiceNo} onChange={e => setForm(f => ({ ...f, vendorInvoiceNo: e.target.value }))} placeholder="Inv No." />
                  </div>
                  <div style={{ width: '50%', padding: '4px' }}>
                    <div style={{ fontSize: '9px' }}>Date</div>
                    <input type="date" className="inv-doc-input" style={{ fontWeight: 'bold' }} value={form.billDate} onChange={e => setForm(f => ({ ...f, billDate: e.target.value }))} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                  <div style={{ width: '50%', borderRight: '1px solid #000', padding: '4px' }}>
                    <div style={{ fontSize: '9px' }}>Delivery Note</div>
                    <input type="text" className="inv-doc-input" placeholder="-" />
                  </div>
                  <div style={{ width: '50%', padding: '4px' }}>
                    <div style={{ fontSize: '9px' }}>Terms Of Payment</div>
                    <input type="text" className="inv-doc-input" placeholder="-" />
                  </div>
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                  <div style={{ width: '50%', borderRight: '1px solid #000', padding: '4px' }}>
                    <div style={{ fontSize: '9px' }}>Buyer Order No (PO)</div>
                    <div style={{ fontWeight: 'bold', padding: '2px 4px' }}>{showBillForm.poNumber}</div>
                  </div>
                  <div style={{ width: '50%', padding: '4px' }}>
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
                  <th style={{ width: '30px', borderTop: 'none' }}>Sl</th>
                  <th style={{ borderTop: 'none' }}>Description of Goods</th>
                  <th style={{ width: '60px', borderTop: 'none' }}>HSN/SAC</th>
                  <th style={{ width: '60px', borderTop: 'none' }}>Quantity</th>
                  <th style={{ width: '60px', borderTop: 'none' }}>Rate</th>
                  <th style={{ width: '50px', borderTop: 'none' }}>Gst%</th>
                  <th style={{ width: '80px', borderTop: 'none' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(showBillForm.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', borderBottom: 'none', borderTop: 'none' }}>{idx + 1}</td>
                    <td style={{ borderBottom: 'none', borderTop: 'none', fontWeight: 'bold' }}>{item.description}</td>
                    <td style={{ textAlign: 'center', borderBottom: 'none', borderTop: 'none' }}>{item.hsnCode || '—'}</td>
                    <td style={{ textAlign: 'right', borderBottom: 'none', borderTop: 'none' }}>{item.quantity} {item.unit}</td>
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
            <div style={{ display: 'flex', border: '1px solid #000', borderTop: 'none', minHeight: '120px' }}>
              
              <div style={{ width: '60%', padding: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#4b5563' }}>Amount Chargeable (in words)</div>
                  <div style={{ fontWeight: 'bold', fontStyle: 'italic' }}>
                    INR {totalAmount > 0 ? (totalAmount).toLocaleString('en-IN') : 'ZERO'} ONLY.
                  </div>
                </div>
                
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: '100px' }}>Company's PAN:</span>
                    <input type="text" className="inv-doc-input" style={{ fontWeight: 'bold', width: '200px', textTransform: 'uppercase' }} value={form.companyPan} onChange={e => setForm(f => ({ ...f, companyPan: e.target.value.toUpperCase() }))} placeholder="PAN No" />
                  </div>
                  <div style={{ textDecoration: 'underline', marginTop: '4px' }}>Declaration</div>
                  <div style={{ fontSize: '10px', fontStyle: 'italic' }}>
                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                  </div>
                </div>
              </div>

              <div style={{ width: '40%', padding: '4px', borderLeft: '1px solid #000', display: 'flex', flexDirection: 'column' }}>
                <div style={{ textDecoration: 'underline' }}>Company's Bank Details</div>
                <table style={{ width: '100%', fontSize: '11px', marginTop: '4px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '70px' }}>Bank Name</td>
                      <td>: <input type="text" className="inv-doc-input" style={{ display: 'inline', width: 'auto' }} value={form.companyBankName} onChange={e => setForm(f => ({ ...f, companyBankName: e.target.value }))} placeholder="Bank Name" /></td>
                    </tr>
                    <tr>
                      <td>A/C NO.</td>
                      <td>: <input type="text" className="inv-doc-input" style={{ display: 'inline', width: 'auto' }} value={form.companyBankAccount} onChange={e => setForm(f => ({ ...f, companyBankAccount: e.target.value }))} placeholder="Account No" /></td>
                    </tr>
                    <tr>
                      <td>IFS Code</td>
                      <td>: <input type="text" className="inv-doc-input" style={{ display: 'inline', width: 'auto', textTransform: 'uppercase' }} value={form.companyBankIfsc} onChange={e => setForm(f => ({ ...f, companyBankIfsc: e.target.value.toUpperCase() }))} placeholder="IFSC Code" /></td>
                    </tr>
                  </tbody>
                </table>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end', marginTop: '20px', textAlign: 'center' }}>
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
