"use client";
import React, { useState } from "react";
import { Search, ChevronDown, ChevronRight, FileText, Printer } from "lucide-react";
import '../accounts.css';

export default function TrialBalancePage() {
  const [filters, setFilters] = useState({
    fromDate: "2026-04-01",
    toDate: "2027-03-31",
    costCentre: "",
    withZeroBalance: false,
    singleColumn: false,
  });

  const [expandedRows, setExpandedRows] = useState({
    "Capital Accounts": false,
    "Loans (Liability)": false,
    "Current Liabilities": false,
    "Fixed Assets": false,
    "Current Assets": false,
    "Investments": false,
    "Sales Accounts": false,
    "Purchase Accounts": false,
    "Income (Revenue)": false,
    "Direct Expenses": false,
    "Expenditure Accounts": false,
  });

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const trialBalanceData = [
    { id: "Capital Accounts", label: "Capital Accounts", opening: "6,77,37,217.59 Cr", debit: "999.00", credit: "42,50,999.00", closing: "7,19,87,217.59 Cr" },
    { id: "Loans (Liability)", label: "Loans (Liability)", opening: "10,09,24,479.86 Cr", debit: "57,31,30,341.94", credit: "54,24,36,676.16", closing: "7,02,30,804.30 Cr" },
    { id: "Current Liabilities", label: "Current Liabilities", opening: "10,96,79,304.26 Cr", debit: "32,74,66,228.24", credit: "26,03,46,021.76", closing: "4,25,59,097.78 Cr" },
    { id: "Fixed Assets", label: "Fixed Assets", opening: "5,38,34,656.58 Dr", debit: "2,28,664.00", credit: "0.00", closing: "5,40,63,320.58 Dr" },
    { id: "Current Assets", label: "Current Assets", opening: "27,15,87,146.35 Dr", debit: "58,10,08,262.45", credit: "66,22,82,568.55", closing: "19,03,12,740.75 Dr" },
    { id: "Investments", label: "Investments", opening: "40,000.00 Dr", debit: "0.00", credit: "0.00", closing: "40,000.00 Dr" },
    { id: "Sales Accounts", label: "Sales Accounts", opening: "0.00 Dr", debit: "3,87,48,959.38", credit: "21,79,59,555.48", closing: "17,92,10,595.90 Cr" },
    { id: "Purchase Accounts", label: "Purchase Accounts", opening: "0.00 Dr", debit: "14,58,67,032.24", credit: "12,25,919.28", closing: "14,48,43,113.36 Dr" },
    { id: "Income (Revenue)", label: "Income (Revenue)", opening: "0.00 Dr", debit: "0.00", credit: "9,62,085.20", closing: "9,62,085.20 Cr" },
    { id: "Direct Expenses", label: "Direct Expenses", opening: "0.00 Dr", debit: "15,06,270.00", credit: "0.00", closing: "15,06,270.00 Dr" },
    { id: "Expenditure Accounts", label: "Expenditure Accounts", opening: "0.00 Dr", debit: "2,26,33,947.59", credit: "11,10,686.25", closing: "2,15,23,158.29 Dr" },
  ];

  return (
    <div className="acc-page-container" style={{ background: '#f1f5f9', minHeight: '100vh', padding: '16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', marginBottom: '8px' }}>
        <FileText size={20} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Trial Balance</h1>
      </div>

      {/* Filter Card */}
      <div className="acc-card" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '20px', alignItems: 'flex-end', background: '#f8fafc' }}>
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
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', height: '38px', paddingRight: '12px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
            With Zero Balance
            <input type="checkbox" checked={filters.withZeroBalance} onChange={e => setFilters({...filters, withZeroBalance: e.target.checked})} style={{ width: '36px', height: '20px', appearance: 'none', background: filters.withZeroBalance ? '#10b981' : '#cbd5e1', borderRadius: '20px', cursor: 'pointer', position: 'relative' }} className="toggle-switch" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
            Single Column(Dr/Cr)
            <input type="checkbox" checked={filters.singleColumn} onChange={e => setFilters({...filters, singleColumn: e.target.checked})} style={{ width: '36px', height: '20px', appearance: 'none', background: filters.singleColumn ? '#10b981' : '#cbd5e1', borderRadius: '20px', cursor: 'pointer', position: 'relative' }} className="toggle-switch" />
          </label>
        </div>
        <div>
          <button className="acc-btn" style={{ background: '#475569', color: 'white', padding: '10px 24px', fontSize: '0.8rem' }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs / Sub-header */}
      <div className="acc-card">
        <div style={{ padding: '0', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ borderBottom: '2px solid transparent', display: 'inline-block' }}>
            <div style={{ padding: '12px 20px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', background: '#f1f5f9', borderTopLeftRadius: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer' }}>
              Trial Balance
            </div>
          </div>
        </div>

        {/* Hierarchical Table */}
        <div className="acc-table-wrapper">
          <table className="acc-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#22a699', color: 'white' }}>
                <th style={{ padding: '12px 16px', background: 'inherit', color: 'white' }}>Particulars</th>
                <th style={{ padding: '12px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Opening Balance</th>
                <th style={{ padding: '12px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Debit</th>
                <th style={{ padding: '12px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Credit</th>
                <th style={{ padding: '12px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Closing Balance</th>
              </tr>
            </thead>
            <tbody>
              {trialBalanceData.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: expandedRows[row.id] ? '#eff6ff' : 'white' }} onClick={() => toggleRow(row.id)}>
                  <td style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1d4ed8' }}>
                    {expandedRows[row.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {row.label}
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 500, color: '#334155' }}>{row.opening}</td>
                  <td style={{ padding: '8px 16px', textAlign: 'right', color: '#475569' }}>{row.debit}</td>
                  <td style={{ padding: '8px 16px', textAlign: 'right', color: '#475569' }}>{row.credit}</td>
                  <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 500, color: '#334155' }}>{row.closing}</td>
                </tr>
              ))}
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <td style={{ padding: '8px 16px', color: '#334155' }}>
                  <div style={{ marginLeft: '22px' }}>Profit and Loss</div>
                </td>
                <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 500, color: '#334155' }}>0.00 Dr</td>
                <td style={{ padding: '8px 16px', textAlign: 'right', color: '#475569' }}>0.00</td>
                <td style={{ padding: '8px 16px', textAlign: 'right', color: '#475569' }}>0.00</td>
                <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 500, color: '#334155' }}>0.00 Dr</td>
              </tr>
              <tr style={{ background: '#f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                  <div style={{ marginLeft: '22px' }}>Total</div>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>4,71,20,801.22 Dr</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>1,69,05,50,405.04</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>1,69,05,50,405.04</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>4,71,20,801.22 Dr</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button className="acc-btn" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 12px', fontSize: '0.75rem' }}>
          <Printer size={12} /> Print
        </button>
      </div>
      <style jsx>{`
        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }
        .toggle-switch:checked::after {
          transform: translateX(16px);
        }
      `}</style>
    </div>
  );
}
