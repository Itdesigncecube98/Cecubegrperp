'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, XCircle, ArrowLeft, Map as MapIcon } from 'lucide-react';
import dynamic from 'next/dynamic';

const TripMap = dynamic(() => import('@/components/TripMap'), { ssr: false });

const STATUS_COLORS = {
  REQUESTED: { bg: '#f3f4f6', color: '#4b5563' },
  ACTIVE:    { bg: '#cffafe', color: '#0891b2' },
  COMPLETED: { bg: '#e0e7ff', color: '#4338ca' },
  PENDING:   { bg: '#fef3c7', color: '#d97706' },
  APPROVED:  { bg: '#dbeafe', color: '#2563eb' },
  PAID:      { bg: '#dcfce7', color: '#16a34a' },
  REJECTED:  { bg: '#fee2e2', color: '#dc2626' },
};

export default function SupervisorTripsPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedMapTrip, setSelectedMapTrip] = useState(null);
  const [toast, setToast] = useState(null);
  const watcherRegistered = useRef(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (!empData) {
      router.replace('/login');
      return;
    }
    const parsed = JSON.parse(empData);
    setEmployee(parsed);
    fetchTrips(parsed.id);
  }, [router]);

  const fetchTrips = async (supervisorId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips?supervisorId=${supervisorId}`);
      const data = await res.json();
      setTrips(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/trips/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed');
      fetchTrips(employee.id);
    } catch (e) {
      console.error(e);
      showToast('Failed to update trip status', 'error');
    }
  };

  const openMapModal = async (trip) => {
    setSelectedMapTrip(trip);
    if (trip.status === 'ACTIVE' && employee) {
      try {
        await fetch(`/api/trips/${trip.id}/watchers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supervisorId: employee.id, supervisorName: employee.name })
        });
        watcherRegistered.current = trip.id;
      } catch (e) { /* silent */ }
    }
  };

  const closeMapModal = async () => {
    if (watcherRegistered.current && employee) {
      try {
        await fetch(`/api/trips/${watcherRegistered.current}/watchers`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supervisorId: employee.id })
        });
      } catch (e) { /* silent */ }
      watcherRegistered.current = false;
    }
    setSelectedMapTrip(null);
  };

  const filteredTrips = trips.filter(t => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      t.employee?.name?.toLowerCase().includes(q) ||
      (t.startLocation || '').toLowerCase().includes(q) ||
      (t.endLocation || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!employee) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => router.push('/employee/supervisor')}
          style={{ background: 'white', border: '1px solid #e5e7eb', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#111827' }}>Team Trips</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Manage and track your direct reports' trips</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            type="text"
            placeholder="Search by employee or location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.25rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
        >
          <option value="All">All Statuses</option>
          <option value="REQUESTED">Requested</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="PAID">Paid</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading team trips...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '1rem' }}>Employee</th>
                <th style={{ padding: '1rem' }}>Date</th>
                <th style={{ padding: '1rem' }}>Route</th>
                <th style={{ padding: '1rem' }}>Vehicle</th>
                <th style={{ padding: '1rem' }}>Distance</th>
                <th style={{ padding: '1rem' }}>Amount</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                    {trips.length === 0
                      ? 'No trips from your team yet.'
                      : 'No trips match your current filters.'}
                  </td>
                </tr>
              ) : (
                filteredTrips.map(trip => {
                  const sc = STATUS_COLORS[trip.status] || STATUS_COLORS.REJECTED;
                  const hasPings = trip.pings?.length > 0;
                  const showMap = (trip.status === 'ACTIVE' || ((trip.status === 'COMPLETED' || trip.status === 'APPROVED' || trip.status === 'PAID') && hasPings));
                  return (
                    <tr key={trip.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '1rem', fontWeight: 600, color: '#111827' }}>
                        {trip.employee?.name}
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 400 }}>{trip.employee?.department}</div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{trip.date || '—'}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: '#374151' }}>
                          <MapPin size={13} color="#6b7280" />
                          {trip.startLocation || '—'} → {trip.endLocation || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                        {trip.vehicle?.makeModel}
                        <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>{trip.vehicle?.plateNumber}</div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{trip.distanceKm ?? 0} km</td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#059669' }}>₹{(trip.amount ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: sc.bg, color: sc.color }}>
                          {trip.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {showMap && (
                            <button
                              onClick={() => openMapModal(trip)}
                              style={{ background: trip.status === 'ACTIVE' ? '#eff6ff' : '#f3f4f6', color: trip.status === 'ACTIVE' ? '#1d4ed8' : '#374151', border: `1px solid ${trip.status === 'ACTIVE' ? '#bfdbfe' : '#d1d5db'}`, padding: '0.35rem 0.65rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}
                            >
                              <MapIcon size={13} /> {trip.status === 'ACTIVE' ? 'Live Map' : 'Route'}
                            </button>
                          )}
                          {(trip.status === 'COMPLETED' || trip.status === 'PENDING') && (
                            <>
                              <button onClick={() => updateStatus(trip.id, 'APPROVED')} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Approve</button>
                              <button onClick={() => updateStatus(trip.id, 'REJECTED')} style={{ background: '#fff', color: '#ef4444', border: '1px solid #ef4444', padding: '0.35rem 0.65rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Reject</button>
                            </>
                          )}
                          {trip.status === 'APPROVED' && (
                            <button onClick={() => updateStatus(trip.id, 'PAID')} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Mark Paid</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Map Modal */}
      {selectedMapTrip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '800px', margin: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                {selectedMapTrip.status === 'ACTIVE' ? '🔴 Live Map' : 'Trip Route'} — {selectedMapTrip.employee?.name}
              </h2>
              <button onClick={closeMapModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <XCircle size={24} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', marginBottom: '1rem', color: '#374151' }}>
              <div><strong>Date:</strong> {selectedMapTrip.date || '—'}</div>
              <div><strong>Vehicle:</strong> {selectedMapTrip.vehicle?.makeModel}</div>
              <div><strong>Distance:</strong> {selectedMapTrip.distanceKm ?? 0} km</div>
            </div>
            <TripMap
              pings={selectedMapTrip.pings}
              startLocation={selectedMapTrip.startLocation}
              endLocation={selectedMapTrip.endLocation}
              tripId={selectedMapTrip.id}
              isActive={selectedMapTrip.status === 'ACTIVE'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
