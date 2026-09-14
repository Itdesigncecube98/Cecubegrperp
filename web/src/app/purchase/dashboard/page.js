'use client';
import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, FileText, CheckCircle, Clock, 
  AlertCircle, Truck, Package, IndianRupee,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

export default function PurchaseDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/purchase/dashboard');
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

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
          <Link href="/purchase/po/create" className="pur-btn pur-btn-primary" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
            + Create PO
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

      <div className="pur-card pur-mt-6">
        <div className="pur-card-header" style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 className="pur-card-title pur-flex pur-items-center pur-gap-2">
            <BarChart3 size={20} className="pur-text-amber-600" /> Reports &amp; Analytics
          </h2>
          <p className="pur-subtitle" style={{ marginTop: '6px' }}>Supplier performance, purchase orders, and payment tracking</p>
        </div>
        <div className="pur-grid-4" style={{ padding: '24px' }}>
          {[
            { title: 'Supplier Reports', description: 'Supplier list, summary, rating, PO analysis, and supplier-wise reports.', href: '/purchase/reports/supplier', color: '#f59e0b' },
            { title: 'Payment Summary', description: 'Review payment status and outstanding purchase liabilities.', href: '/purchase/reports/payment-summary', color: '#0ea5e9' },
            { title: 'Payment Details', description: 'Open detailed payment transactions and invoice records.', href: '/purchase/reports/payment-details', color: '#10b981' },
            { title: 'Payment Ageing', description: 'Track overdue payments by ageing buckets and due dates.', href: '/purchase/reports/payment-ageing', color: '#ef4444' },
          ].map((report) => (
            <Link key={report.href} href={report.href} className="pur-card" style={{ padding: '18px', textDecoration: 'none', borderTop: `3px solid ${report.color}` }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '15px' }}>{report.title}</h3>
              <p className="pur-text-sm pur-text-muted" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>{report.description}</p>
              <span style={{ display: 'inline-block', marginTop: '14px', color: report.color, fontSize: '12px', fontWeight: 700 }}>Open report &rarr;</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
