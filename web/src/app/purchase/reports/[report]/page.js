'use client';

import Link from 'next/link';
import { BarChart3, ChevronRight, Download, Filter } from 'lucide-react';

const REPORTS = {
  supplier: {
    title: 'Supplier Reports',
    description: 'Supplier and purchase-order analysis',
    items: [
      ['Supplier', 'Supplier register and status overview'],
      ['Short Supplier', 'Shortlisted supplier comparison'],
      ['Supplier Summary', 'Supplier-wise purchase summary'],
      ['Supplier Rating', 'Supplier performance and rating'],
      ['PO Analysis', 'Purchase order value and status analysis'],
      ['Supplier Wise Transaction', 'Transactions grouped by supplier'],
      ['Supplier Wise PO', 'Purchase orders grouped by supplier'],
    ]
  },
  'payment-summary': {
    title: 'Payment Details',
    description: 'Payment tracking and outstanding analysis',
    items: [
      ['Summary', 'Payment summary by status'],
      ['Details', 'Detailed payment and invoice records'],
      ['Date Tracking', 'Payments tracked by due and payment date'],
      ['Ageing', 'Outstanding payments by ageing bucket'],
    ]
  },
  'payment-details': {
    title: 'Payment Details',
    description: 'Detailed payment and invoice records',
    items: [['Details', 'Detailed payment and invoice records']]
  },
  'payment-ageing': {
    title: 'Payment Ageing',
    description: 'Outstanding payments by ageing bucket',
    items: [['Ageing', 'Outstanding payments by ageing bucket']]
  }
};

export default function PurchaseReportPage({ params }) {
  const report = REPORTS[params.report] || REPORTS.supplier;

  return (
    <div className="pur-page-container">
      <div className="pur-header">
        <div>
          <div className="pur-flex pur-items-center pur-gap-2 pur-text-sm pur-text-muted">
            <Link href="/purchase/dashboard">Purchase Dashboard</Link>
            <ChevronRight size={14} />
            <span>Reports</span>
          </div>
          <h1 className="pur-title" style={{ marginTop: '10px' }}>{report.title}</h1>
          <p className="pur-subtitle">{report.description}</p>
        </div>
        <button type="button" className="pur-btn pur-btn-outline"><Download size={15} /> Export</button>
      </div>

      <div className="pur-card" style={{ padding: '18px 20px', marginBottom: '24px' }}>
        <div className="pur-flex pur-items-center pur-gap-2" style={{ flexWrap: 'wrap' }}>
          <Filter size={17} color="#f59e0b" />
          <select className="purchase-input" defaultValue="all" aria-label="Report scope">
            <option value="all">All suppliers</option>
          </select>
          <input className="purchase-input" type="date" aria-label="From date" />
          <input className="purchase-input" type="date" aria-label="To date" />
          <button type="button" className="pur-btn pur-btn-primary" style={{ backgroundColor: '#f59e0b' }}>Apply Filters</button>
        </div>
      </div>

      <div className="pur-grid-4" style={{ marginBottom: '24px' }}>
        {report.items.map(([title, description]) => (
          <div key={title} className="pur-card" style={{ padding: '18px', borderTop: '3px solid #f59e0b' }}>
            <div className="pur-flex pur-items-center pur-gap-2">
              <BarChart3 size={18} color="#f59e0b" />
              <h2 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>{title}</h2>
            </div>
            <p className="pur-text-sm pur-text-muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>{description}</p>
          </div>
        ))}
      </div>

      <div className="pur-card">
        <div className="pur-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 className="pur-card-title">{report.title} Register</h2>
        </div>
        <div className="pur-table-wrapper">
          <table className="pur-table">
            <thead><tr><th>Report</th><th>Description</th><th>Status</th></tr></thead>
            <tbody>
              {report.items.map(([title, description]) => (
                <tr key={title}><td className="pur-font-semibold">{title}</td><td>{description}</td><td><span className="pur-badge pur-badge-amber">Ready</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}