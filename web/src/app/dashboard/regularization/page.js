'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, ArrowLeft, Clock, RefreshCw, MapPin } from 'lucide-react';
import { getPunchRequests, updatePunchRequestStatus } from '../../../lib/data';
import { useAutoRefresh, formatRefreshTime } from '../../../lib/useAutoRefresh';

export default function RegularizationRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const loadRequests = useCallback(async () => {
    const data = await getPunchRequests();
    setRequests(Array.isArray(data) ? data : []);
  }, []);

  const { refresh, refreshing, lastRefreshed, autoRefresh, setAutoRefresh } = useAutoRefresh(loadRequests, {
    intervalMs: 10000,
    enabled: true
  });

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    (async () => {
      setInitialLoading(true);
      try {
        await loadRequests();
      } catch (e) {
        console.error(e);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [router, loadRequests]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (id, status) => {
    try {
      setRequests(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
      await updatePunchRequestStatus(id, status);
      showToast(`Request ${status.toLowerCase()} successfully!`);
      refresh();
    } catch (e) {
      showToast('Error updating request', 'error');
      refresh();
    }
  };

  const filtered = requests.filter(r => filter === 'ALL' || r.status === filter);

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '30px', fontWeight: 500, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Regularization Requests</h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Review and process employee punch regularization requests.</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={refresh}
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#0f766e', color: 'white', fontWeight: 600, fontSize: '13px', cursor: refreshing ? 'wait' : 'pointer' }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            {refreshing ? 'Updating…' : 'Refresh'}
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ width: 16, height: 16 }} />
            Auto-refresh
          </label>
          <span style={{ fontSize: '12px', color: refreshing ? '#0f766e' : '#6b7280' }}>
            {refreshing ? 'Updating in background…' : lastRefreshed ? `Updated ${formatRefreshTime(lastRefreshed)}` : ''}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 16px', borderRadius: '20px', border: '1px solid #e5e7eb', background: filter === f ? '#007bff' : 'white', color: filter === f ? 'white' : '#374151', cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}>
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', opacity: refreshing && requests.length > 0 ? 0.92 : 1, transition: 'opacity 0.2s' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Date & Time', 'Employee', 'Department', 'Type', 'Reason', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {initialLoading && requests.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading requests...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No {filter.toLowerCase()} requests found.</td></tr>
            ) : (
              filtered.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 500, fontSize: '14px' }}>
                      {new Date(req.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}, {req.date}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} /> {req.time}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{req.employee?.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{req.employee?.email}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>{req.employee?.department}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: req.type === 'IN' ? '#dcfce7' : '#fee2e2', color: req.type === 'IN' ? '#16a34a' : '#dc2626', padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                      PUNCH {req.type}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151', maxWidth: '180px' }}>
                    {req.reason || '—'}
                    {req.locationName && (
                      <div style={{ marginTop: '4px', fontSize: '11px', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <MapPin size={12} /> {req.locationName}
                      </div>
                    )}
                    {req.latitude && req.longitude && !req.locationName && (
                      <div style={{ marginTop: '4px', fontSize: '11px', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <MapPin size={12} /> <a href={`https://maps.google.com/?q=${req.latitude},${req.longitude}`} target="_blank" style={{ color: '#2563eb' }}>View Map</a>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: req.status === 'PENDING' ? '#fef3c7' : req.status === 'APPROVED' ? '#dcfce7' : '#fee2e2', color: req.status === 'PENDING' ? '#d97706' : req.status === 'APPROVED' ? '#16a34a' : '#dc2626', padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {req.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleAction(req.id, 'APPROVED')} style={{ padding: '6px', borderRadius: '50%', background: '#dcfce7', border: 'none', cursor: 'pointer', display: 'flex' }} title="Approve">
                          <Check size={16} color="#16a34a" />
                        </button>
                        <button onClick={() => handleAction(req.id, 'REJECTED')} style={{ padding: '6px', borderRadius: '50%', background: '#fee2e2', border: 'none', cursor: 'pointer', display: 'flex' }} title="Reject">
                          <X size={16} color="#dc2626" />
                        </button>
                      </div>
                    ) : <span style={{ fontSize: '12px', color: '#9ca3af' }}>Processed</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
