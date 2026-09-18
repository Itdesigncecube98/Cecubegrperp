"use client";
import React, { useState, useEffect } from "react";
import { Search, FileText, Loader2, Printer, Download } from "lucide-react";
import { exportToExcel } from '@/lib/exportExcel';
import '../accounts.css';

export default function RatioAnalysisPage() {
  const [filters, setFilters] = useState({
    fromDate: "2026-04-01",
    toDate: "2026-09-30",
    costCentre: "",
  });

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/ratio-analysis?fromDate=${filters.fromDate}&toDate=${filters.toDate}`);
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

  const formatCurrency = (val, isCurrency) => {
    if (!isCurrency) return val.toFixed(2) + ":1";
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  const handlePrint = () => window.print();
  const handleExport = () => {
    const exportData = data.map(d => ({
      'Metric': d.metric,
      'Formula': d.formula,
      'Value': d.isCurrency ? d.value : d.value.toFixed(2) + ":1"
    }));
    exportToExcel(exportData, 'Ratio_Analysis');
  };

  return (
    <div className="acc-page-container" style={{ background: '#f1f5f9', minHeight: '100vh', padding: '16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', marginBottom: '8px' }}>
        <FileText size={20} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Ratio Analysis</h1>
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchData} className="acc-btn" style={{ background: '#475569', color: 'white', padding: '10px 24px', fontSize: '0.8rem' }}>
            Refresh
          </button>
          <button onClick={handleExport} className="acc-btn" style={{ background: '#3b82f6', color: 'white', padding: '10px 16px', fontSize: '0.8rem' }}>
            <Download size={14} style={{ marginRight: '4px' }} /> Export
          </button>
          <button onClick={handlePrint} className="acc-btn" style={{ background: '#22a699', color: 'white', padding: '10px 16px', fontSize: '0.8rem' }}>
            <Printer size={14} style={{ marginRight: '4px' }} /> Print
          </button>
        </div>
      </div>

      {/* Ratio Table */}
      <div className="acc-card acc-table-wrapper">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <Loader2 className="animate-spin inline-block mr-2" size={24} /> Loading...
          </div>
        ) : (
        <table className="acc-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: '#1e293b', color: 'white' }}>
              <th style={{ padding: '12px 16px', background: 'inherit', borderRight: '1px solid #475569' }}>Particulars</th>
              <th style={{ padding: '12px 16px', background: 'inherit', borderRight: '1px solid #475569', textAlign: 'right', width: '200px' }}>Values</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px 16px', borderRight: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 500, color: '#334155' }}>{row.metric}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{row.formula}</div>
                </td>
                <td style={{ padding: '12px 16px', borderRight: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 500 }}>{formatCurrency(row.value, row.isCurrency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

    </div>
  );
}
