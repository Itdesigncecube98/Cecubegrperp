'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getPunchRequests, updatePunchRequestStatus } from '../../../lib/data';
import { Check, X, Clock, ArrowLeft, CalendarCheck, Map as MapIcon, RefreshCw } from 'lucide-react';
import { useAutoRefresh, formatRefreshTime } from '../../../lib/useAutoRefresh';
import './supervisor.css';

export default function SupervisorDashboard() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [requests, setRequests] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('punch');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadRequests = useCallback(async () => {
    if (!employee?.id) return;
    const data = await getPunchRequests(employee.id);
    setRequests(Array.isArray(data) ? data : []);
  }, [employee?.id]);

  const loadLeaveRequests = useCallback(async () => {
    if (!employee?.id) return;
    const res = await fetch(`/api/leaves?role=SUPERVISOR&userId=${employee.id}`);
    const data = await res.json();
    setLeaveRequests(Array.isArray(data) ? data : []);
  }, [employee?.id]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadRequests(), loadLeaveRequests()]);
  }, [loadRequests, loadLeaveRequests]);

  const { refresh, refreshing, lastRefreshed, autoRefresh, setAutoRefresh } = useAutoRefresh(refreshAll, {
    intervalMs: 10000,
    enabled: true
  });

  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (!empData) {
      router.replace('/login');
    } else {
      setEmployee(JSON.parse(empData));
    }
  }, [router]);

  useEffect(() => {
    if (!employee?.id) return;
    (async () => {
      setInitialLoading(true);
      setLeaveLoading(true);
      try {
        await refreshAll();
      } catch (e) {
        console.error(e);
      } finally {
        setInitialLoading(false);
        setLeaveLoading(false);
      }
    })();
  }, [employee?.id, refreshAll]);

  const handlePunchAction = async (id, status) => {
    try {
      setRequests(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
      await updatePunchRequestStatus(id, status);
      showToast(`Request ${status.toLowerCase()} successfully!`);
      refresh();
    } catch (e) {
      console.error('Failed to update status', e);
      showToast('Failed to update status', 'error');
      refresh();
    }
  };

  const handleLeaveAction = async (id, action) => {
    try {
      const res = await fetch('/api/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: action,
          approvedBy: employee.id,
          role: 'SUPERVISOR'
        })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      showToast(`Leave ${action === 'APPROVED' ? 'approved and sent to admin!' : 'rejected.'}`);
      loadLeaveRequests();
    } catch (e) {
      console.error('Failed to update leave', e);
      showToast('Failed to update leave request', 'error');
    }
  };

  if (!employee) return null;

  const tabStyle = (tab) => ({
    background: 'none',
    border: 'none',
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: activeTab === tab ? '700' : '500',
    color: activeTab === tab ? '#4f46e5' : '#6b7280',
    borderBottom: activeTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s'
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {toast && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999,
          background: toast.type === 'error' ? '#fee2e2' : '#d1fae5',
          color: toast.type === 'error' ? '#991b1b' : '#065f46',
          padding: '0.75rem 1.25rem', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 600
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => router.push('/employee/dashboard')}
            style={{ background: 'white', border: '1px solid #e5e7eb', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#111827' }}>Supervisor Dashboard</h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Manage your team&apos;s requests</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={refresh}
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 600, fontSize: 13, cursor: refreshing ? 'wait' : 'pointer' }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            {refreshing ? 'Updating…' : 'Refresh'}
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ width: 16, height: 16 }} />
            Auto-refresh
          </label>
          <span style={{ fontSize: 12, color: refreshing ? '#0f766e' : '#6b7280' }}>
            {refreshing ? 'Updating in background…' : lastRefreshed ? `Updated ${formatRefreshTime(lastRefreshed)}` : ''}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <button style={tabStyle('punch')} onClick={() => setActiveTab('punch')}>
          <Clock size={16} /> Punch Requests {requests.filter(r => r.status === 'PENDING').length > 0 && (
            <span style={{ background: '#4f46e5', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
              {requests.filter(r => r.status === 'PENDING').length}
            </span>
          )}
        </button>
        <button style={tabStyle('leave')} onClick={() => setActiveTab('leave')}>
          <CalendarCheck size={16} /> Leave Requests {leaveRequests.length > 0 && (
            <span style={{ background: '#059669', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
              {leaveRequests.length}
            </span>
          )}
        </button>
        <button style={tabStyle('trips')} onClick={() => router.push('/employee/supervisor/trips')}>
          <MapIcon size={16} /> Team Trips
        </button>
      </div>

      {activeTab === 'punch' && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden', opacity: refreshing && requests.length > 0 ? 0.92 : 1, transition: 'opacity 0.2s' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Date & Time</th>
                <th style={{ padding: '1rem' }}>Employee</th>
                <th style={{ padding: '1rem' }}>Department</th>
                <th style={{ padding: '1rem' }}>Type</th>
                <th style={{ padding: '1rem' }}>Location</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialLoading && requests.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No punch requests from your team.</td></tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 500 }}>{req.date}</div>
                      <div style={{ color: '#6b7280', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} />
                        {req.type === 'REGULARIZE' ? (() => {
                          try { const t = JSON.parse(req.time); return `${t.in || '?'} - ${t.out || '?'}`; } catch { return req.time; }
                        })() : req.time}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{req.employee?.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{req.employee?.email}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 4, fontSize: '0.85rem' }}>
                        {req.employee?.department}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ background: req.type === 'IN' ? '#dcfce7' : '#fee2e2', color: req.type === 'IN' ? '#16a34a' : '#dc2626', padding: '2px 8px', borderRadius: 4, fontSize: '0.85rem' }}>
                        PUNCH {req.type}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {req.latitude && req.longitude ? (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${req.latitude}&mlon=${req.longitude}#map=17/${req.latitude}/${req.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`${req.latitude.toFixed(5)}, ${req.longitude.toFixed(5)}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6366f1', fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none' }}
                        >
                          <MapIcon size={13} /> View
                        </a>
                      ) : <span style={{ color: '#d1d5db', fontSize: '0.8rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {req.status === 'PENDING' && <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 4, fontSize: '0.85rem' }}>Pending</span>}
                      {req.status === 'APPROVED' && <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 4, fontSize: '0.85rem' }}>Approved</span>}
                      {req.status === 'REJECTED' && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 4, fontSize: '0.85rem' }}>Rejected</span>}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {req.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => handlePunchAction(req.id, 'APPROVED')} style={{ padding: '0.4rem', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', border: 'none', cursor: 'pointer' }} title="Approve">
                            <Check size={18} />
                          </button>
                          <button onClick={() => handlePunchAction(req.id, 'REJECTED')} style={{ padding: '0.4rem', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer' }} title="Reject">
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'leave' && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Employee</th>
                <th style={{ padding: '1rem' }}>Leave Type</th>
                <th style={{ padding: '1rem' }}>Duration</th>
                <th style={{ padding: '1rem' }}>Reason</th>
                <th style={{ padding: '1rem' }}>Applied On</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveLoading && leaveRequests.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading...</td></tr>
              ) : leaveRequests.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No leave requests pending your approval.</td></tr>
              ) : (
                leaveRequests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{req.employee?.name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{req.employee?.department}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 4, fontSize: '0.85rem', fontWeight: 600 }}>
                        {req.leaveType === 'COFF' ? 'Comp. Off' : req.leaveType}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                      <div>{new Date(req.startDate).toLocaleDateString('en-IN')}</div>
                      <div style={{ color: '#6b7280' }}>to {new Date(req.endDate).toLocaleDateString('en-IN')}</div>
                      {req.isHalfDay && <span style={{ fontSize: '0.75rem', color: '#d97706' }}>Half Day</span>}
                    </td>
                    <td style={{ padding: '1rem', color: '#4b5563', maxWidth: 200, fontSize: '0.875rem' }}>{req.reason || '-'}</td>
                    <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>{new Date(req.appliedOn).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleLeaveAction(req.id, 'APPROVED')}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleLeaveAction(req.id, 'REJECTED')}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
