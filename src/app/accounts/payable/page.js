'use client';
import React, { useState } from 'react';
import { Search, Filter, Download, DollarSign, Building2 } from 'lucide-react';

export default function AccountsPayable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [todayTimestamp] = useState(() => Date.now());

  const [payables, setPayables] = useState([
    { id: 1, vendor: 'ABC Infrastructure Ltd', billNo: 'BILL-2026-089', project: 'Solar Park EPC', date: '2026-08-15', dueDate: '2026-09-14', amount: 1500000, paid: 500000, status: 'Partially Paid' },
    { id: 2, vendor: 'TechMech Suppliers', billNo: 'INV-4402', project: 'Solar Park EPC', date: '2026-09-01', dueDate: '2026-09-30', amount: 850000, paid: 0, status: 'Approved' },
    { id: 3, vendor: 'Ramesh Civil Works', billNo: 'RCW/26/05', project: 'O&M Site A', date: '2026-07-20', dueDate: '2026-08-20', amount: 320000, paid: 0, status: 'Overdue' }
  ]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payable?')) return;
    
    try {
      // TODO: Add API call when backend is ready
      setPayables(payables.filter(p => p.id !== id));
      alert('Payable deleted successfully');
    } catch (error) {
      console.error(error);
      alert('Failed to delete payable');
    }
  };

  const handleEdit = (id) => {
    alert(`Edit functionality for payable ID: ${id} - Navigate to payment voucher form`);
    // TODO: Navigate to payment form with prefilled data
  };

  const handlePayNow = (billNo, amount) => {
    alert(`Opening payment form for Bill: ${billNo}, Amount: ${amount}`);
    // TODO: Navigate to payment voucher creation with bill details
  };

  const getAging = (payable) => {
    const outstanding = Math.max((payable.amount || 0) - (payable.paid || 0), 0);
    const dueDate = new Date(payable.dueDate);
    const daysOverdue = Math.max(Math.floor((todayTimestamp - dueDate.getTime()) / 86400000), 0);
    return {
      current: daysOverdue <= 30 ? outstanding : 0,
      days31to60: daysOverdue >= 31 && daysOverdue <= 60 ? outstanding : 0,
      days61to90: daysOverdue >= 61 && daysOverdue <= 90 ? outstanding : 0,
      over91: daysOverdue > 90 ? outstanding : 0,
      outstanding
    };
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  const filteredPayables = payables.filter(p => 
    p.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.project.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Vendor Payable (AP)</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Manage subcontractor and vendor bills</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
            <Download size={16} /> Export Report
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by Vendor, Bill No, or Project..." 
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
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Sr No.</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Account Name</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Group Name</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Bill No.</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>0-30</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>31-60</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>61-90</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>&gt;91</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Outstanding Amt.</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Ledger Balance</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Due Date</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Allow Payment</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>View</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayables.map((p, index) => {
                const aging = getAging(p);
                return (
                <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 20px' }}>{index + 1}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={14} color="#64748b" /> {p.vendor}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>{p.project}</div>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#334155', fontWeight: '500' }}>Vendor Payables</td>
                  <td style={{ padding: '16px 20px' }}>{p.billNo}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>{formatCurrency(aging.current)}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>{formatCurrency(aging.days31to60)}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>{formatCurrency(aging.days61to90)}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>{formatCurrency(aging.over91)}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(aging.outstanding)}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(aging.outstanding)}</td>
                  <td style={{ padding: '16px 20px', color: p.status === 'Overdue' ? '#dc2626' : '#475569' }}>
                    {p.dueDate}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <button onClick={() => handlePayNow(p.billNo, aging.outstanding)} disabled={aging.outstanding <= 0} style={{ background: aging.outstanding > 0 ? '#3b82f6' : '#cbd5e1', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '0.75rem', color: '#fff', cursor: aging.outstanding > 0 ? 'pointer' : 'not-allowed', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <DollarSign size={12} /> Allow Payment
                    </button>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <button onClick={() => alert(`Viewing bill ${p.billNo}`)} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '4px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>View</button>
                  </td>
                </tr>
                );
              })}
              {filteredPayables.length === 0 && (
                <tr>
                  <td colSpan="13" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No payable records found.
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
