'use client';
import React, { useState } from 'react';
import { Search, Plus, Filter, Landmark, Download, Trash2, Edit2, FileText } from 'lucide-react';
import Link from 'next/link';

export default function BankMaster() {
  const [searchTerm, setSearchTerm] = useState('');

  const [banks, setBanks] = useState([
    { id: 1, name: 'HDFC - Current A/c - Project Ops', bank: 'HDFC Bank', accNo: '00123456789', ifsc: 'HDFC0000001', type: 'Current', balance: 1250000, status: 'Active' },
    { id: 2, name: 'SBI - Escrow A/c', bank: 'State Bank of India', accNo: '30291827465', ifsc: 'SBIN0001234', type: 'Current', balance: 5000000, status: 'Active' },
    { id: 3, name: 'ICICI - Petty Cash Replenishment', bank: 'ICICI Bank', accNo: '98765432100', ifsc: 'ICIC0005678', type: 'OD', balance: -250000, status: 'Active' }
  ]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;
    
    try {
      // TODO: Add API call when backend is ready
      setBanks(banks.filter(b => b.id !== id));
      alert('Bank account deleted successfully');
    } catch (error) {
      console.error(error);
      alert('Failed to delete bank account');
    }
  };

  const handleEdit = (id) => {
    window.location.href = `/accounts/bank/new?id=${id}`;
  };

  const handleReconcile = (id, name) => {
    alert(`Opening BRS reconciliation for: ${name}`);
    // TODO: Navigate to BRS page
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  const filteredBanks = banks.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.bank.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.accNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Bank Master & BRS</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Manage bank accounts and perform Bank Reconciliation</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/accounts/bank/new" style={{ textDecoration: 'none' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
              <Plus size={16} /> New Bank Account
            </button>
          </Link>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ position: 'relative', width: '350px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by Bank Name, Account Name or No..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.875rem' }}>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Account Name</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Bank & Type</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Account Details</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Book Balance</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBanks.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Landmark size={14} color="#64748b" /> {b.name}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '500', color: '#334155' }}>{b.bank}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{b.type} Account</div>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#475569', fontSize: '0.875rem' }}>
                    <div>A/c: <span style={{ fontWeight: '500', color: '#1e293b' }}>{b.accNo}</span></div>
                    <div>IFSC: {b.ifsc}</div>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600', color: b.balance < 0 ? '#b91c1c' : '#059669' }}>
                    {formatCurrency(b.balance)}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      background: b.status === 'Active' ? '#dcfce7' : '#f1f5f9', 
                      color: b.status === 'Active' ? '#166534' : '#475569', 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' 
                    }}>
                      {b.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleReconcile(b.id, b.name)} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 10px', borderRadius: '4px', fontSize: '0.75rem', color: '#1d4ed8', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={12} /> Reconcile
                    </button>
                    <button onClick={() => handleEdit(b.id)} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '4px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Edit2 size={12} /> Edit
                    </button>
                    <button onClick={() => handleDelete(b.id)} style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '4px', fontSize: '0.75rem', color: '#dc2626', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filteredBanks.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No bank accounts found.
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
