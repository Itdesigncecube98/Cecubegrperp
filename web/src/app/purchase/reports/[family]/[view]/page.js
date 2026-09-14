'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Download, Filter, RefreshCw } from 'lucide-react';

const REPORTS = {
  supplier: {
    supplier: ['Supplier', 'Supplier register and contact details'],
    'short-supplier': ['Short Supplier', 'Shortlisted supplier comparison'],
    summary: ['Supplier Summary', 'Supplier-wise purchase summary'],
    rating: ['Supplier Rating', 'Supplier performance and rating'],
    'po-analysis': ['PO Analysis', 'Purchase order value and status analysis'],
    'supplier-wise-transaction': ['Supplier Wise Transaction', 'Transactions grouped by supplier'],
    'supplier-wise-po': ['Supplier Wise PO', 'Purchase orders grouped by supplier']
  },
  payment: {
    summary: ['Summary', 'Payment summary by status'],
    details: ['Details', 'Detailed payment and invoice records'],
    'date-tracking': ['Date Tracking', 'Payments tracked by invoice and due date'],
    ageing: ['Ageing', 'Outstanding payments by ageing bucket']
  }
};

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const date = value => value ? new Date(value).toLocaleDateString('en-IN') : '-';
const initialFilters = { from: '', to: '', vendorId: '' };

export default function PurchaseReportPage({ params }) {
  const [family, setFamily] = useState('supplier');
  const [view, setView] = useState('supplier');
  const [data, setData] = useState({ rows: [], vendors: [] });
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.resolve(params).then(value => {
      setFamily(value.family);
      setView(value.view);
    });
  }, [params]);

  const report = REPORTS[family]?.[view] || REPORTS.supplier.supplier;

  const loadReport = async () => {
    setLoading(true);
    const query = new URLSearchParams({ family, view, ...initialFilters });
    const response = await fetch(`/api/purchase/reports?${query}`);
    if (response.ok) setData(await response.json());
    setLoading(false);
  };

  useEffect(() => {
    if (!family || !view) return;
    let cancelled = false;
    const query = new URLSearchParams({ family, view, ...initialFilters });
    fetch(`/api/purchase/reports?${query}`)
      .then(response => response.ok ? response.json() : { rows: [], vendors: [] })
      .then(result => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [family, view]);

  const isPayment = family === 'payment';
  const columns = isPayment
    ? [['invoiceNo', 'Invoice No'], ['date', 'Invoice Date'], ['vendor', 'Supplier'], ['poNo', 'PO No'], ['dueDate', 'Due Date'], ['amount', 'Amount'], ['status', 'Status']]
    : view === 'po-analysis' || view === 'supplier-wise-po'
      ? [['poNo', 'PO No'], ['date', 'PO Date'], ['vendor', 'Supplier'], ['project', 'Project / Site'], ['value', 'PO Value'], ['status', 'Status']]
      : [['vendorCode', 'Code'], ['vendor', 'Supplier'], ['contact', 'Contact Person'], ['phone', 'Phone'], ['rating', 'Rating'], ['poCount', 'POs'], ['value', 'Purchase Value'], ['status', 'Status']];

  const displayValue = (key, value) => key.toLowerCase().includes('date') ? date(value) : ['amount', 'value'].includes(key) ? money(value) : value ?? '-';

  return (
    <div className="pur-page-container">
      <div className="pur-header">
        <div>
          <div className="pur-flex pur-items-center pur-gap-2 pur-text-sm pur-text-muted"><Link href="/purchase/dashboard">Purchase Dashboard</Link><ChevronRight size={14} /><span>Reports</span></div>
          <h1 className="pur-title" style={{ marginTop: '10px' }}>{report[0]}</h1>
          <p className="pur-subtitle">{report[1]}</p>
        </div>
        <button type="button" className="pur-btn pur-btn-outline" onClick={() => window.print()}><Download size={15} /> Export / Print</button>
      </div>

      <div className="pur-card" style={{ padding: '18px 20px' }}>
        <div className="pur-flex pur-items-center pur-gap-2" style={{ flexWrap: 'wrap' }}>
          <Filter size={17} color="#f59e0b" />
          <select className="pur-select" value={filters.vendorId} onChange={event => setFilters({ ...filters, vendorId: event.target.value })} aria-label="Supplier">
            <option value="">All suppliers</option>{data.vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
          </select>
          <input className="pur-input" type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} aria-label="From date" />
          <input className="pur-input" type="date" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} aria-label="To date" />
          <button type="button" className="pur-btn pur-btn-primary" style={{ backgroundColor: '#f59e0b' }} onClick={loadReport}><RefreshCw size={15} /> Apply Filters</button>
        </div>
      </div>

      <div className="pur-card">
        <div className="pur-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}><h2 className="pur-card-title">{report[0]} Report</h2><span className="pur-badge pur-badge-amber">{data.rows.length} records</span></div>
        <div className="pur-table-wrapper">
          <table className="pur-table"><thead><tr>{columns.map(([, label]) => <th key={label}>{label}</th>)}</tr></thead><tbody>
            {loading ? <tr><td colSpan={columns.length} className="pur-text-center pur-py-8">Loading report...</td></tr> : data.rows.length === 0 ? <tr><td colSpan={columns.length} className="pur-text-center pur-text-muted pur-py-8">No records found for the selected filters.</td></tr> : data.rows.map(row => <tr key={row.id}>{columns.map(([key]) => <td key={key}>{displayValue(key, row[key])}</td>)}</tr>)}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}
