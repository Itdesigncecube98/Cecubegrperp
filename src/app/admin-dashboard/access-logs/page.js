'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, RefreshCw, Clock } from 'lucide-react';

function formatPermissionList(value) {
  const names = Array.isArray(value) ? value : String(value || '').split(',').map(name => name.trim()).filter(Boolean);
  return names.length ? names.map(name => `• ${name}`).join('\n') : '• None';
}

function describeActivity(log) {
  const verbs = { CREATE: 'Created', UPDATE: 'Updated', DELETE: 'Deleted' };
  const verb = verbs[log.action] || String(log.action || 'Updated').replace(/_/g, ' ');
  const entity = String(log.entityType || 'record').replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  let details = {};
  try { details = JSON.parse(log.newValues || '{}'); } catch { /* Keep legacy audit rows readable. */ }
  const label = [
    'employeeCode', 'employeeName', 'employeeId', 'projectName', 'taskName', 'companyName', 'customerName', 'vendorName', 'supplierName',
    'contractorName', 'title', 'name', 'poNo', 'woNo', 'billNo',
    'raBillNo', 'invoiceNumber', 'leadId', 'enquiryId', 'ownerId', 'employeeId',
  ].map(key => details[key]).find(value => value !== undefined && value !== null && String(value).trim());
  return `${verb} ${entity}${label ? `: ${String(label)}` : log.entityId ? ` #${log.entityId}` : ''}`;
}

function formatLogDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(value || '');
  return `${match[3]} ${new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)).toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' })} ${match[1]}`;
}

function describeDetails(log) {
  let details = {};
  try { details = JSON.parse(log.newValues || '{}'); } catch { return ''; }

  if (/attendance/i.test(`${log.entityType || ''} ${details.apiPath || ''}`)) {
    let slots = details.timeSlots;
    if (typeof slots === 'string') {
      try { slots = JSON.parse(slots); } catch { slots = []; }
    }
    const punchSlots = Array.isArray(slots) ? slots.filter(slot => slot && (slot.in || slot.out)) : [];
    const punches = punchSlots.flatMap((slot, index) => [
      slot.in && `Slot ${index + 1} IN ${slot.in}`,
      slot.out && `Slot ${index + 1} OUT ${slot.out}`,
    ].filter(Boolean));
    const punchTime = details.punchTime
      ? (/^\d{1,2}:\d{2}(:\d{2})?$/.test(String(details.punchTime))
        ? String(details.punchTime)
        : new Date(details.punchTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }))
      : '';
    return [
      formatLogDate(details.date),
      details.status,
      details.shiftType && `${details.shiftType} Shift`,
      details.direction && `Punch ${String(details.direction).toUpperCase()}`,
      punchTime && `Time ${punchTime}`,
      ...Object.entries(details).filter(([key]) => /^slot\d+(in|out)$/i.test(key)).map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').replace(/^./, letter => letter.toUpperCase())} ${value}`),
      punches.length ? punches.join(' · ') : details.direction || details.punchTime ? '' : 'No punch times captured',
    ].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(' · ');
  }

  if (/employee.?tools/i.test(`${log.entityType || ''} ${details.apiPath || ''}`)) {
    return [
      (details.employeeCode || details.employeeName || details.employeeId) && `Employee: ${details.employeeCode || details.employeeName || details.employeeId}`,
      details.module && `Module: ${details.module}`,
      details.projectName && `Project: ${details.projectName}`,
      details.libraryName && `Library: ${details.libraryName}`,
      details.grantedTools !== undefined && `Granted permissions:\n${formatPermissionList(details.grantedTools)}`,
      details.revokedTools !== undefined && `Revoked permissions:\n${formatPermissionList(details.revokedTools)}`,
    ].filter(Boolean).join(' · ');
  }

  const displayDetails = Object.entries(details)
    .filter(([key, value]) => !['apiPath', 'timeSlots', 'projectId', 'toolIds'].includes(key) && value !== undefined && value !== null && String(value).trim())
    .slice(0, 30)
    .map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, letter => letter.toUpperCase());
      return `${label}: ${String(value)}`;
    });
  return displayDetails
    .join(' · ');
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
      const res = await fetch(`/api/admin/audit-log?limit=200&page=${page}&actions=CREATE,UPDATE,DELETE&status=SUCCESS`, { cache: 'no-store' });
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
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin-dashboard/employee-tools" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', color: '#334155', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Employee Tool Permissions
          </Link>
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        {loadError && <div role="alert" style={{ margin: 16, padding: '10px 12px', color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>{loadError}</div>}
        <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 14 }}>
          {loading ? 'Loading…' : `${logs.length} of ${totalLogs} create/edit/delete records`}
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
                <tr><td colSpan="3" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No create, update, or delete records found.</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    <Clock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {log.remarks === 'Biometric Sync' ? 'Biometric Sync' : log.actorEmployeeCode || (log.employeeId ? 'Employee ID unavailable' : 'Admin')}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155' }}>
                    <div style={{ fontWeight: 600 }}>{describeActivity(log)}</div>
                    {describeDetails(log) && <div style={{ marginTop: 4, color: '#64748b', fontSize: 12, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{describeDetails(log)}</div>}
                  </td>
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
