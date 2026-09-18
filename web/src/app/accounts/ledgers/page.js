'use client';
import React, { useEffect, useState } from 'react';
import { Search, Plus, Filter, BookOpen, Download, Trash2, Edit2, WalletCards, Car, ReceiptText, Landmark, BadgeIndianRupee } from 'lucide-react';
import Link from 'next/link';
import { exportToExcel } from '@/lib/exportExcel';
import { useRouter } from 'next/navigation';

export default function ChartOfAccounts() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeSection, setActiveSection] = useState('All');

  useEffect(() => {
    fetch(`/api/accounts/ledgers?t=${Date.now()}`, { cache: 'no-store' })
      .then(async response => {
        if (response.ok) return response.json();
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Failed to load accounts (${response.status})`);
      })
      .then(setAccounts)
      .catch(error => {
        console.error('Failed to load accounts:', error);
        setLoadError('Failed to load accounts. Please refresh the page.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    
    try {
      // TODO: Add API call when backend is ready
      // const res = await fetch(`/api/accounts/ledgers/${id}`, { method: 'DELETE' });
      // if (res.ok) {
        setAccounts(accounts.filter(a => a.id !== id));
        alert('Account deleted successfully');
      // }
    } catch (error) {
      console.error(error);
      alert('Failed to delete account');
    }
  };

  const handleEdit = (id) => {
    router.push(`/accounts/ledgers/new?id=${id}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const exportData = accounts.map(a => ({
      'Code': a.code,
      'Name': a.name,
      'Group': a.group,
      'Sub Group': a.subGroup,
      'Type': a.type,
      'Closing Balance': a.balance > 0 ? `${a.balance} ${a.balanceType}` : '-',
      'Status': a.status
    }));
    exportToExcel(exportData, 'Chart_of_Accounts');
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  const filteredAccounts = accounts.filter(a => 
    (a.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.group || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sectionOrder = ['Vehicle Expenses', 'Imprest', 'Opening Balance', 'Salary'];
  const sectionTabs = [
    { name: 'All', icon: WalletCards },
    { name: 'Vehicle Expenses', icon: Car },
    { name: 'Imprest', icon: ReceiptText },
    { name: 'Opening Balance', icon: Landmark },
    { name: 'Salary', icon: BadgeIndianRupee }
  ];
  const visibleAccounts = activeSection === 'All'
    ? filteredAccounts
    : filteredAccounts.filter(account => account.section === activeSection);
  const sectionsToRender = activeSection === 'All' ? sectionOrder : [activeSection];
  const sectionGroups = sectionsToRender.map(section => ({
    section,
    accounts: visibleAccounts.filter(account => account.section === section)
  }));

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Chart of Accounts</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Master list of all ledger heads and groupings</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
            <Download size={16} /> Export
          </button>
          <Link href="/accounts/ledgers/new" style={{ textDecoration: 'none' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
              <Plus size={16} /> New Account
            </button>
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '8px 0 16px', borderBottom: '1px solid #e2e8f0' }}>
        {sectionTabs.map(({ name, icon: Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => setActiveSection(name)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
              padding: '10px 16px', borderRadius: '6px', cursor: 'pointer',
              border: activeSection === name ? '1px solid #2563eb' : '1px solid #cbd5e1',
              background: activeSection === name ? '#eff6ff' : '#fff',
              color: activeSection === name ? '#1d4ed8' : '#64748b', fontWeight: 600
            }}
          >
            <Icon size={17} /> {name}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by Code, Name, or Group..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
            <Filter size={16} /> Filter
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.875rem' }}>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Code & Name</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Group & Sub-Group</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Closing Balance</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading accounts...</td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>{loadError}</td>
                </tr>
              ) : sectionGroups.map(({ section, accounts: sectionAccounts }) => (
                <React.Fragment key={section}>
                <tr><td colSpan="6" style={{ padding: '14px 20px', background: '#e0f2fe', color: '#0c4a6e', fontWeight: '700' }}>{section}</td></tr>
                {sectionAccounts.map(acc => (
                <tr key={acc.id} style={{ borderBottom: '1px solid #e2e8f0', background: acc.type === 'Group' ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {acc.type === 'Group' ? <BookOpen size={14} color="#64748b" /> : null}
                      {acc.code}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
                      {acc.name}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ color: '#334155', fontWeight: '500' }}>{acc.group}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{acc.subGroup}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      background: acc.type === 'Ledger' ? '#e0f2fe' : '#f1f5f9', 
                      color: acc.type === 'Ledger' ? '#0284c7' : '#475569', 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' 
                    }}>
                      {acc.type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '500', color: acc.balanceType === 'Dr' ? '#1e293b' : '#059669' }}>
                    {acc.balance > 0 ? (
                      <>
                        {formatCurrency(acc.balance)} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{acc.balanceType}</span>
                      </>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      background: acc.status === 'Active' ? '#dcfce7' : '#fee2e2', 
                      color: acc.status === 'Active' ? '#166534' : '#991b1b', 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' 
                    }}>
                      {acc.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleEdit(acc.id)} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '4px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Edit2 size={12} /> Edit
                    </button>
                    <button onClick={() => handleDelete(acc.id)} style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '4px', fontSize: '0.75rem', color: '#dc2626', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </td>
                </tr>
                ))}
                {!sectionAccounts.length && <tr><td colSpan="6" style={{ padding: '18px 20px', color: '#94a3b8' }}>No entries in this section.</td></tr>}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
