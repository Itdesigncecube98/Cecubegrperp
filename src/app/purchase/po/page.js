'use client';
import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Download, Mail, Trash2, Clock, X } from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/context/PermissionsContext';
import { employeeToolCode } from '@/lib/employeeToolCatalog';
import { getClientActor } from '@/lib/clientActor';

const withinApprovalWindow = value => !!value && Date.now() - new Date(value).getTime() <= 2 * 24 * 60 * 60 * 1000;

export default function PORegister() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sendingId, setSendingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [approvalId, setApprovalId] = useState('');
  const [timelinePO, setTimelinePO] = useState(null);
  const { activeEmployee, activeProject, hasRight } = usePermissions();
  const can = name => !activeEmployee || (!!activeProject && hasRight(employeeToolCode('Purchase', name)));
  const isAssignedApprover = po => !!activeEmployee?.id && po.approvalWorkflow?.currentApproverIds?.includes(activeEmployee.id);
  const canApprovePO = po => po.approvalWorkflow?.currentStage === 0
    ? can('Purchase Orders Approve')
    : po.approvalWorkflow?.required
      ? isAssignedApprover(po)
      : can('Purchase Orders Approve');
  const canList = can('Purchase Orders View') || can('Purchase Orders Edit') || can('Purchase Orders Approve') || can('Purchase Orders Delete') || can('Purchase Orders Create') || can('Send Purchase Order by Email') || pos.some(isAssignedApprover);

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

  const togglePOApproval = async po => {
    setApprovalId(po.id);
    const approvedBy = getClientActor();
    try {
      const res = await fetch('/api/purchase/po', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: po.id, action: po.status === 'APPROVED' ? 'unapprove' : 'approve', approvedBy, approvedByName: approvedBy }) });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Unable to update purchase order approval.');
      setPos(current => current.map(item => item.id === po.id ? { ...item, ...result } : item));
    } catch (error) { alert(error.message); }
    finally { setApprovalId(''); }
  };

  const deletePO = async po => {
    if (!window.confirm(`Delete draft purchase order ${po.poNumber}?`)) return;
    setDeletingId(po.id);
    try {
      const response = await fetch(`/api/purchase/po?id=${encodeURIComponent(po.id)}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to delete purchase order.');
      setPos(current => current.filter(item => item.id !== po.id));
    } catch (error) { alert(error.message); }
    finally { setDeletingId(''); }
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
                  <th>Made by</th>
                  <th>Approver</th>
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
                    <td>{po.preparedByName || po.preparedBy || '—'}</td>
                    <td>{po.approvalWorkflow?.required && !po.approvalWorkflow.complete
                      ? po.approvalWorkflow.currentStage === 0
                        ? `Purchase Manager · ${po.approvalWorkflow.currentStageApprovedCount}/${po.approvalWorkflow.currentStageApproverCount}`
                        : `Level ${po.approvalWorkflow.currentStage}/${po.approvalWorkflow.stageCount} · ${po.approvalWorkflow.currentStageApprovedCount}/${po.approvalWorkflow.currentStageApproverCount}`
                      : po.approvedByName || po.approvedBy || '—'}</td>
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
                      <button type="button" className="pur-icon-btn" aria-label="View PO status history" title="View PO status history" onClick={() => setTimelinePO(po)}><Clock size={16} /></button>
                      {['DRAFT', 'PENDING_APPROVAL'].includes(po.status)
                        && canApprovePO(po)
                        && <button className="pur-btn pur-btn-outline" disabled={approvalId === po.id} onClick={() => togglePOApproval(po)}>{approvalId === po.id ? 'Saving…' : po.approvalWorkflow?.currentStage === 0 ? 'Purchase Manager Approve' : po.approvalWorkflow?.required ? `Approve L${po.approvalWorkflow.currentStage}` : 'Approve'}</button>}
                      {po.status === 'APPROVED' && withinApprovalWindow(po.approvedAt) && can('Purchase Orders Approve') && <button className="pur-btn pur-btn-outline" disabled={approvalId === po.id} onClick={() => togglePOApproval(po)}>{approvalId === po.id ? 'Saving…' : 'Unapprove (2 day window)'}</button>}
                      {can('Purchase Orders View') && po.approvedAt && <Link href={`/purchase/po/print?id=${po.id}`} target="_blank" className="pur-icon-btn pur-text-indigo-600" title="Download PDF">
                        <Download size={16} />
                      </Link>}
                      {can('Purchase Orders Edit') && !po.approvedAt && <Link href={`/purchase/po/create?id=${po.id}`} className="pur-btn pur-btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Edit</Link>}
                      {can('Purchase Orders Delete') && (po.status === 'DRAFT' || (po.status === 'PENDING_APPROVAL' && po.approvalWorkflow?.currentStage === 0)) && <button type="button" className="pur-icon-btn" title="Delete purchase order before approval" disabled={deletingId === po.id} onClick={() => deletePO(po)}><Trash2 size={15} /></button>}
                      {can('Send Purchase Order by Email') && <button className="pur-icon-btn" title="Email purchase order" disabled={sendingId === po.id || !po.supplierEmail} onClick={() => sendPOEmail(po)}><Mail size={15} /></button>}
                    </td>
                  </tr>
                ))}
                {filteredPos.length === 0 && (
                  <tr>
                    <td colSpan="10" className="pur-text-center pur-text-muted pur-py-8">
                      No purchase orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {timelinePO && <div role="presentation" onClick={() => setTimelinePO(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(15, 23, 42, .45)' }}>
        <section role="dialog" aria-modal="true" aria-labelledby="po-timeline-title" onClick={event => event.stopPropagation()} style={{ width: '100%', maxWidth: 620, maxHeight: '80vh', overflowY: 'auto', padding: 22, borderRadius: 12, background: '#fff', boxShadow: '0 20px 50px rgba(15,23,42,.25)' }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
            <h2 id="po-timeline-title" style={{ margin: 0, color: '#0f172a', fontSize: 18 }}>PO Status History · {timelinePO.poNumber}</h2>
            <button type="button" aria-label="Close timeline" onClick={() => setTimelinePO(null)} style={{ display: 'inline-flex', padding: 6, border: 0, borderRadius: 6, background: 'transparent', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
          </header>
          {timelinePO.statusHistory?.length ? <div style={{ display: 'grid', gap: 13 }}>
            {timelinePO.statusHistory.map(entry => <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '12px 1fr', gap: 11 }}>
              <span style={{ width: 10, height: 10, marginTop: 5, borderRadius: '50%', background: '#2563eb' }} />
              <div>
                <div style={{ color: '#1e293b', fontSize: 13, fontWeight: 700 }}>{entry.fromStatus ? `${entry.fromStatus.replaceAll('_', ' ')} → ` : ''}{entry.toStatus?.replaceAll('_', ' ') || 'Updated'}</div>
                <div style={{ marginTop: 3, color: '#64748b', fontSize: 12 }}>{entry.actorName || 'Unknown user'} · {entry.changedAt ? new Date(entry.changedAt).toLocaleString('en-IN') : 'No date recorded'}{entry.note ? ` · ${entry.note}` : ''}</div>
              </div>
            </div>)}
          </div> : <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>No status changes have been recorded yet.</p>}
        </section>
      </div>}
    </div>
  );
}
