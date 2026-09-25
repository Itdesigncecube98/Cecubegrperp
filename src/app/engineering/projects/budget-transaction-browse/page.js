'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, Home, ChevronRight, Layers, Building2, Search, 
  RefreshCw, Plus, Download, ArrowUpRight, ArrowDownLeft, 
  CreditCard, Calendar, User, FileText, CheckCircle2, AlertCircle, 
  Filter, DollarSign, X
} from 'lucide-react';
import '../../engineering-ui.css';

export default function BudgetTransactionBrowsePage() {
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalTxns: 0, totalCredits: 0, totalDebits: 0, netBalance: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    taskName: '',
    category: 'Civil & Structural',
    type: 'Expenditure / Payment',
    direction: 'DEBIT',
    amount: '',
    vendor: '',
    reference: '',
    remarks: '',
    approvedBy: 'Project Accountant'
  });

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTransactions = async (projectIdToFetch = selectedProjectId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/engineering/projects/budget-transaction-browse?projectId=${projectIdToFetch || ''}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        setProjects(data.projects || []);
        setTransactions(data.transactions || []);
        setStats(data.stats || { totalTxns: 0, totalCredits: 0, totalDebits: 0, netBalance: 0 });

        if (!selectedProjectId && data.selectedProjectId) {
          setSelectedProjectId(data.selectedProjectId);
        }
      } else {
        showToast('Failed to load budget transactions', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to budget transaction service', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(selectedProjectId);
  }, [selectedProjectId]);

  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const filteredProjects = useMemo(() => {
    if (selectedCompany === 'ALL') return projects;
    return projects.filter(p => p.company?.toLowerCase() === selectedCompany.toLowerCase());
  }, [projects, selectedCompany]);

  const handleCompanyChange = (companyName) => {
    setSelectedCompany(companyName);
    if (companyName === 'ALL') {
      if (projects.length > 0) setSelectedProjectId(projects[0].id);
    } else {
      const matching = projects.filter(p => p.company?.toLowerCase() === companyName.toLowerCase());
      if (matching.length > 0) setSelectedProjectId(matching[0].id);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const m1 = t.voucherNo?.toLowerCase().includes(q);
        const m2 = t.taskName?.toLowerCase().includes(q);
        const m3 = t.vendor?.toLowerCase().includes(q);
        const m4 = t.reference?.toLowerCase().includes(q);
        const m5 = t.remarks?.toLowerCase().includes(q);
        if (!m1 && !m2 && !m3 && !m4 && !m5) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, searchQuery]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!form.amount) {
      showToast('Transaction amount is required', 'error');
      return;
    }

    try {
      const res = await fetch('/api/engineering/projects/budget-transaction-browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          ...form
        })
      });

      if (res.ok) {
        showToast('Budget transaction recorded successfully!');
        setShowAddModal(false);
        setForm({
          taskName: '',
          category: 'Civil & Structural',
          type: 'Expenditure / Payment',
          direction: 'DEBIT',
          amount: '',
          vendor: '',
          reference: '',
          remarks: '',
          approvedBy: 'Project Accountant'
        });
        fetchTransactions(selectedProjectId);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to save transaction', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error recording transaction', 'error');
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      showToast('No transactions to export', 'error');
      return;
    }

    const headers = ['Voucher No', 'Date', 'Task Name', 'Category', 'Transaction Type', 'Direction', 'Amount (INR)', 'Vendor / Payee', 'Reference PO / Bill', 'Approved By', 'Status', 'Remarks'];
    const rows = transactions.map(t => [
      `"${t.voucherNo}"`,
      `"${t.date}"`,
      `"${t.taskName || ''}"`,
      `"${t.category || ''}"`,
      `"${t.type || ''}"`,
      t.direction,
      t.amount,
      `"${t.vendor || ''}"`,
      `"${t.reference || ''}"`,
      `"${t.approvedBy || ''}"`,
      t.status,
      `"${t.remarks || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Budget_Transactions_${currentProject?.name?.replace(/\s+/g, '_') || 'Export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported transactions to CSV!');
  };

  const formatRate = (val) => {
    return Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="premium-page-container" style={{ padding: '1.5rem 2rem', minHeight: 'calc(100vh - 60px)', overflowX: 'auto', minWidth: 0 }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          background: toast.type === 'error' ? '#ef4444' : '#0284c7',
          color: 'white',
          fontSize: '0.9rem',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <Home size={14} /> Home <ChevronRight size={14} /> Projects <ChevronRight size={14} /> <span style={{ color: '#0284c7', fontWeight: 600 }}>Budget Transaction Browse</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#e0f2fe', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={24} color="#0284c7" />
            </div>
            Budget Transaction Ledger
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Browse, reconcile, and audit financial vouchers, allocations, contractor disbursements, and WBS expenditure history.
          </p>
        </div>

        {/* Dual Selectors: Company Library + Project */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Building2 size={16} color="#059669" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Company:</span>
            <select
              value={selectedCompany}
              onChange={(e) => handleCompanyChange(e.target.value)}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '13px', fontWeight: 600, padding: '0.35rem 0.65rem', borderRadius: '8px', outline: 'none', minWidth: '180px', cursor: 'pointer' }}
            >
              <option value="ALL">All Companies</option>
              {companies.map(c => (
                <option key={c.id || c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Layers size={16} color="#0284c7" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '13px', fontWeight: 600, padding: '0.35rem 0.65rem', borderRadius: '8px', outline: 'none', minWidth: '220px', cursor: 'pointer' }}
            >
              {filteredProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchTransactions(selectedProjectId)}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="#0284c7" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Transactions</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{stats.totalTxns}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowDownLeft size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Credits (Inflow)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>₹ {formatRate(stats.totalCredits)}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowUpRight size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Debits (Disbursed)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626' }}>₹ {formatRate(stats.totalDebits)}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: stats.netBalance >= 0 ? '#f0fdf4' : '#fff1f2', color: stats.netBalance >= 0 ? '#15803d' : '#be123c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Net Liquid Balance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stats.netBalance >= 0 ? '#15803d' : '#be123c' }}>
              ₹ {formatRate(stats.netBalance)}
            </div>
          </div>
        </div>

      </div>

      {/* Main Ledger Card */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        
        {/* Controls Bar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#ffffff' }}>
          
          {/* Type Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            {['ALL', 'Budget Allocation', 'Budget Revision', 'Expenditure / Payment', 'Site Imprest Advance', 'Internal Adjustment'].map(tp => (
              <button
                key={tp}
                onClick={() => setTypeFilter(tp)}
                style={{
                  border: 'none',
                  background: typeFilter === tp ? '#ffffff' : 'transparent',
                  color: typeFilter === tp ? '#0284c7' : '#64748b',
                  fontWeight: typeFilter === tp ? 700 : 500,
                  fontSize: '13px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: typeFilter === tp ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {tp === 'ALL' ? 'All Transactions' : tp}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search voucher, payee, PO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Record Transaction Button */}
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0284c7',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
              }}
            >
              <Plus size={16} />
              <span>Record Transaction</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              <Download size={14} color="#0284c7" />
              <span>Export CSV</span>
            </button>
          </div>

        </div>

        {/* Ledger Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-data-table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '140px' }}>Voucher No</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '130px' }}>Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>Task / Budget Head</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '170px' }}>Transaction Type</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>Payee / Vendor</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '130px' }}>Reference</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a', textAlign: 'right', width: '140px' }}>Amount (₹)</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', textAlign: 'center', width: '110px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={22} className="animate-spin" color="#0284c7" style={{ margin: '0 auto 8px auto' }} />
                    <div>Loading Transactions...</div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No budget transactions found for this project.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const isCredit = t.direction === 'CREDIT';

                  return (
                    <tr 
                      key={t.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7' }}>
                        {t.voucherNo}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.taskName}</div>
                        {t.remarks && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{t.remarks}</div>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isCredit ? '#f0fdf4' : '#fff1f2',
                          color: isCredit ? '#15803d' : '#be123c',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isCredit ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                          {t.type}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 600 }}>
                        {t.vendor}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                        {t.reference}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: isCredit ? '#16a34a' : '#dc2626' }}>
                        {isCredit ? '+' : '-'} ₹ {formatRate(t.amount)}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: t.status === 'Reconciled' ? '#ecfdf5' : '#e0f2fe',
                          color: t.status === 'Reconciled' ? '#047857' : '#0369a1'
                        }}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ========================================================
          MODAL: RECORD BUDGET TRANSACTION
          ======================================================== */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  Record Budget Transaction
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Task / Budget Head Description</label>
                <input
                  type="text"
                  placeholder="e.g. Substation Foundation Concrete, Cable Laying"
                  value={form.taskName}
                  onChange={(e) => setForm({ ...form, taskName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Transaction Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({
                      ...form,
                      type: e.target.value,
                      direction: e.target.value === 'Budget Allocation' ? 'CREDIT' : 'DEBIT'
                    })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  >
                    <option value="Expenditure / Payment">Expenditure / Payment</option>
                    <option value="Budget Allocation">Budget Allocation</option>
                    <option value="Site Imprest Advance">Site Imprest Advance</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="e.g. 75000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Vendor / Payee</label>
                  <input
                    type="text"
                    placeholder="e.g. Polycab Wires Ltd"
                    value={form.vendor}
                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Reference / PO #</label>
                  <input
                    type="text"
                    placeholder="e.g. PO-2026-4412"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Remarks / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Certified RA bill payment against site measurement"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', background: '#0284c7', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(2, 132, 199, 0.3)' }}
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
