'use client';
import { useState, useEffect } from 'react';
import AccountsSidebar from '@/components/AccountsSidebar';
import { RefreshCw } from 'lucide-react';
import '../accounts.css';

const STATUS_STYLES = {
  UNPAID:  { bg: '#fef3c7', text: '#b45309', label: 'Pending Payment', badgeCls: 'acc-badge-amber' },
  PARTIAL: { bg: '#dbeafe', text: '#1d4ed8', label: 'Partially Paid',  badgeCls: 'acc-badge-blue' },
  PAID:    { bg: '#d1fae5', text: '#047857', label: 'Paid',            badgeCls: 'acc-badge-emerald' },
};

export default function PurchaseBillsPage() {
  const [bills, setBills]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('ALL');
  const [counts, setCounts]         = useState({ ALL: 0, UNPAID: 0, PARTIAL: 0, PAID: 0 });
  const [kpis, setKpis]             = useState({ gross: 0, tds: 0, net: 0, paid: 0, outstanding: 0 });

  useEffect(() => { fetchBills(); }, [filter]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const url = filter === 'ALL' ? '/api/accounts/purchase-bills' : `/api/accounts/purchase-bills?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setBills(arr);

      // Compute KPIs
      const allRes = await fetch('/api/accounts/purchase-bills');
      const allData = await allRes.json();
      const all = Array.isArray(allData) ? allData : [];

      const c = { ALL: all.length, UNPAID: 0, PARTIAL: 0, PAID: 0 };
      let gross = 0, tds = 0, net = 0, paid = 0;
      all.forEach(b => {
        c[b.status] = (c[b.status] || 0) + 1;
        gross += Number(b.grossAmount || 0);
        tds   += Number(b.tdsAmount  || 0);
        net   += Number(b.netAmount  || 0);
        paid  += Number(b.paidAmount || 0);
      });
      setCounts(c);
      setKpis({ gross, tds, net, paid, outstanding: net - paid });
    } catch { setBills([]); }
    finally { setLoading(false); }
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const fmtCr = (n) => {
    n = Number(n || 0);
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const TABS = [
    { key: 'ALL',     label: 'All Bills' },
    { key: 'UNPAID',  label: 'Pending Payment' },
    { key: 'PARTIAL', label: 'Partially Paid' },
    { key: 'PAID',    label: 'Paid' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <AccountsSidebar />

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div className="acc-page-container">

          {/* Header */}
          <div className="acc-header">
            <div>
              <h1 className="acc-title">Purchase Bills</h1>
              <p className="acc-subtitle">Track and manage vendor bills sent from the purchase team</p>
            </div>
            <button className="acc-btn acc-btn-outline" onClick={fetchBills}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* KPI Cards */}
          <div className="acc-grid-4" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {[
              { label: 'Total Bills',   val: counts.ALL,              bg: '#e0e7ff', color: '#4338ca', icon: '🧾', isCount: true },
              { label: 'Gross Amount',  val: fmtCr(kpis.gross),       bg: '#fef3c7', color: '#b45309', icon: '💼' },
              { label: 'TDS',           val: fmtCr(kpis.tds),         bg: '#fee2e2', color: '#b91c1c', icon: '🏛' },
              { label: 'Net Payable',   val: fmtCr(kpis.net),         bg: '#d1fae5', color: '#047857', icon: '💰' },
              { label: 'Outstanding',   val: fmtCr(kpis.outstanding),  bg: '#fce7f3', color: '#be185d', icon: '⚠️' },
            ].map(k => (
              <div key={k.label} className="acc-card acc-kpi-card" style={{ padding: '18px 20px' }}>
                <div className="acc-kpi-icon" style={{ background: k.bg, color: k.color, fontSize: '20px', width: '42px', height: '42px' }}>{k.icon}</div>
                <div className="acc-kpi-info">
                  <p className="acc-kpi-label" style={{ fontSize: '12px' }}>{k.label}</p>
                  <h3 className="acc-kpi-value" style={{ fontSize: k.isCount ? '1.6rem' : '1.1rem' }}>{k.val}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 0 }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                padding: '10px 20px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
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
            ) : bills.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧾</div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 6px' }}>No bills found</h3>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Bills generated from the purchase module will appear here</p>
              </div>
            ) : (
              <div className="acc-table-wrapper">
                <table className="acc-table">
                  <thead>
                    <tr>
                      <th>Bill No.</th>
                      <th>Bill Date</th>
                      <th>PO Reference</th>
                      <th>Remarks</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Gross</th>
                      <th style={{ textAlign: 'right' }}>TDS</th>
                      <th style={{ textAlign: 'right' }}>Net Payable</th>
                      <th style={{ textAlign: 'right' }}>Paid</th>
                      <th style={{ textAlign: 'right' }}>Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map(bill => {
                      const st = STATUS_STYLES[bill.status] || STATUS_STYLES.UNPAID;
                      const outstanding = Number(bill.netAmount || 0) - Number(bill.paidAmount || 0);
                      const paidPct = bill.netAmount > 0 ? Math.min(100, Math.round((Number(bill.paidAmount) / Number(bill.netAmount)) * 100)) : 0;
                      return (
                        <tr key={bill.id}>
                          <td style={{ fontWeight: 700, color: '#1e293b' }}>{bill.billNo}</td>
                          <td>{new Date(bill.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td>
                            {bill.poNo
                              ? <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>PO: {bill.poNo}</span>
                              : <span style={{ color: '#94a3b8' }}>—</span>}
                          </td>
                          <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: '13px' }}>
                            {bill.remarks || '—'}
                          </td>
                          <td>
                            <div>
                              <span className={`acc-badge ${st.badgeCls}`}>{st.label}</span>
                              {bill.status !== 'PAID' && bill.netAmount > 0 && (
                                <div style={{ marginTop: '5px', background: '#e2e8f0', borderRadius: '99px', height: '4px', width: '80px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${paidPct}%`, background: '#059669', borderRadius: '99px', transition: 'width .3s' }} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>₹{fmt(bill.grossAmount)}</td>
                          <td style={{ textAlign: 'right', color: Number(bill.tdsAmount) > 0 ? '#ef4444' : '#94a3b8' }}>
                            {Number(bill.tdsAmount) > 0 ? `−₹${fmt(bill.tdsAmount)}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>₹{fmt(bill.netAmount)}</td>
                          <td style={{ textAlign: 'right', color: '#059669', fontWeight: 500 }}>
                            {Number(bill.paidAmount) > 0 ? `₹${fmt(bill.paidAmount)}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: outstanding > 0 ? '#b91c1c' : '#059669' }}>
                            {outstanding > 0 ? `₹${fmt(outstanding)}` : '✓ Cleared'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
