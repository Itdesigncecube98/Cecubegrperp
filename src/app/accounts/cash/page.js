'use client';
import React, { useState } from 'react';
import { Search, Plus, Filter, Download, BookCopy } from 'lucide-react';
import Link from 'next/link';

export default function CashBook() {
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('Head Office');

  const mockCashBook = [
    { id: 1, date: '2026-09-10', ref: 'RV-2026-045', details: 'Cash Withdrawal from HDFC', receipt: 50000, payment: 0, balance: 125000 },
    { id: 2, date: '2026-09-09', ref: 'PV-2026-088', details: 'Office Supplies Purchase', receipt: 0, payment: 4500, balance: 75000 },
    { id: 3, date: '2026-09-08', ref: 'PV-2026-082', details: 'Local Conveyance - Sales Team', receipt: 0, payment: 12000, balance: 79500 },
    { id: 4, date: '2026-09-01', ref: 'OB', details: 'Opening Balance', receipt: 91500, payment: 0, balance: 91500 }
  ];

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  const filteredBook = mockCashBook.filter(c => 
    c.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.ref.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Cash Book</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Track daily cash-in-hand transactions</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
            <Download size={16} /> Export
          </button>
          <Link href="/accounts/cash/new-entry" style={{ textDecoration: 'none' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
              <Plus size={16} /> Cash Entry
            </button>
          </Link>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <select 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#fff', minWidth: '200px' }}
            >
              <option value="Head Office">Head Office Cash</option>
              <option value="Site - Solar Park">Site Cash - Solar Park</option>
              <option value="Site - Metro">Site Cash - Metro Line</option>
            </select>
            
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Search description or ref..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              />
            </div>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
            <Filter size={16} /> Filter Dates
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.875rem' }}>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Voucher Ref</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Description</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Receipt (In)</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Payment (Out)</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right', background: '#e2e8f0' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredBook.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 20px', color: '#334155' }}>{c.date}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '500', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BookCopy size={14} /> {c.ref}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#1e293b' }}>{c.details}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', color: '#059669', fontWeight: '500' }}>
                    {c.receipt > 0 ? formatCurrency(c.receipt) : '-'}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', color: '#b91c1c', fontWeight: '500' }}>
                    {c.payment > 0 ? formatCurrency(c.payment) : '-'}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600', color: '#0f172a', background: '#f8fafc' }}>
                    {formatCurrency(c.balance)}
                  </td>
                </tr>
              ))}
              {filteredBook.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No cash transactions found.
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
