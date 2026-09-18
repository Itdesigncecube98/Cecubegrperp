'use client';
import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, FileText, CheckCircle, Clock, 
  AlertCircle, Truck, Package, IndianRupee,
  BarChart3, Send, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import Link from 'next/link';

export default function PurchaseDashboard() {
  const [data, setData] = useState(null);
  const [approvedPOs, setApprovedPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBillForm, setShowBillForm] = useState(null);
  
  const [form, setForm] = useState({
    billDate: new Date().toISOString().split('T')[0],
    grossAmount: '',
    tdsAmount: '0',
    vendorInvoiceNo: '',
    remarks: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = async () => {
    try {
      const [res, posRes] = await Promise.all([
        fetch('/api/purchase/dashboard'),
        fetch('/api/purchase/po?status=APPROVED')
      ]);
      if (res.ok) setData(await res.json());
      if (posRes.ok) setApprovedPOs(await posRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        setTimeout(() => setSuccessMsg(''), 5000);
        setShowBillForm(null);
        fetchData();
      } else {
        setErrorMsg(data.error || 'Failed to create bill');
      }
    } catch { setErrorMsg('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const gross = parseFloat(form.grossAmount) || 0;
  const tds   = parseFloat(form.tdsAmount) || 0;
  const net   = gross - tds;

  if (loading) {
    return (
      <div className="pur-page-container">
        <div className="pur-loading"><div className="pur-spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="pur-page-container">
      <div className="pur-header">
        <div>
          <h1 className="pur-title">Purchase Dashboard</h1>
          <p className="pur-subtitle">Overview of procurement and supply chain activities</p>
        </div>
        <div className="pur-flex" style={{ gap: '12px' }}>
          <Link href="/purchase/pr/create" className="pur-btn pur-btn-outline">
            + New PR
          </Link>
          <Link href="/purchase/po/create" className="pur-btn pur-btn-outline" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>
            + Create PO
          </Link>
          <Link href="/purchase/bills" className="pur-btn pur-btn-primary" style={{ backgroundColor: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🧾 Purchase Bills
          </Link>
        </div>
      </div>

      <div className="pur-grid-4">
        <div className="pur-card pur-kpi-card">
          <div className="pur-kpi-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <FileText size={24} />
          </div>
          <div className="pur-kpi-info">
            <p className="pur-kpi-label">Pending PRs</p>
            <h3 className="pur-kpi-value">{data?.pendingPrs || 0}</h3>
          </div>
        </div>
        
        <div className="pur-card pur-kpi-card">
          <div className="pur-kpi-icon" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
            <ShoppingCart size={24} />
          </div>
          <div className="pur-kpi-info">
            <p className="pur-kpi-label">Open POs</p>
            <h3 className="pur-kpi-value">{data?.openPos || 0}</h3>
          </div>
        </div>
        
        <div className="pur-card pur-kpi-card">
          <div className="pur-kpi-icon" style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
            <IndianRupee size={24} />
          </div>
          <div className="pur-kpi-info">
            <p className="pur-kpi-label">Total PO Value</p>
            <h3 className="pur-kpi-value">{formatCurrency(data?.totalPoValue)}</h3>
          </div>
        </div>

        <div className="pur-card pur-kpi-card">
          <div className="pur-kpi-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
            <Truck size={24} />
          </div>
          <div className="pur-kpi-info">
            <p className="pur-kpi-label">Pending Delivery / GRN</p>
            <h3 className="pur-kpi-value">{data?.pendingGrns || 0}</h3>
          </div>
        </div>
      </div>

      <div className="pur-card pur-mt-6">
        <div className="pur-card-header" style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="pur-card-title pur-flex pur-items-center pur-gap-2"><BarChart3 size={20} className="pur-text-amber-600" /> Recent Purchase Indents</h2>
          <Link href="/purchase/pr" className="pur-btn pur-btn-outline">View All</Link>
        </div>
        
        <div className="pur-table-wrapper">
          <table className="pur-table">
            <thead>
              <tr>
                <th>PR No</th>
                <th>Project / Site</th>
                <th>Requested By</th>
                <th>Required Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentPrs?.map(pr => (
                <tr key={pr.id}>
                  <td className="pur-font-semibold">{pr.prNo}</td>
                  <td>
                    <div className="pur-font-medium">{pr.project || '-'}</div>
                    <div className="pur-text-xs pur-text-muted">{pr.site || '-'}</div>
                  </td>
                  <td>{pr.requestedBy?.name || '-'}</td>
                  <td>{pr.requiredDate ? new Date(pr.requiredDate).toLocaleDateString() : '-'}</td>
                  <td>
                    <span className={`pur-badge ${pr.status === 'Approved' ? 'pur-badge-emerald' : 'pur-badge-amber'}`}>
                      {pr.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!data?.recentPrs || data.recentPrs.length === 0) && (
                <tr>
                  <td colSpan="5" className="pur-text-center pur-text-muted pur-py-8">No recent PRs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success message */}
      {successMsg && (
        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '12px 16px', color: '#047857', fontSize: '14px', fontWeight: 500, marginTop: '24px' }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Pending Purchase Bills */}
      <div className="pur-card pur-mt-6">
        <div className="pur-card-header" style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="pur-card-title pur-flex pur-items-center pur-gap-2"><FileText size={20} className="pur-text-emerald-600" /> Pending Purchase Bills (Approved POs)</h2>
          <Link href="/purchase/bills" className="pur-btn pur-btn-outline">View All</Link>
        </div>
        
        <div className="pur-table-wrapper">
          <table className="pur-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Total Amount</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {approvedPOs.slice(0, 5).map(po => (
                <tr key={po.id}>
                  <td className="pur-font-semibold">{po.poNumber}</td>
                  <td className="pur-font-medium">{po.supplierName}</td>
                  <td>{new Date(po.poDate).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>₹{fmt(po.totalAmount)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="pur-badge pur-badge-emerald">Approved</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="pur-btn pur-btn-primary"
                      style={{ fontSize: '12px', padding: '6px 12px', gap: '6px', background: '#6366f1' }}
                      onClick={() => openBillForm(po)}
                    >
                      Generate Bill
                    </button>
                  </td>
                </tr>
              ))}
              {(!approvedPOs || approvedPOs.length === 0) && (
                <tr>
                  <td colSpan="6" className="pur-text-center pur-text-muted pur-py-8">No pending purchase bills found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pur-card pur-mt-6">
        <div className="pur-card-header" style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 className="pur-card-title pur-flex pur-items-center pur-gap-2">
            <BarChart3 size={20} className="pur-text-amber-600" /> Reports &amp; Analytics
          </h2>
          <p className="pur-subtitle" style={{ marginTop: '6px' }}>Supplier performance, purchase orders, and payment tracking</p>
        </div>
        <div className="pur-grid-4" style={{ padding: '24px' }}>
          {[
            { title: 'Supplier Reports', description: 'Supplier list, summary, rating, PO analysis, and supplier-wise reports.', href: '/purchase/reports/supplier/supplier', color: '#f59e0b' },
            { title: 'Payment Summary', description: 'Review payment status and outstanding purchase liabilities.', href: '/purchase/reports/payment/summary', color: '#0ea5e9' },
            { title: 'Payment Details', description: 'Open detailed payment transactions and invoice records.', href: '/purchase/reports/payment/details', color: '#10b981' },
            { title: 'Payment Ageing', description: 'Track overdue payments by ageing buckets and due dates.', href: '/purchase/reports/payment/ageing', color: '#ef4444' },
          ].map((report) => (
            <Link key={report.href} href={report.href} className="pur-card" style={{ padding: '18px', textDecoration: 'none', borderTop: `3px solid ${report.color}` }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '15px' }}>{report.title}</h3>
              <p className="pur-text-sm pur-text-muted" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>{report.description}</p>
              <span style={{ display: 'inline-block', marginTop: '14px', color: report.color, fontSize: '12px', fontWeight: 700 }}>Open report &rarr;</span>
            </Link>
          ))}
        </div>
      </div>

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
