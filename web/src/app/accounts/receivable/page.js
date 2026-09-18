'use client';
import React, { useState } from 'react';
import { Search, Filter, FileText, Download, Building2, Trash2, Edit2 } from 'lucide-react';

export default function ClientReceivable() {
  const [searchTerm, setSearchTerm] = useState('');

  const [receivables, setReceivables] = useState([
    { id: 1, invoiceNo: 'INV-2026-101', client: 'Govt Infrastructure Dept', project: 'Metro Line 3', invoiceValue: 12500000, amountReceived: 10000000, balance: 2500000, dueDate: '2026-09-01', status: 'Overdue' },
    { id: 2, invoiceNo: 'INV-2026-105', client: 'Green Energy Corp', project: 'Solar Park EPC', invoiceValue: 5400000, amountReceived: 0, balance: 5400000, dueDate: '2026-09-25', status: 'Unpaid' },
    { id: 3, invoiceNo: 'INV-2026-098', client: 'City Municipal Corp', project: 'Water Treatment Plant', invoiceValue: 8900000, amountReceived: 8900000, balance: 0, dueDate: '2026-08-15', status: 'Fully Received' }
  ]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this receivable?')) return;
    
    try {
      // TODO: Add API call when backend is ready
      setReceivables(receivables.filter(r => r.id !== id));
      alert('Receivable deleted successfully');
    } catch (error) {
      console.error(error);
      alert('Failed to delete receivable');
    }
  };

  const handleEdit = (id) => {
    alert(`Edit functionality for receivable ID: ${id} - Navigate to invoice form`);
    // TODO: Navigate to invoice/receipt form with prefilled data
  };

  const handleRecordReceipt = (invoiceNo, balance) => {
    alert(`Opening receipt form for Invoice: ${invoiceNo}, Balance: ${balance}`);
    // TODO: Navigate to receipt voucher creation with invoice details
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  const filteredReceivables = receivables.filter(r => 
    r.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.project.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Accounts Receivable</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Track client invoices from Billing and manage receipts</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', color: '#334155', cursor: 'pointer', fontWeight: '500' }}>
            <Download size={16} /> Export Ageing
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ position: 'relative', width: '350px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by Invoice No, Client, or Project..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
            <Filter size={16} /> Filter Status
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.875rem' }}>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Invoice No.</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Client & Project</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Total Value</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Amount Received</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Balance</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceivables.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} color="#64748b" /> {r.invoiceNo}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '500', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={12} color="#94a3b8" /> {r.client}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px' }}>{r.project}</div>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '500', color: '#1e293b' }}>
                    {formatCurrency(r.invoiceValue)}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', color: '#059669', fontWeight: '500' }}>
                    {formatCurrency(r.amountReceived)}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '600', color: r.balance > 0 ? '#b91c1c' : '#475569' }}>
                    {formatCurrency(r.balance)}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      background: r.status === 'Fully Received' ? '#dcfce7' : r.status === 'Overdue' ? '#fee2e2' : '#fef9c3', 
                      color: r.status === 'Fully Received' ? '#166534' : r.status === 'Overdue' ? '#991b1b' : '#854d0e', 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' 
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {r.balance > 0 && (
                      <button onClick={() => handleRecordReceipt(r.invoiceNo, r.balance)} style={{ background: '#3b82f6', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '0.75rem', color: '#fff', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Record Receipt
                      </button>
                    )}
                    <button onClick={() => handleEdit(r.id)} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '4px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Edit2 size={12} /> Edit
                    </button>
                    <button onClick={() => handleDelete(r.id)} style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '4px', fontSize: '0.75rem', color: '#dc2626', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filteredReceivables.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No client invoices found.
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
