'use client';

import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, User, Laptop, Clock, Filter, Search } from 'lucide-react';
export default function AccessLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-log?module=AUTH&action=LOGIN&limit=100');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch access logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    return (
      (log.ipAddress && log.ipAddress.toLowerCase().includes(term)) ||
      (log.remarks && log.remarks.toLowerCase().includes(term)) ||
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569', textTransform: 'uppercase', fontSize: '12px' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>User / Account</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>IP Address</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Client / Browser</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" /> Loading logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No access logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
