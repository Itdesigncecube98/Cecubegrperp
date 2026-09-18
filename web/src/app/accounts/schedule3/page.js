"use client";
import React, { useState, useEffect } from "react";
import { Search, ChevronDown, ChevronRight, FileText, Loader2, Printer, Download } from "lucide-react";
import { exportToExcel } from '@/lib/exportExcel';
import '../accounts.css';

export default function Schedule3Page() {
  const [filters, setFilters] = useState({
    reportType: "SCH III Balance Sheet",
    fromDate: "2026-04-01",
    toDate: "2026-09-30",
    costCentre: "",
    zero: false,
  });

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/schedule3?fromDate=${filters.fromDate}&toDate=${filters.toDate}`);
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
      'Schedule-III': d.name,
      'Prev Amount': d.previousYear,
      'Amount': d.currentYear
    }));
    exportToExcel(exportData, 'Schedule_3');
  };

  const [expandedRows, setExpandedRows] = useState({
    "EQUITY AND LIABILITIES": true,
    "Shareholder's Funds": true,
    "Non-Current Liabilities": false,
  });

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const scheduleData = [
    {
      id: "ROOT",
      label: "Schedule III Items",
      prevAmount: "",
      amount: "",
      children: data.map(item => ({
        id: item.id,
        label: item.name,
        prevAmount: formatCurrency(item.previousYear),
        amount: formatCurrency(item.currentYear),
      }))
    }
  ];

  const renderRows = (nodes, depth = 0) => {
    return nodes.map((node) => (
      <React.Fragment key={node.id}>
        <tr style={{ borderBottom: '1px solid #f1f5f9', background: depth === 0 ? '#f8fafc' : 'white', cursor: node.children ? 'pointer' : 'default' }} onClick={() => node.children && toggleRow(node.id)}>
          <td style={{ padding: '8px 16px', paddingLeft: `${16 + (depth * 24)}px` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {node.children ? (
                expandedRows[node.id] ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />
              ) : (
                <div style={{ width: 14, height: 14 }} /> // spacer
              )}
              <span style={{ fontWeight: depth === 0 ? 600 : depth === 1 ? 500 : 400, color: depth === 0 ? '#1e293b' : '#334155', fontSize: '0.8rem' }}>
                {node.label}
              </span>
            </div>
          </td>
          <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>{node.prevAmount}</td>
          <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 500, color: '#334155' }}>{node.amount}</td>
        </tr>
        {node.children && expandedRows[node.id] && renderRows(node.children, depth + 1)}
      </React.Fragment>
    ));
  };

  return (
    <div className="acc-page-container" style={{ background: '#f1f5f9', minHeight: '100vh', padding: '16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', marginBottom: '8px' }}>
        <FileText size={20} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Schedule 3</h1>
      </div>

      {/* Filter Card */}
      <div className="acc-card" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '20px', alignItems: 'flex-end', background: '#f8fafc' }}>
        <div style={{ flex: 1.5 }}>
          <label className="acc-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Report Type</label>
          <select className="acc-select" value={filters.reportType} onChange={e => setFilters({...filters, reportType: e.target.value})} style={{ background: 'white' }}>
            <option>SCH III Balance Sheet</option>
            <option>SCH III P&L</option>
          </select>
        </div>
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
          <button onClick={fetchData} className="acc-btn" style={{ background: '#475569', color: 'white', padding: '10px 16px', fontSize: '0.75rem' }}>
            Refresh
          </button>
          <button onClick={handleExport} className="acc-btn" style={{ background: '#3b82f6', color: 'white', padding: '10px 16px', fontSize: '0.75rem' }}>
            <Download size={14} style={{ marginRight: '4px' }} /> Export
          </button>
          <button onClick={handlePrint} className="acc-btn" style={{ background: '#22a699', color: 'white', padding: '10px 16px', fontSize: '0.75rem' }}>
            <Printer size={14} style={{ marginRight: '4px' }} /> Print
          </button>
        </div>
      </div>

      {/* Tabs / Sub-header */}
      <div className="acc-card">
        <div style={{ padding: '0', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ borderBottom: '2px solid transparent', display: 'inline-block' }}>
            <div style={{ padding: '12px 20px', fontSize: '0.85rem', fontWeight: 600, color: 'white', background: '#22a699', borderTopLeftRadius: '12px' }}>
              Schedule-III
            </div>
          </div>
        </div>

        {/* Hierarchical Table */}
        <div className="acc-table-wrapper">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <Loader2 className="animate-spin inline-block mr-2" size={24} /> Loading...
            </div>
          ) : (
          <table className="acc-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#3b82f6', color: 'white' }}>
                <th style={{ padding: '12px 16px', background: 'inherit', color: 'white', fontSize: '0.85rem' }}>Schedule-III</th>
                <th style={{ padding: '12px 16px', background: 'inherit', color: 'white', textAlign: 'right', width: '200px', fontSize: '0.85rem' }}>Prev Amount</th>
                <th style={{ padding: '12px 16px', background: 'inherit', color: 'white', textAlign: 'right', width: '200px', fontSize: '0.85rem' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {renderRows(scheduleData)}
            </tbody>
          </table>
          )}
        </div>
      </div>

    </div>
  );
}
