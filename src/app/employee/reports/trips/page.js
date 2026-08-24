'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Map as MapIcon, XCircle, Navigation } from 'lucide-react';
import dynamic from 'next/dynamic';

const TripMap = dynamic(() => import('@/components/TripMap'), { ssr: false });

export default function EmployeeTripReport() {
  const [employee, setEmployee] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMapTrip, setSelectedMapTrip] = useState(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const router = useRouter();

  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (!empData) { router.push('/login'); return; }
    const parsed = JSON.parse(empData);
    setEmployee(parsed);
    fetchTrips(parsed.id);
  }, [router]);

  const fetchTrips = async (empId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips?employeeId=${empId}`);
      const data = await res.json();
      setTrips(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = trips.filter(t => {
    if (!t.date) return true;
    return t.date >= startDate && t.date <= endDate;
  });

  const totalKm = filtered.reduce((s, t) => s + (t.distanceKm || 0), 0);
  const totalAmt = filtered.reduce((s, t) => s + (t.amount || 0), 0);

  const statusColor = (s) => {
    if (s === 'PAID') return '#22c55e';
    if (s === 'APPROVED') return '#3b82f6';
    if (s === 'REJECTED') return '#ef4444';
    if (s === 'ACTIVE') return '#f59e0b';
    return '#6b7280';
  };

  const exportCSV = () => {
    const headers = ['Date', 'From', 'To', 'Vehicle', 'Distance (km)', 'Amount (₹)', 'Status'];
    const rows = filtered.map(t => [
      t.date || '-',
      t.startLocation || '-',
      t.endLocation || '-',
      t.vehicle?.makeModel || '-',
      t.distanceKm || 0,
      (t.amount || 0).toFixed(2),
      t.status
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `trip_report_${startDate}_${endDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !employee) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => router.push('/employee/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontWeight: 500 }}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Trip Report</h1>
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

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Trips', value: filtered.length, color: '#6366f1' },
          { label: 'Total Distance', value: `${totalKm.toFixed(1)} km`, color: '#3b82f6' },
          { label: 'Total Amount', value: `₹${totalAmt.toFixed(2)}`, color: '#22c55e' },
          { label: 'Pending Approval', value: filtered.filter(t => t.status === 'COMPLETED').length, color: '#f59e0b' }
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Trip Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Date', 'Route', 'Vehicle', 'Distance', 'Amount', 'Status', 'Map'].map(h => (
                <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No trips in this period.</td></tr>
            ) : filtered.map(trip => (
              <tr key={trip.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>{trip.date || '-'}</td>
                <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#374151' }}>{trip.startLocation} → {trip.endLocation}</td>
                <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>{trip.vehicle?.makeModel || '-'} <span style={{ fontSize: '0.75rem' }}>({trip.vehicle?.plateNumber || '-'})</span></td>
                <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 700 }}>{(trip.distanceKm || 0).toFixed(2)} km</td>
                <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 700, color: '#22c55e' }}>₹{(trip.amount || 0).toFixed(2)}</td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  <span style={{ background: statusColor(trip.status) + '20', color: statusColor(trip.status), padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>{trip.status}</span>
                </td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  {trip.pings?.length > 0 && (
                    <button onClick={() => setSelectedMapTrip(trip)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                      <MapIcon size={13} /> Route
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Map Modal */}
      {selectedMapTrip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Route Map — {selectedMapTrip.date}</h2>
              <button onClick={() => setSelectedMapTrip(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><XCircle size={24} /></button>
            </div>
            <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '2rem', fontSize: '0.875rem', color: '#374151' }}>
              <span><strong>Vehicle:</strong> {selectedMapTrip.vehicle?.makeModel}</span>
              <span><strong>Distance:</strong> {selectedMapTrip.distanceKm} km</span>
              <span><strong>Amount:</strong> ₹{(selectedMapTrip.amount || 0).toFixed(2)}</span>
            </div>
            <TripMap pings={selectedMapTrip.pings} startLocation={selectedMapTrip.startLocation} endLocation={selectedMapTrip.endLocation} tripId={selectedMapTrip.id} isActive={false} />
          </div>
        </div>
      )}
    </div>
  );
}
