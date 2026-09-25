'use client';
import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Receipt } from 'lucide-react';
import Link from 'next/link';

export default function RABills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/engineering/billing/ra');
        if (res.ok) setBills(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  const filteredBills = bills.filter(bill => 
    bill.billNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Running Account (RA) Bills</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Generate and track client invoices based on certified MBs</p>
        </div>
        <Link href="/engineering/billing/ra/create" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#7c3aed', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', textDecoration: 'none' }}>
          <Plus size={16} /> Create RA Bill
        </Link>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by RA No or Project..." 
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
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading RA Bills...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.875rem' }}>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Bill No & Date</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Project</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Cumulative Amt</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Net Payable (Post Ded.)</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map(bill => (
                  <tr key={bill.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{bill.billNo}</div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{new Date(bill.date).toLocaleDateString()}</div>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#0f172a' }}>{bill.project?.name} ({bill.project?.projectId})</td>
                    <td style={{ padding: '16px 20px', fontWeight: '500', color: '#0f172a' }}>{formatCurrency(bill.cumulative)}</td>
                    <td style={{ padding: '16px 20px', fontWeight: '600', color: '#16a34a' }}>{formatCurrency(bill.netPayable)}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        background: bill.status === 'Approved' ? '#dcfce7' : '#e0e7ff', 
                        color: bill.status === 'Approved' ? '#166534' : '#3730a3', 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' 
                      }}>
                        {bill.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredBills.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      No RA Bills found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
