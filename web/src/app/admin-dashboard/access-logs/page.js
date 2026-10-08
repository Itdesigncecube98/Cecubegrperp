'use client';

import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, User, Laptop, Clock, Filter, Search, ChevronDown, ChevronUp } from 'lucide-react';

function describeActivity(log) {
  if (log.action === 'MODULE_OPEN') return log.subModule || 'Opened module';
  const verbs = {
    CREATE: 'Created', UPDATE: 'Edited', DELETE: 'Deleted', APPROVE: 'Approved',
    REJECT: 'Rejected', EMAIL_SEND: 'Sent email for', STATUS_CHANGE: 'Changed status of',
  };
  const entity = String(log.entityType || 'record').replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  let details = {};
  try { details = JSON.parse(log.newValues || '{}'); } catch { /* Older audit entries may contain plain text. */ }
  const label = ['projectName', 'taskName', 'companyName', 'customerName', 'vendorName', 'supplierName', 'contractorName', 'employeeName', 'title', 'name', 'poNo', 'woNo', 'billNo', 'raBillNo', 'invoiceNumber', 'leadId', 'enquiryId']
    .map(key => details[key])
    .find(value => value !== undefined && value !== null && String(value).trim());
  const record = label ? `: ${String(label)}` : log.entityId ? ` #${log.entityId}` : '';
  return `${verbs[log.action] || String(log.action || 'Updated').replace(/_/g, ' ')} ${entity}${record}`;
}

function getActivityDetails(log) {
  try {
    const details = JSON.parse(log.newValues || '{}');
    return Object.entries(details).filter(([key, value]) => key !== 'apiPath' && key !== 'action' && value !== '' && value !== null && value !== undefined);
  } catch {
    return [];
  }
}

export default function AccessLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/audit-log?limit=200', { cache: 'no-store' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Unable to load access logs (${res.status}).`);
      }
      const data = await res.json();
      setLogs(data.data || []);
    } catch (err) {
      console.error('Failed to fetch access logs', err);
      setLoadError(err.message || 'Unable to load access logs.');
    } finally {
      setLoading(false);
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

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    return (
      (log.ipAddress && log.ipAddress.toLowerCase().includes(term)) ||
      (log.remarks && log.remarks.toLowerCase().includes(term)) ||
      (log.module && log.module.toLowerCase().includes(term)) ||
      (describeActivity(log).toLowerCase().includes(term)) ||
      (log.newValues && log.newValues.toLowerCase().includes(term)) ||
      (log.userAgent && log.userAgent.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={24} color="#6366f1" />
            Access & Login Logs
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Track who has accessed the application and from which IP addresses.
          </p>
        </div>
        <button 
          onClick={fetchLogs} 
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', background: '#6366f1', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '14px',
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh Logs
        </button>
      </div>

      <div style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        {loadError && <div role="alert" style={{ margin: 16, padding: '10px 12px', color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>{loadError} If you just updated local authentication, sign out and sign in again to refresh the session.</div>}
        {/* Toolbar */}
        <div style={{ 
          padding: '16px', 
          borderBottom: '1px solid #e2e8f0', 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by IP, name, or browser..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 36px',
                borderRadius: '6px', border: '1px solid #cbd5e1',
                fontSize: '14px', outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
            <Filter size={16} /> Filtered: {filteredLogs.length}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: 1320, borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569', textTransform: 'uppercase', fontSize: '12px' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>User / Account</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Module</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>IP Address</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Client / Browser</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" /> Loading logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No access logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <React.Fragment key={log.id}>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} />
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: 24, height: 24, borderRadius: '50%', 
                          background: log.subModule === 'Admin Portal' ? '#ef4444' : '#3b82f6', 
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11
                        }}>
                          {log.subModule === 'Admin Portal' ? 'A' : 'E'}
                        </div>
                        {log.remarks || log.userId || log.employeeId || 'Unknown User'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      <div style={{ fontWeight: 600 }}>{log.module || '—'}</div>
                      <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{describeActivity(log)}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#334155' }}>
                      {log.ipAddress || 'unknown'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                        background: log.status === 'SUCCESS' ? '#dcfce7' : '#fee2e2',
                        color: log.status === 'SUCCESS' ? '#166534' : '#991b1b'
                      }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Laptop size={14} />
                        {log.userAgent || 'unknown'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(current => current === log.id ? null : log.id)}
                        aria-expanded={expandedLogId === log.id}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {expandedLogId === log.id ? 'Hide' : 'View'} <span>details</span>
                        {expandedLogId === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                  </tr>
                  {expandedLogId === log.id && (
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <td colSpan="7" style={{ padding: '16px 22px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginBottom: 12, color: '#475569', fontSize: 12 }}>
                          <span><strong>Page:</strong> {log.subModule || '—'}</span>
                          <span><strong>Action:</strong> {log.action}</span>
                          <span><strong>Record:</strong> {log.entityType || '—'}{log.entityId ? ` · ${log.entityId}` : ''}</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 7 }}>Values submitted with this action</div>
                        {getActivityDetails(log).length ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                            {getActivityDetails(log).map(([key, value]) => (
                              <div key={key} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', overflowWrap: 'anywhere' }}>
                                <div style={{ color: '#64748b', fontSize: 11, marginBottom: 3 }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase())}</div>
                                <div style={{ color: '#0f172a', fontSize: 12 }}>{String(value)}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: '#64748b', fontSize: 12 }}>No field-level details were captured for this event.</div>
                        )}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
