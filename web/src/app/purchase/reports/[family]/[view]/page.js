'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ChevronRight, Download, Filter, RefreshCw } from 'lucide-react';

const REPORTS = {
  supplier: {
    summary: {
      title: 'Supplier Summary',
      description: 'Purchase orders, supplier bills, payments, and outstanding balances by supplier.',
      columns: [['vendorCode', 'Code'], ['vendor', 'Supplier'], ['poCount', 'Purchase Orders'], ['poValue', 'PO Value'], ['billCount', 'Supplier Bills'], ['billedValue', 'Net Billed'], ['paidValue', 'Paid'], ['outstanding', 'Outstanding'], ['status', 'Status']]
    },
    'po-analysis': {
      title: 'PO Analysis',
      description: 'Purchase order values, suppliers, projects, and current status.',
      columns: [['poNo', 'PO No'], ['date', 'PO Date'], ['vendor', 'Supplier'], ['project', 'Project / Site'], ['value', 'PO Value'], ['status', 'Status']]
    },
    'supplier-wise-transaction': {
      title: 'Supplier Transactions',
      description: 'Supplier bills with net billed, paid, and outstanding amounts.',
      columns: [['billNo', 'Bill No'], ['date', 'Bill Date'], ['vendor', 'Supplier'], ['vendorCode', 'Code'], ['poNo', 'PO No'], ['value', 'Net Billed'], ['paidValue', 'Paid'], ['outstanding', 'Outstanding'], ['status', 'Bill Status']]
    },
    'supplier-wise-po': {
      title: 'Supplier-wise Purchase Orders',
      description: 'Purchase orders grouped by supplier with project and status details.',
      columns: [['vendor', 'Supplier'], ['vendorCode', 'Code'], ['poNo', 'PO No'], ['date', 'PO Date'], ['project', 'Project / Site'], ['value', 'PO Value'], ['status', 'Status']]
    }
  },
  payment: {
    summary: {
      title: 'Payment Summary',
      description: 'Supplier bills grouped by payment status and outstanding balance.',
      columns: [['status', 'Payment Status'], ['billCount', 'Bills'], ['amount', 'Net Billed'], ['paidAmount', 'Paid'], ['outstanding', 'Outstanding']]
    },
    details: {
      title: 'Payment Details',
      description: 'Bill-level payment status, amount paid, and remaining balance.',
      columns: [['invoiceNo', 'Bill No'], ['date', 'Bill Date'], ['vendor', 'Supplier'], ['poNo', 'PO No'], ['netAmount', 'Net Amount'], ['paidAmount', 'Paid'], ['outstanding', 'Outstanding'], ['paymentDate', 'Voucher Date'], ['status', 'Status']]
    },
    'date-tracking': {
      title: 'Payment Date Tracking',
      description: 'Bill due dates estimated from supplier credit days, with overdue balances.',
      columns: [['invoiceNo', 'Bill No'], ['vendor', 'Supplier'], ['date', 'Bill Date'], ['creditDays', 'Credit Days'], ['dueDate', 'Due Date'], ['daysOverdue', 'Days Overdue'], ['outstanding', 'Outstanding'], ['status', 'Status']]
    },
    ageing: {
      title: 'Payment Ageing',
      description: 'Outstanding supplier bills grouped by overdue age using supplier credit days.',
      columns: [['bucket', 'Ageing Bucket'], ['billCount', 'Bills'], ['amount', 'Outstanding Amount']]
    }
  }
};

const initialData = { rows: [], vendors: [], stats: null };
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const date = value => value ? new Date(value).toLocaleDateString('en-IN') : '-';
const count = value => Number(value || 0).toLocaleString('en-IN');

function displayValue(key, value) {
  if (value === null || value === undefined || value === '') return '-';
  if (['date', 'dueDate', 'paymentDate'].includes(key)) return date(value);
  if (['amount', 'netAmount', 'paidAmount', 'paidValue', 'outstanding', 'poValue', 'billedValue', 'value'].includes(key)) return money(value);
  if (key === 'rating') return Number(value).toFixed(1);
  if (key === 'daysOverdue' && Number(value) === 0) return '-';
  return value;
}

export default function PurchaseReportPage() {
  const { family = 'supplier', view = 'summary' } = useParams();
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState({ from: '', to: '', vendorId: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const report = REPORTS[family]?.[view] ?? REPORTS.supplier.summary;
  const currentView = REPORTS[family]?.[view] ? view : 'summary';

  const buildReportUrl = useCallback((activeFilters) => {
    const query = new URLSearchParams({ family, view: currentView });
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    return `/api/purchase/reports?${query}`;
  }, [family, currentView]);

  useEffect(() => {
    if (!REPORTS[family]?.[view]) {
      router.replace(family === 'supplier' ? '/purchase/reports/supplier/summary' : '/purchase/dashboard');
      return;
    }

    let active = true;
    fetch(buildReportUrl({ from: '', to: '', vendorId: '' }))
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load report.');
        return result;
      })
      .then(result => {
        if (active) {
          setData(result);
          setError('');
        }
      })
      .catch(loadError => {
        if (active) setError(loadError.message || 'Unable to load report.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [buildReportUrl, family, router, view]);

  const applyFilters = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(buildReportUrl(filters));
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load report.');
      setData(result);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load report.');
      setData(initialData);
    } finally {
      setLoading(false);
    }
  };

  const columns = report?.columns || REPORTS.supplier.summary.columns;
  const stats = data.stats;

  const exportCsv = () => {
    const quote = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [
      columns.map(([, label]) => quote(label)).join(','),
      ...data.rows.map(row => columns.map(([key]) => quote(displayValue(key, row[key]))).join(','))
    ];
    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${family}-${view}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = useMemo(() => {
    if (!stats) return [];
    if (family === 'supplier' && view === 'summary') {
      return [
        ['Suppliers with Activity', count(stats.records)],
        ['Purchase Orders', count(stats.purchaseOrders)],
        ['Purchase Order Value', money(stats.purchaseValue)],
        ['Net Billed', money(stats.billedValue)],
        ['Paid to Suppliers', money(stats.paidValue)],
        ['Outstanding', money(stats.outstanding)]
      ];
    }
    return [
      [family === 'payment' ? 'Supplier Bills' : 'Records', count(stats.records)],
      [family === 'payment' ? 'Bill Gross Amount' : 'Purchase Order Value', money(stats.purchaseValue)],
      ['Supplier Bills Paid', money(stats.paidValue)],
      ['Outstanding balance', money(stats.outstanding)]
    ];
  }, [family, stats, view]);

  if (!report) {
    return <div className="pur-page-container"><p className="pur-text-muted">Redirecting to the available report...</p></div>;
  }

  return (
    <div className="pur-page-container">
      <div className="pur-header">
        <div>
          <div className="pur-flex pur-items-center pur-gap-2 pur-text-sm pur-text-muted">
            <Link href="/purchase/dashboard">Purchase Dashboard</Link><ChevronRight size={14} /><span>Reports</span>
          </div>
          <h1 className="pur-title" style={{ marginTop: '10px' }}>{report.title}</h1>
          <p className="pur-subtitle">{report.description}</p>
        </div>
        <button type="button" className="pur-btn pur-btn-outline" onClick={exportCsv} disabled={loading || data.rows.length === 0}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="pur-card purchase-report-filter-card">
        <div className="purchase-report-filter-grid">
          <Filter className="purchase-report-filter-icon" size={18} color="#f59e0b" aria-hidden="true" />
          <label className="purchase-report-filter-field">
            <span>Supplier</span>
            <select className="pur-select" value={filters.vendorId} onChange={event => setFilters({ ...filters, vendorId: event.target.value })}>
              <option value="">All suppliers</option>
              {data.vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
            </select>
          </label>
          <label className="purchase-report-filter-field">
            <span>From date</span>
            <input className="pur-input" type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} />
          </label>
          <label className="purchase-report-filter-field">
            <span>To date</span>
            <input className="pur-input" type="date" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} />
          </label>
          <button type="button" className="pur-btn pur-btn-primary purchase-report-apply-button" onClick={applyFilters} disabled={loading}>
            <RefreshCw size={15} /> {loading ? 'Loading...' : 'Apply Filters'}
          </button>
        </div>
      </div>

      {error && (
        <div className="pur-card" role="alert" style={{ padding: '14px 18px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={17} /> {error}
        </div>
      )}

      {summaryCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 18 }}>
          {summaryCards.map(([label, value]) => (
            <div className="pur-card" key={label} style={{ padding: '16px 18px' }}>
              <div className="pur-text-muted" style={{ fontSize: 13 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: '#1e293b' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="pur-card">
        <div className="pur-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
          <h2 className="pur-card-title">{report.title}</h2>
          <span className="pur-badge pur-badge-amber">{loading ? 'Loading…' : `${data.rows.length} records`}</span>
        </div>
        <div className="pur-table-wrapper">
          <table className="pur-table">
            <thead><tr>{columns.map(([, label]) => <th key={label}>{label}</th>)}</tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} className="pur-text-center pur-py-8">Loading report data...</td></tr>
              ) : error ? (
                <tr><td colSpan={columns.length} className="pur-text-center pur-text-muted pur-py-8">Report data could not be loaded.</td></tr>
              ) : data.rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="pur-text-center pur-text-muted pur-py-8">No records match the selected filters.</td></tr>
              ) : data.rows.map(row => (
                <tr key={row.id}>{columns.map(([key]) => <td key={key}>{displayValue(key, row[key])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
