'use client';
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Landmark, ArrowUpRight, ArrowDownRight, 
  Wallet, PieChart, FileText, Receipt, BarChart2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

export default function AccountsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/accounts/dashboard');
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
    if (val === undefined || val === null) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="acc-page-container">
        <div className="acc-loading"><div className="acc-spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="acc-page-container">
      <div className="acc-header">
        <div>
          <h1 className="acc-title">Financial Dashboard</h1>
          <p className="acc-subtitle">Real-time overview of company financials</p>
        </div>
      </div>

      <div className="acc-grid-4">
        {/* Row 1: Liquidity */}
        <div className="acc-card acc-kpi-card">
          <div className="acc-kpi-icon" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
            <Landmark size={24} />
          </div>
          <div className="acc-kpi-info">
            <p className="acc-kpi-label">Bank Balance</p>
            <h3 className="acc-kpi-value">{formatCurrency(data?.bankBalance)}</h3>
          </div>
        </div>
        
        <div className="acc-card acc-kpi-card">
          <div className="acc-kpi-icon" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
            <Wallet size={24} />
          </div>
          <div className="acc-kpi-info">
            <p className="acc-kpi-label">Cash Balance</p>
            <h3 className="acc-kpi-value">{formatCurrency(data?.cashBalance)}</h3>
          </div>
        </div>

        {/* Row 2: Outstanding */}
        <div className="acc-card acc-kpi-card">
          <div className="acc-kpi-icon" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
            <ArrowDownRight size={24} />
          </div>
          <div className="acc-kpi-info">
            <p className="acc-kpi-label">Total Receivable (AR)</p>
            <h3 className="acc-kpi-value">{formatCurrency(data?.receivable)}</h3>
          </div>
        </div>

        <div className="acc-card acc-kpi-card">
          <div className="acc-kpi-icon" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
            <ArrowUpRight size={24} />
          </div>
          <div className="acc-kpi-info">
            <p className="acc-kpi-label">Total Payable (AP)</p>
            <h3 className="acc-kpi-value">{formatCurrency(data?.payable)}</h3>
          </div>
        </div>
      </div>

      <div className="acc-grid-4" style={{ marginTop: '24px' }}>
        {/* Row 3: P&L & Statutory */}
        <div className="acc-card acc-kpi-card">
          <div className="acc-kpi-icon" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>
            <PieChart size={24} />
          </div>
          <div className="acc-kpi-info">
            <p className="acc-kpi-label">Monthly Revenue</p>
            <h3 className="acc-kpi-value">{formatCurrency(data?.revenueMonthly)}</h3>
          </div>
        </div>

        <div className="acc-card acc-kpi-card">
          <div className="acc-kpi-icon" style={{ backgroundColor: '#fff7ed', color: '#c2410c' }}>
            <Receipt size={24} />
          </div>
          <div className="acc-kpi-info">
            <p className="acc-kpi-label">Monthly Expense</p>
            <h3 className="acc-kpi-value">{formatCurrency(data?.expenseMonthly)}</h3>
          </div>
        </div>

        <div className="acc-card acc-kpi-card">
          <div className="acc-kpi-icon" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
            <FileText size={24} />
          </div>
          <div className="acc-kpi-info">
            <p className="acc-kpi-label">GST Payable</p>
            <h3 className="acc-kpi-value">{formatCurrency(data?.gstPayable)}</h3>
          </div>
        </div>

        <div className="acc-card acc-kpi-card">
          <div className="acc-kpi-icon" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
            <FileText size={24} />
          </div>
          <div className="acc-kpi-info">
            <p className="acc-kpi-label">TDS Payable</p>
            <h3 className="acc-kpi-value">{formatCurrency(data?.tdsPayable)}</h3>
          </div>
        </div>
      </div>

      <div className="acc-grid-2" style={{ marginTop: '24px' }}>
        <div className="acc-card">
          <div className="acc-card-header" style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 className="acc-card-title acc-flex acc-items-center acc-gap-2">
              <BarChart2 size={18} className="acc-text-blue-600" /> Cash Flow Trend (In Lakhs)
            </h3>
          </div>
          <div style={{ height: '300px', padding: '20px' }}>
            {data?.cashFlowData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.cashFlowData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{fill: '#64748b'}} />
                  <YAxis tick={{fill: '#64748b'}} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0'}} />
                  <Legend />
                  <Line type="monotone" name="Inflow" dataKey="in" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
                  <Line type="monotone" name="Outflow" dataKey="out" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        <div className="acc-card">
          <div className="acc-card-header" style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 className="acc-card-title acc-flex acc-items-center acc-gap-2">
              <DollarSign size={18} className="acc-text-blue-600" /> Action Items
            </h3>
          </div>
          <div className="acc-card-body" style={{ padding: '0' }}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              <li style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="acc-font-medium">Pending Vendor Payments</div>
                  <div className="acc-text-xs acc-text-muted">Invoices due within next 7 days</div>
                </div>
                <span className="acc-badge acc-badge-amber">12 Invoices</span>
              </li>
              <li style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="acc-font-medium">Unreconciled Bank Entries</div>
                  <div className="acc-text-xs acc-text-muted">HDFC Current A/c</div>
                </div>
                <span className="acc-badge acc-badge-red">5 Entries</span>
              </li>
              <li style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="acc-font-medium">Overdue Receivables</div>
                  <div className="acc-text-xs acc-text-muted">Aging &gt; 60 days</div>
                </div>
                <span className="acc-badge acc-badge-slate">3 Clients</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
