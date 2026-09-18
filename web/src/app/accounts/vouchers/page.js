'use client';
import React, { useEffect, useState } from 'react';
import { Search, Plus, Filter, FileText, Download, Trash2, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { exportToExcel } from '@/lib/exportExcel';
import { useRouter } from 'next/navigation';

export default function VoucherEntry() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Payment');
  const tabs = ['Payment', 'Receipt', 'Journal', 'Contra', 'Purchase', 'Sale'];

  const [vouchers, setVouchers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/accounts/vouchers?type=${activeTab === 'Journal' ? 'JV' : activeTab}&search=${encodeURIComponent(searchTerm)}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Failed to load vouchers')))
      .then(setVouchers)
      .catch(error => console.error('Failed to load vouchers:', error))
      .finally(() => setLoading(false));
  }, [activeTab, searchTerm]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this voucher?')) return;
    
    try {
      // TODO: Add API call when backend is ready
      alert('Voucher deletion is not enabled for posted accounting entries.');
    } catch (error) {
      console.error(error);
      alert('Failed to delete voucher');
    }
  };

  const handleEdit = (id) => {
    router.push(`/accounts/vouchers/new?id=${id}`);
  };

  const filteredVouchers = vouchers;
  
  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const exportData = filteredVouchers.map(v => ({
      'Voucher No.': v.no,
      'Date': v.date,
      'Party/Account': v.party,
      'Amount': v.amount,
      'Status': v.status
    }));
    exportToExcel(exportData, `${activeTab}_Vouchers`);
  };
  
  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Voucher Entry</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Record financial transactions across ledgers</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
            <Download size={16} /> Export
          </button>
          <Link href="/accounts/vouchers/new" style={{ textDecoration: 'none' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
              <Plus size={16} /> New {activeTab} Voucher
            </button>
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === tab ? '#3b82f6' : '#64748b',
              fontWeight: activeTab === tab ? '600' : '500',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab} vouchers...`}
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
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Voucher No.</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>{activeTab === 'Contra' ? 'Account' : activeTab === 'Journal' ? 'Account/Ref' : 'Party/Account'}</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading vouchers...</td></tr> : filteredVouchers.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '600', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} /> {v.no}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#334155' }}>{v.date}</td>
                  <td style={{ padding: '16px 20px', color: '#1e293b', fontWeight: '500' }}>{v.party}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>
                    {formatCurrency(v.amount)}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      background: v.status === 'Approved' ? '#dcfce7' : '#fef9c3', 
                      color: v.status === 'Approved' ? '#166534' : '#854d0e', 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' 
                    }}>
                      {v.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleEdit(v.id)} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '4px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Edit2 size={12} /> Edit
                    </button>
                    <button onClick={() => handleDelete(v.id)} style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '4px', fontSize: '0.75rem', color: '#dc2626', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredVouchers.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No {activeTab} vouchers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
