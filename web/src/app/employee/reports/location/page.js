'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, MapPin, XCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

const TripMap = dynamic(() => import('@/components/TripMap'), { ssr: false });

function formatDuration(start, end) {
  if (!start || !end) return '-';
  const ms = new Date(end) - new Date(start);
  if (ms < 0) return '-';
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcDistance(pings) {
  if (!pings || pings.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < pings.length; i++) {
    total += haversineKm(pings[i-1].latitude, pings[i-1].longitude, pings[i].latitude, pings[i].longitude);
  }
  return total;
}

export default function EmployeeLocationReport() {
  const [employee, setEmployee] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const router = useRouter();

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (!empData) { router.push('/login'); return; }
    const parsed = JSON.parse(empData);
    setEmployee(parsed);
    fetchSessions(parsed.id);
  }, [router]);

  const fetchSessions = async (empId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/location-requests?employeeId=${empId}`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = sessions.filter(s => {
    const d = s.requestedAt?.split('T')[0];
    if (!d) return true;
    return d >= startDate && d <= endDate;
  });

  const exportCSV = () => {
    const headers = ['Date', 'Movement Type', 'Status', 'Duration', 'Distance (km)', 'Pings'];
    const rows = filtered.map(s => [
      s.requestedAt?.split('T')[0] || '-',
      s.movementType || '-',
      s.status,
      formatDuration(s.requestedAt, s.respondedAt),
      calcDistance(s.pings).toFixed(2),
      s.pings?.length || 0
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `location_report_${startDate}_${endDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const statusColor = (s) => {
    if (s === 'ACTIVE') return '#22c55e';
    if (s === 'STOPPED') return '#6b7280';
    return '#f59e0b';
  };

  if (loading || !employee) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => router.push('/employee/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontWeight: 500 }}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Live Location Report</h1>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem' }} />
        </div>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Sessions', value: filtered.length, color: '#6366f1' },
          { label: 'Active Now', value: filtered.filter(s => s.status === 'ACTIVE').length, color: '#22c55e' },
          { label: 'Completed', value: filtered.filter(s => s.status === 'STOPPED').length, color: '#6b7280' },
          { label: 'Total Pings', value: filtered.reduce((s, r) => s + (r.pings?.length || 0), 0), color: '#3b82f6' }
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Sessions Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Date & Time', 'Movement Type', 'Duration', 'Distance', 'Pings', 'Status', 'Map'].map(h => (
                <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No location sessions in this period.</td></tr>
            ) : filtered.map(session => (
              <tr key={session.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>{session.requestedAt ? new Date(session.requestedAt).toLocaleString('en-IN') : '-'}</td>
                <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem' }}>{session.movementType || '-'}</td>
                <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>{formatDuration(session.requestedAt, session.respondedAt)}</td>
                <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>{calcDistance(session.pings).toFixed(2)} km</td>
                <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>{session.pings?.length || 0}</td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  <span style={{ background: statusColor(session.status) + '20', color: statusColor(session.status), padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>{session.status}</span>
                </td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  {session.pings?.length > 0 && (
                    <button onClick={() => setSelectedSession(session)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                      <MapPin size={13} /> View
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Map Modal */}
      {selectedSession && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Location Track — {selectedSession.requestedAt?.split('T')[0]}</h2>
              <button onClick={() => setSelectedSession(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><XCircle size={24} /></button>
            </div>
            <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '2rem', fontSize: '0.875rem', color: '#374151' }}>
              <span><strong>Movement:</strong> {selectedSession.movementType || '-'}</span>
              <span><strong>Duration:</strong> {formatDuration(selectedSession.requestedAt, selectedSession.respondedAt)}</span>
              <span><strong>Distance:</strong> {calcDistance(selectedSession.pings).toFixed(2)} km</span>
            </div>
            <TripMap pings={selectedSession.pings} startLocation="Start" endLocation="End" tripId={selectedSession.id} isActive={selectedSession.status === 'ACTIVE'} />
          </div>
        </div>
      )}
    </div>
  );
}
