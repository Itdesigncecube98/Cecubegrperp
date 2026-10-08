'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, ChevronRight, FileText, Pencil, FileDown, RefreshCw, AlertCircle, Mail } from 'lucide-react';
import '../../contracting.css';
import { usePermissions } from '@/context/PermissionsContext';
import { employeeToolCode } from '@/lib/employeeToolCatalog';
import { getClientActor } from '@/lib/clientActor';

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '-';
const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function WorkOrderBrowse() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingId, setSendingId] = useState('');
  const { activeEmployee, activeProject, hasRight } = usePermissions();
  const can = name => !activeEmployee || (!!activeProject && hasRight(employeeToolCode('Contracting', name)));
  const canList = can('Raise Work Order') || can('Browse Work Order') || can('Edit Work Order') || can('Send Work Order by Email');

  const sendWorkOrderEmail = async order => {
    setSendingId(order.id);
    try {
      const response = await fetch('/api/documents/send-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType: 'work-order', id: order.id, sentBy: getClientActor() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to email work order.');
      alert(result.mocked ? `Email is configured in demo mode for ${result.recipient}.` : `Work order emailed to ${result.recipient}.`);
    } catch (err) { alert(err.message); }
    finally { setSendingId(''); }
  };

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
          {can('Raise Work Order') && <Link href="/contracting/work-order/raise" className="btn-cyan" style={{ textDecoration: 'none' }}>New Work Order</Link>}
        </div>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          {!canList ? <div style={{ padding: 24, color: '#64748b' }}>Work Order View access is required to browse the register.</div> :
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead style={{ background: '#f1f5f9' }}>
                <tr>{['WO No.', 'Project', 'Contractor', 'WO Date', 'Contract Amount', 'Status', 'Last edited by', 'Actions'].map(header => <th key={header} style={{ padding: '12px', textAlign: header === 'Contract Amount' ? 'right' : 'left', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>{header}</th>)}</tr>
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
                    <td style={{ padding: '11px 12px', fontSize: 12, color: '#64748b' }}>{order.editedBy ? <>{order.editedBy}<div>{order.editedAt ? new Date(order.editedAt).toLocaleString('en-IN') : ''}</div></> : '—'}</td>
                    <td style={{ padding: '11px 12px', display: 'flex', gap: 10 }}>
                      {can('Edit Work Order') && <Link href={`/contracting/work-order/raise?id=${order.id}`} title="Edit work order" style={{ color: '#0369a1' }}><Pencil size={16} /></Link>}
                      {can('Browse Work Order') && <Link href={`/contracting/work-order/raise?id=${order.id}&print=1`} target="_blank" title="Create PDF / print work order" style={{ color: '#b45309' }}><FileDown size={16} /></Link>}
                      {can('Send Work Order by Email') && <button type="button" disabled={sendingId === order.id} onClick={() => sendWorkOrderEmail(order)} title="Email work order" style={{ border: 0, background: 'transparent', color: '#047857', cursor: 'pointer' }}><Mail size={16} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          }
        </div>
      </div>
    </div>
  );
}
