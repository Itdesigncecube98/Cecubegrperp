'use client';

import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Clock } from 'lucide-react';

function describeActivity(log) {
  const verb = log.action === 'CREATE' ? 'Created' : 'Edited';
  const entity = String(log.entityType || 'record').replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  let details = {};
  try { details = JSON.parse(log.newValues || '{}'); } catch { /* Keep legacy audit rows readable. */ }
  const label = [
    'projectName', 'taskName', 'companyName', 'customerName', 'vendorName', 'supplierName',
    'contractorName', 'employeeName', 'title', 'name', 'poNo', 'woNo', 'billNo',
    'raBillNo', 'invoiceNumber', 'leadId', 'enquiryId', 'ownerId', 'employeeId',
  ].map(key => details[key]).find(value => value !== undefined && value !== null && String(value).trim());
  return `${verb} ${entity}${label ? `: ${String(label)}` : log.entityId ? ` #${log.entityId}` : ''}`;
}

export default function AccessLogsPage() {
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loadedPage, setLoadedPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');

  const fetchLogs = async (page = 1, append = false) => {
    if (append) setLoadingMore(true);
    setLoadError('');
    try {
      const res = await fetch(`/api/admin/audit-log?limit=200&page=${page}&actions=CREATE,UPDATE&status=SUCCESS`, { cache: 'no-store' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Unable to load access logs (${res.status}).`);
      }
      const data = await res.json();
      const incoming = data.data || [];
      setTotalLogs(Number(data.total || 0));
      setLogs(current => {
        if (append) {
          const existingIds = new Set(current.map(log => log.id));
          return [...current, ...incoming.filter(log => !existingIds.has(log.id))];
        }
        const incomingIds = new Set(incoming.map(log => log.id));
        return [...incoming, ...current.filter(log => !incomingIds.has(log.id))];
      });
      setLoadedPage(current => append ? page : Math.max(current, 1));
    } catch (err) {
      console.error('Failed to fetch access logs', err);
      setLoadError(err.message || 'Unable to load access logs.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const refreshOnFocus = () => fetchLogs();
    const timer = window.setInterval(fetchLogs, 15000);
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={24} color="#6366f1" /> Access Logs
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Shows who created or edited a record.</p>
        </div>
        <button
          onClick={() => fetchLogs()}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        {loadError && <div role="alert" style={{ margin: 16, padding: '10px 12px', color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>{loadError}</div>}
        <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 14 }}>
          {loading ? 'Loading…' : `${logs.length} of ${totalLogs} create/edit records`}
        </div>
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569', textTransform: 'uppercase', fontSize: 12 }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Time</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Employee ID / Actor</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading logs…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="3" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No create or edit records found.</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    <Clock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {log.actorEmployeeCode || (log.employeeId ? 'Employee ID unavailable' : 'Admin')}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155' }}>{describeActivity(log)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length < totalLogs && <div style={{ display: 'flex', justifyContent: 'center', padding: 16, borderTop: '1px solid #e2e8f0' }}>
          <button type="button" onClick={() => fetchLogs(loadedPage + 1, true)} disabled={loadingMore} style={{ padding: '9px 16px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#334155', fontWeight: 600, cursor: loadingMore ? 'wait' : 'pointer' }}>
            {loadingMore ? 'Loading older logs…' : 'Load older logs'}
          </button>
        </div>}
      </div>
    </div>
  );
}
