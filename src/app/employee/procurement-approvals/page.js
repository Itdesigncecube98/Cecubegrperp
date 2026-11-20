'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Clock, Eye, RefreshCw, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const formatCurrency = value => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(Number(value) || 0);

export default function ProcurementApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [previewDocumentKey, setPreviewDocumentKey] = useState('');
  const [error, setError] = useState('');

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/employee/procurement-approvals', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load approvals.');
      setApprovals(Array.isArray(result.data) ? result.data : []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load approvals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadApprovals(); }, [loadApprovals]);

  const approve = async document => {
    const key = `${document.documentType}:${document.documentId}`;
    setActionId(key);
    setError('');
    try {
      const endpoint = document.documentType === 'PURCHASE_ORDER' ? '/api/purchase/po' : '/api/contracting/work-orders';
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: document.documentId, action: 'approve' }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to approve document.');
      await loadApprovals();
    } catch (approvalError) {
      setError(approvalError.message || 'Unable to approve document.');
    } finally {
      setActionId('');
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: '#f8fafc' }}>
      <div style={{ maxWidth: 1050, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <Link href="/employee/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#334155', textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap' }}>
              <ArrowLeft size={15} /> Back
            </Link>
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 9, margin: 0, color: '#0f172a', fontSize: 22 }}>
                <ShieldCheck size={22} color="#0f766e" /> Purchase & Work Order Approvals
              </h1>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>All approvers at the current level must approve before the next authority is notified.</p>
            </div>
          </div>
          <button type="button" onClick={loadApprovals} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#334155', cursor: loading ? 'wait' : 'pointer' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </header>

        {error && <div role="alert" style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'grid', gap: 12 }}>
          {loading ? <div style={{ padding: 28, textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: 9 }}>Loading approvals…</div>
            : approvals.length === 0 ? <div style={{ padding: 28, textAlign: 'center', color: '#64748b', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9 }}>No purchase orders or work orders are waiting for your approval.</div>
              : approvals.map(document => {
                const key = `${document.documentType}:${document.documentId}`;
                const label = document.documentType === 'PURCHASE_ORDER' ? 'Purchase Order' : 'Work Order';
                const viewHref = document.documentType === 'PURCHASE_ORDER'
                  ? `/purchase/po/print?id=${encodeURIComponent(document.documentId)}&view=1`
                  : `/contracting/work-order/raise?id=${encodeURIComponent(document.documentId)}&view=1`;
                return (
                  <article key={key} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 16, padding: '16px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontWeight: 700, fontSize: 14 }}>
                        {label} {document.documentNumber}
                        <span style={{ padding: '3px 7px', borderRadius: 12, background: '#ecfeff', color: '#0e7490', fontSize: 10, fontWeight: 700 }}>
                          Level {document.approvalWorkflow.currentStage} of {document.approvalWorkflow.stageCount}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginTop: 7, color: '#64748b', fontSize: 12 }}>
                        <span>{document.projectName || 'No project'}</span>
                        <span>{document.counterparty || 'No supplier/contractor'}</span>
                        <span style={{ color: '#0f172a', fontWeight: 650 }}>{formatCurrency(document.amount)}</span>
                        <span>{document.approvalWorkflow.currentStageApprovedCount}/{document.approvalWorkflow.currentStageApproverCount} approvals at this level</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
                      <button type="button" onClick={() => setPreviewDocumentKey(previous => previous === key ? '' : key)} aria-expanded={previewDocumentKey === key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#334155', cursor: 'pointer', fontSize: 13, fontWeight: 650, whiteSpace: 'nowrap' }}>
                        <Eye size={15} /> {previewDocumentKey === key ? 'Hide Copy' : `View ${document.documentType === 'PURCHASE_ORDER' ? 'PO' : 'WO'} Copy`}
                      </button>
                      <Link href={viewHref} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label} copy in a new tab`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#334155', textDecoration: 'none', fontSize: 13, fontWeight: 650, whiteSpace: 'nowrap' }}>
                        Open Copy
                      </Link>
                      <button type="button" onClick={() => approve(document)} disabled={actionId === key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 13px', border: 0, borderRadius: 7, background: '#0f766e', color: '#fff', fontWeight: 700, cursor: actionId === key ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                        <Check size={15} /> {actionId === key ? 'Approving…' : 'Approve'}
                      </button>
                    </div>
                    {previewDocumentKey === key && (
                      <div style={{ gridColumn: '1 / -1', overflow: 'hidden', border: '1px solid #cbd5e1', borderRadius: 8, background: '#f8fafc' }}>
                        <iframe title={`${label} ${document.documentNumber} copy`} src={viewHref} style={{ display: 'block', width: '100%', height: 720, border: 0, background: '#fff' }} />
                      </div>
                    )}
                    <details style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
                      <summary style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12, fontWeight: 650, cursor: 'pointer' }}>
                        <Clock size={14} /> Approval history
                      </summary>
                      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                        {(document.approvalHistory || []).map((entry, index) => (
                          <div key={`${entry.stage}:${entry.approverName}:${index}`} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 10px', padding: '8px 10px', borderRadius: 7, background: '#f8fafc', color: '#475569', fontSize: 12 }}>
                            <strong style={{ color: '#1e293b' }}>{entry.stage === 0 ? entry.approverName : `Level ${entry.stage} · ${entry.approverName}`}</strong>
                            <span style={{ color: entry.status === 'APPROVED' ? '#15803d' : '#b45309', fontWeight: 700 }}>{entry.status === 'APPROVED' ? 'Approved' : 'Pending'}</span>
                            {entry.approvedAt && <span>{new Date(entry.approvedAt).toLocaleString('en-IN')}</span>}
                            {entry.threshold > 0 && <span>Threshold {formatCurrency(entry.threshold)}</span>}
                          </div>
                        ))}
                        {document.approvalHistory?.length === 0 && <span style={{ color: '#64748b', fontSize: 12 }}>No approval steps recorded.</span>}
                      </div>
                      {!!document.statusHistory?.length && (
                        <div style={{ display: 'grid', gap: 7, marginTop: 14 }}>
                          <strong style={{ color: '#334155', fontSize: 12 }}>Status history</strong>
                          {document.statusHistory.map(entry => (
                            <div key={entry.id} style={{ color: '#64748b', fontSize: 12 }}>
                              <strong style={{ color: '#475569' }}>{entry.fromStatus ? `${entry.fromStatus} → ` : ''}{entry.toStatus}</strong>
                              {' · '}{entry.actorName || 'Unknown user'}
                              {' · '}{entry.changedAt ? new Date(entry.changedAt).toLocaleString('en-IN') : 'No date recorded'}
                              {entry.note ? ` · ${entry.note}` : ''}
                            </div>
                          ))}
                        </div>
                      )}
                    </details>
                  </article>
                );
              })}
        </div>
      </div>
    </div>
  );
}
