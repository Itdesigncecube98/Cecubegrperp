'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, MapPin, Map as MapIcon, Download, Navigation } from 'lucide-react';
import dynamic from 'next/dynamic';

const TripMap = dynamic(() => import('../../../../components/TripMap'), { ssr: false });
export default function SupervisorTripsPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [subordinates, setSubordinates] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [toast, setToast] = useState(null);
  const [selectedMapTrip, setSelectedMapTrip] = useState(null);

  // Modal State for Request Live Tracking
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestData, setRequestData] = useState({ employeeId: '', vehicleId: '' });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (!empData) {
      router.replace('/login');
    } else {
      setEmployee(JSON.parse(empData));
    }
  }, [router]);

  useEffect(() => {
    if (employee?.id) {
      fetchTripsAndData();
    }
  }, [employee]);

  const fetchTripsAndData = async () => {
    try {
      setLoading(true);
      // Fetch trips for direct reports
      const tripsRes = await fetch(`/api/trips?supervisorId=${employee.id}`);
      const tripsData = await tripsRes.json();
      setTrips(Array.isArray(tripsData) ? tripsData : []);

      // Fetch employees for the "Request Live Tracking" dropdown (only direct reports)
      const empRes = await fetch(`/api/employees`);
      const empData = await empRes.json();
      if (Array.isArray(empData)) {
        // Find direct reports
        const subs = empData.filter(e => e.supervisorId === employee.id);
        setSubordinates(subs);
      }

      // Fetch vehicles for the dropdown
      const vhRes = await fetch('/api/vehicles');
      const vhData = await vhRes.json();
      setVehicles(Array.isArray(vhData) ? vhData : []);
    } catch (error) {
      console.error('Failed to fetch data', error);
      showToast('Failed to load trips data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateStatus = async (tripId, newStatus) => {
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`Trip marked as ${newStatus}`);
        fetchTripsAndData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update status', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('An error occurred', 'error');
    }
  };

  const handleRequestTrip = async (e) => {
    e.preventDefault();
    try {
      setSubmittingRequest(true);
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: requestData.employeeId,
          vehicleId: requestData.vehicleId,
          status: 'REQUESTED'
        })
      });
      if (res.ok) {
        showToast('Tracking requested successfully');
        setIsRequestModalOpen(false);
        setRequestData({ employeeId: '', vehicleId: '' });
        fetchTripsAndData();
      } else {
        showToast('Failed to request tracking', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred', 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const STATUS_COLORS = {
    REQUESTED: { bg: '#f3f4f6', color: '#4b5563' },
    ACTIVE:    { bg: '#cffafe', color: '#0891b2' },
    COMPLETED: { bg: '#e0e7ff', color: '#4338ca' },
    PENDING:   { bg: '#fef3c7', color: '#d97706' },
    PENDING_REGULARIZATION: { bg: '#fef3c7', color: '#d97706' },
    APPROVED:  { bg: '#dbeafe', color: '#2563eb' },
    PAID:      { bg: '#dcfce7', color: '#16a34a' },
    REJECTED:  { bg: '#fee2e2', color: '#dc2626' },
  };

  const filteredTrips = trips.filter(trip => {
    const matchesSearch = trip.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          trip.startLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          trip.endLocation?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || trip.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!employee) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '2rem', right: '2rem', zIndex: 9999,
          background: toast.type === 'error' ? '#fee2e2' : '#ecfdf5',
          color: toast.type === 'error' ? '#991b1b' : '#065f46',
          padding: '1rem 1.5rem', borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: 600,
          border: `1px solid ${toast.type === 'error' ? '#f87171' : '#34d399'}`
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button
            onClick={() => router.push('/employee/supervisor')}
            style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseOut={e => e.currentTarget.style.background = '#fff'}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.025em' }}>Team Trips</h1>
            <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>Manage and track your direct reports' trips</p>
          </div>
        </div>
        <button 
          onClick={() => setIsRequestModalOpen(true)}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.875rem 1.5rem', borderRadius: '12px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s' }}
          onMouseOver={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseOut={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <Navigation size={18} />
          Request Live Tracking
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by employee or location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem', boxSizing: 'border-box', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', color: '#334155' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '0.875rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', color: '#334155', background: '#fff', cursor: 'pointer', outline: 'none' }}
        >
          <option value="All">All Statuses</option>
          <option value="PENDING_REGULARIZATION">Regularization Requests</option>
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
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', fontSize: '1.1rem' }}>Loading team trips...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee</th>
                <th style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                <th style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Route</th>
                <th style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle</th>
                <th style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distance</th>
                <th style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                <th style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map(trip => {
                  const sc = STATUS_COLORS[trip.status] || { bg: '#f1f5f9', color: '#475569' };
                  const hasPings = trip.pings?.length > 0;
                  const showMap = (trip.status === 'ACTIVE' || ((trip.status === 'COMPLETED' || trip.status === 'APPROVED' || trip.status === 'PAID') && hasPings));
                  return (
                    <tr key={trip.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600, color: '#0f172a' }}>
                        {trip.employee?.name}
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400, marginTop: '0.25rem' }}>{trip.employee?.department}</div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{trip.date || '—'}</td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
                          <MapPin size={16} color="#94a3b8" />
                          {trip.startLocation || '—'} → {trip.endLocation || '—'}
                        </div>
                        {trip.reason && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', background: '#f1f5f9', padding: '0.4rem 0.6rem', borderRadius: '6px', display: 'inline-block' }}>
                            Reason: {trip.reason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
                        {trip.vehicle?.makeModel}
                        <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>{trip.vehicle?.plateNumber}</div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>{trip.distanceKm ?? 0} km</td>
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: 800, color: '#059669', fontSize: '1rem' }}>₹{(trip.amount ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span style={{ padding: '6px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: sc.bg, color: sc.color, letterSpacing: '0.025em', display: 'inline-block' }}>
                          {trip.status === 'PENDING_REGULARIZATION' ? 'REGULARIZATION PENDING' : trip.status}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {showMap && (
                            <button
                              onClick={() => setSelectedMapTrip(trip)}
                              style={{ background: trip.status === 'ACTIVE' ? '#eff6ff' : '#f8fafc', color: trip.status === 'ACTIVE' ? '#2563eb' : '#475569', border: `1px solid ${trip.status === 'ACTIVE' ? '#bfdbfe' : '#e2e8f0'}`, padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                              <MapIcon size={14} /> {trip.status === 'ACTIVE' ? 'Live Map' : 'Route'}
                            </button>
                          )}
                          {(trip.status === 'COMPLETED' || trip.status === 'PENDING' || trip.status === 'PENDING_REGULARIZATION') && (
                            <>
                              <button 
                                onClick={() => updateStatus(trip.id, 'APPROVED')} 
                                style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                                onMouseOver={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseOut={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.transform = 'translateY(0)'; }}
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => updateStatus(trip.id, 'REJECTED')} 
                                style={{ background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                                onMouseOver={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {trip.status === 'APPROVED' && (
                            <button 
                              onClick={() => updateStatus(trip.id, 'PAID')} 
                              style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                              onMouseOver={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                              onMouseOut={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
              })}
              {filteredTrips.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', fontSize: '1rem' }}>No trips found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Map Modal */}
      {selectedMapTrip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', width: '90%', maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Trip Map: {selectedMapTrip.employee?.name}</h2>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>{selectedMapTrip.startLocation} → {selectedMapTrip.endLocation}</div>
              </div>
              <button 
                onClick={() => setSelectedMapTrip(null)}
                style={{ background: '#f1f5f9', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <TripMap trip={selectedMapTrip} />
            </div>
          </div>
        </div>
      )}

      {/* Request Live Tracking Modal */}
      {isRequestModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Request Live Tracking</h2>
            <form onSubmit={handleRequestTrip}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Employee</label>
                <select 
                  value={requestData.employeeId} 
                  onChange={e => setRequestData({...requestData, employeeId: e.target.value})} 
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', color: '#0f172a', outline: 'none', background: '#fff' }}
                >
                  <option value="">Select Employee</option>
                  {subordinates.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
                {subordinates.length === 0 && <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.25rem' }}>No direct reports found.</div>}
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Vehicle</label>
                <select 
                  value={requestData.vehicleId} 
                  onChange={e => setRequestData({...requestData, vehicleId: e.target.value})} 
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', color: '#0f172a', outline: 'none', background: '#fff' }}
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.makeModel} ({v.plateNumber})</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsRequestModalOpen(false)} 
                  style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={e => e.currentTarget.style.background = '#fff'}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingRequest || !requestData.employeeId || !requestData.vehicleId}
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, opacity: (submittingRequest || !requestData.employeeId || !requestData.vehicleId) ? 0.5 : 1, transition: 'all 0.2s' }}
                  onMouseOver={e => { if(!submittingRequest && requestData.employeeId && requestData.vehicleId) e.currentTarget.style.background = '#2563eb'; }}
                  onMouseOut={e => { if(!submittingRequest && requestData.employeeId && requestData.vehicleId) e.currentTarget.style.background = '#3b82f6'; }}
                >
                  {submittingRequest ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
