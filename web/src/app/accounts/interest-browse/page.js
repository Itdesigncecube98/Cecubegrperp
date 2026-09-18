"use client";
import React, { useState, useEffect } from "react";
import { Search, Printer, FileText, Loader2, Download } from "lucide-react";
import { exportToExcel } from '@/lib/exportExcel';
import '../accounts.css';

export default function InterestBrowsePage() {
  const [filters, setFilters] = useState({
    fromDate: "2026-04-01",
    toDate: "2026-09-30",
    costCentre: "",
    reconciledBalance: false,
  });

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/interest-browse?fromDate=${filters.fromDate}&toDate=${filters.toDate}`);
      const json = await res.json();
      if (json.data) setData(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  const handlePrint = () => window.print();
  const handleExport = () => {
    const exportData = data.map(d => ({
      'Description': d.description,
      'Balance': d.balance,
      'Interest Amount': d.interestAmount,
      'Interest Rate(%)': d.interestRate
    }));
    exportToExcel(exportData, 'Interest_Browse');
  };

  return (
    <div className="acc-page-container" style={{ background: '#f1f5f9', minHeight: '100vh', padding: '16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', marginBottom: '8px' }}>
        <FileText size={20} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Interest Browse</h1>
      </div>

      {/* Filter Card */}
      <div className="acc-card" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '24px', alignItems: 'flex-end', background: '#f8fafc' }}>
        <div style={{ flex: 1 }}>
          <label className="acc-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>From Date</label>
          <input type="date" className="acc-input" value={filters.fromDate} onChange={e => setFilters({...filters, fromDate: e.target.value})} style={{ background: 'white' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="acc-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>To Date</label>
          <input type="date" className="acc-input" value={filters.toDate} onChange={e => setFilters({...filters, toDate: e.target.value})} style={{ background: 'white' }} />
        </div>
        <div style={{ flex: 2 }}>
          <label className="acc-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Cost Centre</label>
          <div className="acc-search">
            <Search size={14} className="acc-search-icon" style={{ right: '12px', left: 'auto', cursor: 'pointer' }} />
            <input type="text" className="acc-input" placeholder="Select Cost Centre" value={filters.costCentre} onChange={e => setFilters({...filters, costCentre: e.target.value})} style={{ paddingLeft: '12px', paddingRight: '36px', background: 'white' }} />
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '38px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#334155', fontWeight: 500, cursor: 'pointer' }}>
            <input type="checkbox" checked={filters.reconciledBalance} onChange={e => setFilters({...filters, reconciledBalance: e.target.checked})} style={{ width: '16px', height: '16px' }} />
            Reconciled Balance
          </label>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchData} className="acc-btn" style={{ background: '#0ea5e9', color: 'white', padding: '10px 16px', fontSize: '0.8rem' }}>
            Refresh
          </button>
          <button onClick={handleExport} className="acc-btn" style={{ background: '#3b82f6', color: 'white', padding: '10px 16px', fontSize: '0.8rem' }}>
            <Download size={14} style={{ marginRight: '4px' }} /> Export
          </button>
          <button onClick={handlePrint} className="acc-btn" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 16px', fontSize: '0.8rem' }}>
            <Printer size={14} style={{ marginRight: '4px' }} /> Print
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button className="acc-btn" style={{ background: '#475569', color: 'white', padding: '8px 16px', fontSize: '0.75rem', opacity: 0.8 }}>
          Interest Calculation
        </button>
      </div>

      {/* Tabs / Sub-header */}
      <div className="acc-card">
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ borderBottom: '2px solid transparent', display: 'flex' }}>
            <div style={{ paddingBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#334155', borderBottom: '2px solid #0ea5e9', marginBottom: '-13px' }}>
              Interest
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="acc-table-wrapper">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <Loader2 className="animate-spin inline-block mr-2" size={24} /> Loading...
            </div>
          ) : (
          <table className="acc-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#22a699', color: 'white' }}>
                <th style={{ padding: '12px 16px', background: 'inherit', color: 'white' }}>Description</th>
                <th style={{ padding: '12px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Balance</th>
                <th style={{ padding: '12px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Interest Amount</th>
                <th style={{ padding: '12px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Interest Rate(%)</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                    No records to display.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: '12px 16px' }}>{row.description}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(row.balance)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(row.interestAmount)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{row.interestRate}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

    </div>
  );
}
