'use client';
import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, FileText, Download, Mail } from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/context/PermissionsContext';
import { employeeToolCode } from '@/lib/employeeToolCatalog';
import { getClientActor } from '@/lib/clientActor';

export default function PORegister() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sendingId, setSendingId] = useState('');
  const { activeEmployee, activeProject, hasRight } = usePermissions();
  const can = name => !activeEmployee || (!!activeProject && hasRight(employeeToolCode('Purchase', name)));
  const canList = can('Purchase Orders View') || can('Purchase Orders Edit') || can('Purchase Orders Approve') || can('Send Purchase Order by Email');

  const sendPOEmail = async po => {
    setSendingId(po.id);
    try {
      const response = await fetch('/api/documents/send-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType: 'purchase-order', id: po.id, sentBy: getClientActor() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send purchase order.');
      alert(result.mocked ? `Email is configured in demo mode for ${result.recipient}.` : `Purchase order emailed to ${result.recipient}.`);
    } catch (error) { alert(error.message); }
    finally { setSendingId(''); }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/purchase/po');
        if (res.ok) setPos(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  const filteredPos = pos.filter(po => {
    const matchesSearch = 
      po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.projectName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const approvePO = async (id) => {
    const res = await fetch('/api/purchase/po', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'approve' }) });
    if (res.ok) setPos(current => current.map(po => po.id === id ? { ...po, status: 'Approved' } : po));
  };

  return (
    <div className="pur-page-container">
      <div className="pur-header">
        <div>
          <h1 className="pur-title">Purchase Order Register</h1>
          <p className="pur-subtitle">Manage POs and delivery schedules</p>
        </div>
        {can('Purchase Orders Create') && <Link href="/purchase/po/create" className="pur-btn pur-btn-primary" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
          <Plus size={16} /> New PO
        </Link>}
      </div>

      <div className="pur-card">
        <div className="pur-toolbar">
          <div className="pur-search">
            <Search className="pur-search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search by PO No, Vendor, Project..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pur-search-input"
            />
          </div>
          <div className="pur-flex pur-items-center" style={{ gap: '12px' }}>
            <Filter size={16} className="pur-text-muted" />
            <select 
              className="pur-select" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '0.875rem', width: 'auto' }}
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="SENT">Sent to Accounts</option>
              <option value="PARTIALLY_RECEIVED">Partially Received</option>
              <option value="FULLY_RECEIVED">Fully Received</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="pur-table-wrapper">
          {!canList ? (
            <div className="pur-text-center pur-text-muted pur-py-8">You need Purchase Orders View access to see the register.</div>
          ) : loading ? (
            <div className="pur-loading"><div className="pur-spinner"></div></div>
          ) : (
            <table className="pur-table">
              <thead>
                <tr>
                  <th>PO No & Date</th>
                  <th>Vendor</th>
                  <th>Project / PR Ref</th>
                  <th>Value</th>
                  <th>Exp. Delivery</th>
                  <th>Last edited by</th>
                  <th>Status</th>
                  <th className="pur-text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPos.map(po => (
                  <tr key={po.id}>
                    <td>
                      <div className="pur-font-semibold">{po.poNumber}</div>
                      <div className="pur-text-xs pur-text-muted">{new Date(po.poDate).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <div className="pur-font-medium">{po.supplierName || '—'}</div>
                      <div className="pur-text-xs pur-text-muted">{po.supplierGstin || po.supplierId || '—'}</div>
                    </td>
                    <td>
                      <div>{po.projectName || '—'}</div>
                      <div className="pur-text-xs pur-text-muted">Status: {po.status}</div>
                    </td>
                    <td className="pur-font-semibold">{formatCurrency(po.totalAmount)}</td>
                    <td>{po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : '—'}</td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{po.editedBy ? <>{po.editedBy}<div>{po.editedAt ? new Date(po.editedAt).toLocaleString('en-IN') : ''}</div></> : '—'}</td>
                    <td>
                      <span className={`pur-badge ${
                        po.status === 'APPROVED' ? 'pur-badge-emerald' :
                        po.status === 'DRAFT' ? 'pur-badge-slate' :
                        po.status === 'SENT' ? 'pur-badge-blue' :
                        po.status === 'CANCELLED' ? 'pur-badge-red' :
                        po.status === 'FULLY_RECEIVED' ? 'pur-badge-indigo' :
                        'pur-badge-amber'
                      }`}>
                        {po.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="pur-text-right pur-flex" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                      {po.status === 'DRAFT' && can('Purchase Orders Approve') && <button className="pur-btn pur-btn-outline" onClick={() => approvePO(po.id)}>Approve</button>}
                      {can('Purchase Orders View') && <Link href={`/purchase/po/print?id=${po.id}`} target="_blank" className="pur-icon-btn pur-text-indigo-600" title="Download PDF">
                        <Download size={16} />
                      </Link>}
                      {can('Purchase Orders Edit') && <Link href={`/purchase/po/create?id=${po.id}`} className="pur-btn pur-btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Edit</Link>}
                      {can('Send Purchase Order by Email') && <button className="pur-icon-btn" title="Email purchase order" disabled={sendingId === po.id || !po.supplierEmail} onClick={() => sendPOEmail(po)}><Mail size={15} /></button>}
                    </td>
                  </tr>
                ))}
                {filteredPos.length === 0 && (
                  <tr>
                    <td colSpan="8" className="pur-text-center pur-text-muted pur-py-8">
                      No purchase orders found.
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
