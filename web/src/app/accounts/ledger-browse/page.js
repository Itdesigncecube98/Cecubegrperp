"use client";
import React, { useState, useEffect } from "react";
import { Search, RefreshCw, Printer, Filter, Settings, FileText, ChevronDown, ChevronRight, X, Loader2 } from "lucide-react";
import '../accounts.css';

export default function LedgerBrowsePage() {
  const [filters, setFilters] = useState({
    fromDate: "2026-04-01",
    toDate: "2026-09-30",
    groupId: "",
    accountId: "",
    voucherType: "13 all selected!",
    costCentre: "",
    postingStatus: "Approved",
    zeroBalance: false,
    debitBalance: false,
    creditBalance: false,
    singleColumn: false,
  });

  const [activeTab, setActiveTab] = useState("Account List");
  const tabs = ["Account List", "Ledger Browse", "Monthwise", "Daywise", "Multi Columnner", "Global Ledgers"];
  const [showAdvanceSearch, setShowAdvanceSearch] = useState(false);
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      let viewType = "Account List";
      if (activeTab === "Ledger Browse") viewType = "Detailed";
      else if (activeTab === "Monthwise") viewType = "Monthwise";
      else if (activeTab === "Daywise") viewType = "Daywise";
      
      const query = new URLSearchParams({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        viewType,
        ...(filters.groupId && { groupId: filters.groupId }),
        ...(filters.accountId && { accountId: filters.accountId }),
      });
      
      const res = await fetch(`/api/accounts/ledger-browse?${query.toString()}`);
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
  }, [activeTab]);

  const handleSearch = () => {
    fetchData();
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  const rowKey = (row, index, scope) => `${scope}:${row.id ?? row.accountName ?? row.date ?? row.month ?? 'row'}:${index}`;

  const handleReset = () => {
    setFilters({
      fromDate: "2026-04-01", toDate: "2026-09-30", groupId: "", accountId: "", voucherType: "", costCentre: "", postingStatus: "Approved", zeroBalance: false, debitBalance: false, creditBalance: false, singleColumn: false
    });
  };

  const handlePrint = () => window.print();

  return (
    <div className="acc-page-container" style={{ background: '#f1f5f9', minHeight: '100vh', padding: '16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', marginBottom: '8px' }}>
        <FileText size={20} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Ledger Browse</h1>
      </div>

      {/* Filter Card */}
      <div className="acc-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '16px' }}>Filter</div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label className="acc-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>From Date</label>
            <input type="date" className="acc-input" value={filters.fromDate} onChange={e => setFilters({...filters, fromDate: e.target.value})} />
          </div>
          <div>
            <label className="acc-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>To Date</label>
            <input type="date" className="acc-input" value={filters.toDate} onChange={e => setFilters({...filters, toDate: e.target.value})} />
          </div>
          <div>
            <label className="acc-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Group</label>
            <select className="acc-select" value={filters.groupId} onChange={e => setFilters({...filters, groupId: e.target.value})}>
              <option value="">Select Here</option>
              <option value="1">Sundry Debtors</option>
              <option value="2">Sundry Creditors</option>
            </select>
          </div>
          <div>
            <label className="acc-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Account</label>
            <select className="acc-select" value={filters.accountId} onChange={e => setFilters({...filters, accountId: e.target.value})}>
              <option value="">Search Account</option>
              <option value="1">140123352737-1 KDG-CB</option>
            </select>
          </div>

          <div>
            <label className="acc-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Voucher Type</label>
            <select className="acc-select" value={filters.voucherType} onChange={e => setFilters({...filters, voucherType: e.target.value})}>
              <option value="13 all selected!">13 all selected!</option>
              <option value="Journal">Journal</option>
              <option value="Payment">Payment</option>
            </select>
          </div>
          <div>
            <label className="acc-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Cost Centre</label>
            <div className="acc-search">
              <Search size={14} className="acc-search-icon" style={{ right: '12px', left: 'auto', cursor: 'pointer' }} />
              <input type="text" className="acc-input" placeholder="" value={filters.costCentre} onChange={e => setFilters({...filters, costCentre: e.target.value})} style={{ paddingLeft: '12px', paddingRight: '36px' }} />
            </div>
          </div>
          <div>
            <label className="acc-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Posting Status</label>
            <select className="acc-select" value={filters.postingStatus} onChange={e => setFilters({...filters, postingStatus: e.target.value})}>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '32px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
              Zero Balance
              <input type="checkbox" checked={filters.zeroBalance} onChange={e => setFilters({...filters, zeroBalance: e.target.checked})} style={{ width: '36px', height: '20px', appearance: 'none', background: filters.zeroBalance ? '#10b981' : '#cbd5e1', borderRadius: '20px', cursor: 'pointer', position: 'relative' }} className="toggle-switch" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
              Debit Balance
              <input type="checkbox" checked={filters.debitBalance} onChange={e => setFilters({...filters, debitBalance: e.target.checked})} style={{ width: '36px', height: '20px', appearance: 'none', background: filters.debitBalance ? '#10b981' : '#cbd5e1', borderRadius: '20px', cursor: 'pointer', position: 'relative' }} className="toggle-switch" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
              Credit Balance
              <input type="checkbox" checked={filters.creditBalance} onChange={e => setFilters({...filters, creditBalance: e.target.checked})} style={{ width: '36px', height: '20px', appearance: 'none', background: filters.creditBalance ? '#10b981' : '#cbd5e1', borderRadius: '20px', cursor: 'pointer', position: 'relative' }} className="toggle-switch" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
              Single Column(Dr/Cr)
              <input type="checkbox" checked={filters.singleColumn} onChange={e => setFilters({...filters, singleColumn: e.target.checked})} style={{ width: '36px', height: '20px', appearance: 'none', background: filters.singleColumn ? '#10b981' : '#cbd5e1', borderRadius: '20px', cursor: 'pointer', position: 'relative' }} className="toggle-switch" />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="acc-btn acc-btn-outline" onClick={handleReset} style={{ fontSize: '0.8rem' }}>
              <RefreshCw size={14} /> Reset
            </button>
            <button className="acc-btn" style={{ background: '#14b8a6', color: 'white', fontSize: '0.8rem' }} onClick={handleSearch}>
              <Search size={14} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="acc-card">
        {/* Tabs */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ChevronRight size={16} /> Search Details
          </div>
          <div style={{ display: 'flex', gap: '24px', borderBottom: '2px solid transparent' }}>
            {tabs.map(tab => (
              <div 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ 
                  paddingBottom: '8px', 
                  fontSize: '0.85rem', 
                  fontWeight: activeTab === tab ? 600 : 500, 
                  color: activeTab === tab ? '#14b8a6' : '#64748b', 
                  borderBottom: activeTab === tab ? '2px solid #14b8a6' : '2px solid transparent',
                  cursor: 'pointer',
                  marginBottom: '-1px'
                }}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>

        {/* View switching logic */}
        {activeTab === "Account List" && (
          loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <Loader2 className="animate-spin inline-block mr-2" size={24} /> Loading...
            </div>
          ) : (
          <div>
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
              <button onClick={handlePrint} className="acc-btn acc-btn-primary" style={{ background: '#3b82f6', padding: '6px 12px', fontSize: '0.8rem' }}>
                <Printer size={14} /> Print
              </button>
            </div>
            <div className="acc-table-wrapper">
              <table className="acc-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#22a699', color: 'white' }}>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white' }}>Account Name</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white' }}>Group Name</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white' }}>Fixed Group</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Opening Balance</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Debit</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Credit</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Closing Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={rowKey(row, index, 'account-list')}>
                      <td>{row.accountName}</td>
                      <td>{row.groupName}</td>
                      <td>{row.fixedGroup}</td>
                      <td style={{ textAlign: 'right' }}>{row.openingBalance}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.debit)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.credit)}</td>
                      <td style={{ textAlign: 'right' }}>{row.closingBalance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )
        )}

        {activeTab === "Ledger Browse" && (
          loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <Loader2 className="animate-spin inline-block mr-2" size={24} /> Loading...
            </div>
          ) : (
          <div>
            <div 
              style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}
              onClick={() => setShowAdvanceSearch(!showAdvanceSearch)}
            >
              {showAdvanceSearch ? <ChevronDown size={16} /> : <ChevronRight size={16} />} Advance Search
            </div>
            
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <label style={{ display: 'flex', gap: '6px', fontSize: '0.8rem', alignItems: 'center', color: '#475569' }}>
                  <input type="checkbox" /> Show Narration
                </label>
                <label style={{ display: 'flex', gap: '6px', fontSize: '0.8rem', alignItems: 'center', color: '#475569' }}>
                  <input type="checkbox" /> Show Details
                </label>
                <button onClick={handlePrint} className="acc-btn acc-btn-primary" style={{ background: '#14b8a6', padding: '6px 12px', fontSize: '0.8rem' }}>
                  <Printer size={14} /> Print
                </button>
              </div>
            </div>

            <div className="acc-table-wrapper">
              <table className="acc-table" style={{ fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ background: '#22a699', color: 'white' }}>
                    <th style={{ padding: '8px 12px', background: 'inherit', color: 'white' }}>Date</th>
                    <th style={{ padding: '8px 12px', background: 'inherit', color: 'white' }}>VT<br/>VNo</th>
                    <th style={{ padding: '8px 12px', background: 'inherit', color: 'white', width: '200px' }}>Description</th>
                    <th style={{ padding: '8px 12px', background: 'inherit', color: 'white' }}>Narration</th>
                    <th style={{ padding: '8px 12px', background: 'inherit', color: 'white' }}>Bill No<br/>Bill Date<br/>Due Date</th>
                    <th style={{ padding: '8px 12px', background: 'inherit', color: 'white' }}>Chq No<br/>Chq Date<br/>Reco Date</th>
                    <th style={{ padding: '8px 12px', background: 'inherit', color: 'white', textAlign: 'right' }}>Gross Amt</th>
                    <th style={{ padding: '8px 12px', background: 'inherit', color: 'white', textAlign: 'right' }}>Debit</th>
                    <th style={{ padding: '8px 12px', background: 'inherit', color: 'white', textAlign: 'right' }}>Credit</th>
                    <th style={{ padding: '8px 12px', background: 'inherit', color: 'white', textAlign: 'right' }}>Balance</th>
                    <th style={{ padding: '8px 12px', background: 'inherit', color: 'white' }}>Cost Centre</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={rowKey(row, index, 'ledger-detail')}>
                      <td style={{ padding: '8px 12px' }}>{row.date}</td>
                      <td style={{ padding: '8px 12px' }}>{row.vtVno}</td>
                      <td style={{ padding: '8px 12px' }}>{row.description}</td>
                      <td style={{ padding: '8px 12px' }}>{row.narration}</td>
                      <td style={{ padding: '8px 12px' }}>{row.billDetails}</td>
                      <td style={{ padding: '8px 12px' }}>{row.chqDetails}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.grossAmt}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.debit > 0 ? formatCurrency(row.debit) : ""}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.credit > 0 ? formatCurrency(row.credit) : ""}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.balance}</td>
                      <td style={{ padding: '8px 12px' }}>{row.costCentre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )
        )}

        {activeTab === "Monthwise" && (
          loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <Loader2 className="animate-spin inline-block mr-2" size={24} /> Loading...
            </div>
          ) : (
          <div>
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
              <button onClick={handlePrint} className="acc-btn acc-btn-primary" style={{ background: '#3b82f6', padding: '6px 12px', fontSize: '0.8rem' }}>
                <Printer size={14} /> Print
              </button>
            </div>
            <div className="acc-table-wrapper">
              <table className="acc-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#22a699', color: 'white' }}>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white' }}>Month</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Debit</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Credit</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Closing Balance</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={rowKey(row, index, 'monthwise')}>
                      <td style={{ padding: '10px 16px', color: '#334155' }}>{row.month}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>{formatCurrency(row.debit)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>{formatCurrency(row.credit)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>{row.closingBalance}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>{formatCurrency(Math.abs(row.debit - row.credit))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )
        )}

        {activeTab === "Daywise" && (
          loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <Loader2 className="animate-spin inline-block mr-2" size={24} /> Loading...
            </div>
          ) : (
          <div>
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
              <button onClick={handlePrint} className="acc-btn acc-btn-primary" style={{ background: '#3b82f6', padding: '6px 12px', fontSize: '0.8rem' }}>
                <Printer size={14} /> Print
              </button>
            </div>
            <div className="acc-table-wrapper">
              <table className="acc-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#22a699', color: 'white' }}>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white' }}>Date</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right', width: '30%' }}>Debit</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right', width: '30%' }}>Credit</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right', width: '30%' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={rowKey(row, index, 'daywise')}>
                      <td style={{ padding: '10px 16px', color: '#334155' }}>{row.date}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>{formatCurrency(row.debit)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>{formatCurrency(row.credit)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>{row.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )
        )}

        {activeTab === "Global Ledgers" && (
          <div>
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
              <button className="acc-btn acc-btn-primary" style={{ background: '#3b82f6', padding: '6px 12px', fontSize: '0.8rem' }}>
                <Printer size={14} /> Print <ChevronDown size={14} />
              </button>
            </div>
            <div className="acc-table-wrapper">
              <table className="acc-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#22a699', color: 'white' }}>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white' }}>Company Name</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white' }}>Account Type</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Debit</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Credit</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Balance</th>
                    <th style={{ padding: '10px 16px', background: 'inherit', color: 'white', textAlign: 'right' }}>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {globalLedgersData.map((row, index) => (
                    <tr key={rowKey(row, index, 'global-ledger')}>
                      <td style={{ padding: '10px 16px', color: '#334155', fontWeight: 500 }}>{row.companyName}</td>
                      <td style={{ padding: '10px 16px', color: '#475569' }}>{row.accountType}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>{row.debit}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>{row.credit}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>{row.balance}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>{row.difference}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <td colSpan={2} style={{ padding: '10px 16px', fontWeight: 600, color: '#334155' }}>Total</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>0.00</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>0.00</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>0.00</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>0.00</td>
                  </tr>
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan={2} style={{ padding: '10px 16px', fontWeight: 600, color: '#334155' }}>Net Balance</td>
                    <td colSpan={4} style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
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
