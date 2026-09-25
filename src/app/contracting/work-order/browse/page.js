'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, ChevronRight, FileText, Pencil, FileDown, RefreshCw, AlertCircle } from 'lucide-react';
import '../../contracting.css';

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '-';
const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function WorkOrderBrowse() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/contracting/work-orders?_t=${Date.now()}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load work orders.');
      setWorkOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load work orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="contracting-container">
      <div className="contracting-header">
        <div className="contracting-header-title"><FileText size={18} /> WO Browse</div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> WO Browse
        </div>
      </div>
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {error && <div style={{ color: '#991b1b', background: '#fef2f2', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}><AlertCircle size={16} /> {error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
          <button type="button" className="btn-cyan" onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={14} /> Refresh</button>
          <Link href="/contracting/work-order/raise" className="btn-cyan" style={{ textDecoration: 'none' }}>New Work Order</Link>
        </div>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead style={{ background: '#f1f5f9' }}>
                <tr>{['WO No.', 'Project', 'Contractor', 'WO Date', 'Contract Amount', 'Status', 'Edit', 'PDF'].map(header => <th key={header} style={{ padding: '12px', textAlign: header === 'Contract Amount' ? 'right' : 'left', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>{header}</th>)}</tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading work orders...</td></tr> : workOrders.length === 0 ? <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No saved work orders found.</td></tr> : workOrders.map((order, index) => (
                  <tr key={order.id} style={{ background: index % 2 ? '#fafafa' : 'white' }}>
                    <td style={{ padding: '11px 12px', fontWeight: 600, color: '#0f766e' }}>{order.woNo}</td>
                    <td style={{ padding: '11px 12px' }}>{order.project?.name || '-'}</td>
                    <td style={{ padding: '11px 12px' }}>{order.contractorName}</td>
                    <td style={{ padding: '11px 12px' }}>{formatDate(order.startDate)}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(order.contractValue)}</td>
                    <td style={{ padding: '11px 12px' }}>{order.status}</td>
                    <td style={{ padding: '11px 12px' }}><Link href={`/contracting/work-order/raise?id=${order.id}`} title="Edit work order" style={{ color: '#0369a1' }}><Pencil size={16} /></Link></td>
                    <td style={{ padding: '11px 12px' }}><Link href={`/contracting/work-order/raise?id=${order.id}&print=1`} target="_blank" title="Create PDF / print work order" style={{ color: '#b45309' }}><FileDown size={16} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
