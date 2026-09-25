'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Search, Download, Filter, RefreshCw, CheckCircle, XCircle, Eye } from 'lucide-react';

const MODULE_COLORS = { HR:'#6366f1',Admin:'#0f172a',Engineering:'#0ea5e9',Purchase:'#f59e0b',Store:'#10b981',Planning:'#8b5cf6',Site:'#ef4444',Accounts:'#14b8a6',Marketing:'#f97316',Tender:'#06b6d4',Quality:'#22c55e',Safety:'#dc2626' };

export default function AuditLogPage() {
  const [logs,     setLogs]     = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters,  setFilters]  = useState({ module: '', action: '', status: '', dateFrom: '', dateTo: '', search: '' });
  const [page,     setPage]     = useState(1);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) });
    const res = await fetch(`/api/admin/audit-log?${params}`).then(r => r.json()).catch(() => ({ data: [], total: 0 }));
    setLogs(res.data || []);
    setTotal(res.total || 0);
    setLoading(false);
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

  const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'FORCE_LOGOUT', 'EXPORT'];
  const MODULES = ['', 'HR', 'Admin', 'Engineering', 'Purchase', 'Store', 'Planning', 'Site', 'Accounts', 'Marketing', 'Tender', 'Quality', 'Safety'];

  const exportCSV = () => {
    const headers = ['Date/Time', 'User', 'Module', 'Sub-Module', 'Action', 'Entity', 'Record ID', 'Status'];
    const rows = logs.map(l => [
      new Date(l.createdAt).toLocaleString(),
      l.user?.displayName || 'System',
      l.module, l.subModule || '',
      l.action, l.entityType || '', l.entityId || '', l.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audit-log.csv'; a.click();
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={22} color="#8b5cf6" /> Audit Log
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Complete activity trail · <strong>{total.toLocaleString()}</strong> total events</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={ghostBtn}><RefreshCw size={14} /></button>
          <button onClick={exportCSV} style={ghostBtn}><Download size={14} /> Export CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
          <input value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="Search…" style={{ ...inp, paddingLeft: 32 }} />
        </div>
        <select value={filters.module} onChange={e => setFilter('module', e.target.value)} style={inp}>
          {MODULES.map(m => <option key={m} value={m}>{m || 'All Modules'}</option>)}
        </select>
        <select value={filters.action} onChange={e => setFilter('action', e.target.value)} style={inp}>
          {ACTIONS.map(a => <option key={a} value={a}>{a || 'All Actions'}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilter('status', e.target.value)} style={inp}>
          <option value="">All Status</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
        </select>
        <input type="date" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)} style={inp} title="From date" />
        <input type="date" value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)} style={inp} title="To date" />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Table */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading audit log…</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Date/Time', 'User', 'Module', 'Action', 'Record', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const mc = MODULE_COLORS[log.module] || '#6366f1';
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.1s', cursor: 'pointer' }}
                        onClick={() => setSelected(s => s?.id === log.id ? null : log)}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{log.user?.displayName || <span style={{ color: '#94a3b8' }}>System</span>}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: `${mc}15`, color: mc }}>
                            {log.module}
                          </span>
                          {log.subModule && <span style={{ marginLeft: 4, fontSize: 11, color: '#94a3b8' }}>› {log.subModule}</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: '#475569' }}>{log.action}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>
                          {log.entityType && <span>{log.entityType}</span>}
                          {log.entityId && <span style={{ color: '#94a3b8', marginLeft: 4 }}>#{log.entityId.slice(0, 8)}</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {log.status === 'SUCCESS'
                            ? <CheckCircle size={14} color="#10b981" />
                            : <XCircle size={14} color="#ef4444" />}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Eye size={13} color="#94a3b8" />
                        </td>
                      </tr>
                    );
                  })}
                  {logs.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No audit events found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ ...ghostBtn, padding: '6px 10px', fontSize: 12 }}>← Prev</button>
                <button disabled={page * limit >= total} onClick={() => setPage(p => p + 1)} style={{ ...ghostBtn, padding: '6px 10px', fontSize: 12 }}>Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div style={{ width: 300, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', height: 'fit-content', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Event Detail</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><XCircle size={16} /></button>
            </div>
            {[
              ['Date', new Date(selected.createdAt).toLocaleString()],
              ['User', selected.user?.displayName || 'System'],
              ['Module', selected.module],
              ['Sub-module', selected.subModule || '—'],
              ['Action', selected.action],
              ['Entity', selected.entityType || '—'],
              ['Record ID', selected.entityId || '—'],
              ['Status', selected.status],
              ['IP', selected.ipAddress || '—'],
              ['Remarks', selected.remarks || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>{k}</span>
                <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 500, textAlign: 'right', maxWidth: 160, wordBreak: 'break-word' }}>{v}</span>
              </div>
            ))}
            {selected.oldValues && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>OLD VALUES</div>
                <pre style={{ background: '#f8fafc', borderRadius: 6, padding: 10, fontSize: 10, color: '#374151', overflowX: 'auto', margin: 0 }}>{JSON.stringify(JSON.parse(selected.oldValues || '{}'), null, 2)}</pre>
              </div>
            )}
            {selected.newValues && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>NEW VALUES</div>
                <pre style={{ background: '#f0fdf4', borderRadius: 6, padding: 10, fontSize: 10, color: '#374151', overflowX: 'auto', margin: 0 }}>{JSON.stringify(JSON.parse(selected.newValues || '{}'), null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const inp     = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#374151', outline: 'none', background: '#fff' };
const ghostBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' };
