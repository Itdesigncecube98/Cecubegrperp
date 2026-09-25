"use client";
import React, { useState, useEffect } from "react";
import { Search, Printer, FileText, ChevronRight, LayoutList, ChevronDown, Download, Loader2 } from "lucide-react";
import { exportToExcel } from '@/lib/exportExcel';
import '../../accounts.css';

export default function BalanceSheetPage() {
  const [filters, setFilters] = useState({
    fromDate: "2026-04-01",
    toDate: "2026-09-30",
    costCentre: "",
    withZeroBalance: false,
  });

  const [activeTab, setActiveTab] = useState("Balance Sheet");
  const [data, setData] = useState({ liabilities: [], assets: [], netProfit: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/balance-sheet?fromDate=${filters.fromDate}&toDate=${filters.toDate}`);
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

  const totalLiabilities = data.liabilities.reduce((sum, item) => sum + item.amount, 0);
  const totalAssets = data.assets.reduce((sum, item) => sum + item.amount, 0);

  const handlePrint = () => window.print();
  const handleExport = () => {
    const exportData = [];
    const maxLen = Math.max(data.liabilities.length, data.assets.length);
    for (let i = 0; i < maxLen; i++) {
      exportData.push({
        'Liability Account': data.liabilities[i]?.name || '',
        'Liability Amount': data.liabilities[i]?.amount || '',
        'Asset Account': data.assets[i]?.name || '',
        'Asset Amount': data.assets[i]?.amount || ''
      });
    }
    exportData.push({
      'Liability Account': 'Net Profit',
      'Liability Amount': data.netProfit
    });
    exportData.push({
      'Liability Account': 'Total',
      'Liability Amount': totalLiabilities + (data.netProfit > 0 ? data.netProfit : 0),
      'Asset Account': 'Total',
      'Asset Amount': totalAssets + (data.netProfit < 0 ? Math.abs(data.netProfit) : 0)
    });
    exportToExcel(exportData, 'Balance_Sheet');
  };

  return (
    <div className="acc-page-container" style={{ background: '#f1f5f9', minHeight: '100vh', padding: '16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', marginBottom: '8px' }}>
        <FileText size={20} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Balance Sheet</h1>
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
        <div style={{ display: 'flex', alignItems: 'center', height: '38px', paddingRight: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
            With Zero Balance
            <input type="checkbox" checked={filters.withZeroBalance} onChange={e => setFilters({...filters, withZeroBalance: e.target.checked})} style={{ width: '36px', height: '20px', appearance: 'none', background: filters.withZeroBalance ? '#10b981' : '#cbd5e1', borderRadius: '20px', cursor: 'pointer', position: 'relative' }} className="toggle-switch" />
          </label>
        </div>
        <div>
          <button onClick={fetchData} className="acc-btn" style={{ background: '#475569', color: 'white', padding: '10px 24px', fontSize: '0.8rem' }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs / Sub-header */}
      <div className="acc-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', paddingRight: '16px' }}>
          <div style={{ display: 'flex' }}>
            <div 
              onClick={() => setActiveTab("Balance Sheet")}
              style={{ padding: '12px 20px', fontSize: '0.85rem', fontWeight: 600, color: activeTab === "Balance Sheet" ? '#0ea5e9' : '#475569', background: activeTab === "Balance Sheet" ? 'white' : '#f1f5f9', borderTopLeftRadius: '12px', cursor: 'pointer', borderRight: '1px solid #e2e8f0' }}
            >
              Balance Sheet
            </div>
            <div 
              onClick={() => setActiveTab("Balance Group Browse")}
              style={{ padding: '12px 20px', fontSize: '0.85rem', fontWeight: 600, color: activeTab === "Balance Group Browse" ? '#0ea5e9' : '#475569', background: activeTab === "Balance Group Browse" ? 'white' : '#f1f5f9', cursor: 'pointer', borderRight: '1px solid #e2e8f0' }}
            >
              Balance Group Browse
            </div>
          </div>
          {activeTab === "Balance Sheet" && (
            <button className="acc-btn" style={{ background: '#22a699', color: 'white', padding: '6px 12px', fontSize: '0.75rem' }}>
              <LayoutList size={12} style={{ marginRight: '4px' }} /> Switch
            </button>
          )}
        </div>

        {activeTab === "Balance Sheet" && (
          loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <Loader2 className="animate-spin inline-block mr-2" size={24} /> Loading...
            </div>
          ) : (
          <div style={{ display: 'flex' }} className="acc-table-wrapper">
            {/* Liabilities Column */}
            <div style={{ flex: 1, borderRight: '1px solid #e2e8f0' }}>
              <table className="acc-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#22a699', color: 'white' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500 }}>Liabilities</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.liabilities.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6', cursor: 'pointer' }}>
                        {row.name}
                      </td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 500, color: '#334155' }}>{formatCurrency(row.amount)} Cr</td>
                    </tr>
                  ))}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 16px', fontWeight: 600, color: '#334155' }}>Credit Total</td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatCurrency(totalLiabilities)} Cr</td>
                  </tr>
                  
                  {data.netProfit > 0 && (
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 16px', fontWeight: 600, color: '#dc2626' }}>Net Profit</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>{formatCurrency(data.netProfit)} Cr</td>
                    </tr>
                  )}
                  <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#1e293b' }}>Total</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>{formatCurrency(totalLiabilities + (data.netProfit > 0 ? data.netProfit : 0))} Cr</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Assets Column */}
            <div style={{ flex: 1 }}>
              <table className="acc-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#22a699', color: 'white' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500 }}>Assets</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assets.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6', cursor: 'pointer' }}>
                        {row.name}
                      </td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 500, color: '#334155' }}>{formatCurrency(row.amount)} Dr</td>
                    </tr>
                  ))}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 16px', fontWeight: 600, color: '#334155' }}>Debit Total</td>
                    <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatCurrency(totalAssets)} Dr</td>
                  </tr>
                  
                  {data.netProfit < 0 && (
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 16px', fontWeight: 600, color: '#dc2626' }}>Net Loss</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>{formatCurrency(Math.abs(data.netProfit))} Dr</td>
                    </tr>
                  )}
                  
                  <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#1e293b' }}>Total</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>{formatCurrency(totalAssets + (data.netProfit < 0 ? Math.abs(data.netProfit) : 0))} Dr</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          )
        )}

        {activeTab === "Balance Group Browse" && (
          <div>
            <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
              Liabilities : Capital Accounts
            </div>
            <div className="acc-table-wrapper">
              <table className="acc-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#22a699', color: 'white' }}>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white' }}>Particulars</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Opening Balance</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Debit</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Credit</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Closing Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceGroupData.map((row) => (
                    <tr key={row.id}>
                      <td style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: row.isRed ? '#dc2626' : '#3b82f6', cursor: 'pointer' }}>
                        {row.isParent && <ChevronRight size={14} />} {row.particulars}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: row.isRed ? '#dc2626' : '#3b82f6' }}>{row.opening}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: row.isRed ? '#dc2626' : '#3b82f6' }}>{row.debit}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: row.isRed ? '#dc2626' : '#3b82f6' }}>{row.credit}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: row.isRed ? '#dc2626' : '#3b82f6' }}>{row.closing}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#22a699', color: 'white' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>Total</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>6,77,37,217.59 Cr</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>999.00</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>42,50,999.00</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>7,19,87,217.59 Cr</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px' }}>
              <button className="acc-btn" style={{ background: '#22a699', color: 'white', padding: '6px 16px', fontSize: '0.75rem' }}>
                <Printer size={12} style={{ marginRight: '4px' }} /> Print <ChevronDown size={12} style={{ marginLeft: '4px' }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Bar */}
      {activeTab === "Balance Sheet" && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ background: '#4f46e5', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
              Liabilities Total : {formatCurrency(totalLiabilities)} Cr
            </div>
            <div style={{ background: '#4f46e5', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
              Assets Total : {formatCurrency(totalAssets)} Dr
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleExport} className="acc-btn" style={{ background: '#3b82f6', color: 'white', padding: '6px 16px', fontSize: '0.75rem' }}>
              <Download size={12} style={{ marginRight: '4px' }} /> Export
            </button>
            <button onClick={handlePrint} className="acc-btn" style={{ background: '#22a699', color: 'white', padding: '6px 16px', fontSize: '0.75rem' }}>
              <Printer size={12} style={{ marginRight: '4px' }} /> Print
            </button>
          </div>
        </div>
      )}

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
