'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Navigation, CheckCircle, Clock, MapPin, Plus, ArrowLeft, Map as MapIcon, XCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

const TripMap = dynamic(() => import('@/components/TripMap'), { ssr: false });

export default function EmployeeVehiclesPage() {
  const [employee, setEmployee] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Tracking states
  const [trackingId, setTrackingId] = useState(null);
  const [trackingMessage, setTrackingMessage] = useState('');
  // Watcher indicator state
  const [watcherCount, setWatcherCount] = useState(0);
  const watcherPollRef = useRef(null);
  
  const router = useRouter();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegularizeModalOpen, setIsRegularizeModalOpen] = useState(false);
  const [selectedMapTrip, setSelectedMapTrip] = useState(null);
  const [tripData, setTripData] = useState({ date: new Date().toISOString().split('T')[0], vehicleId: '', startLocation: '', endLocation: '', distanceKm: '', reason: '' });

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (empData) {
      const parsed = JSON.parse(empData);
      setEmployee(parsed);
      fetchData(parsed.id);
    } else {
      router.push('/login');
    }
  }, [router]);

  const fetchData = async (empId) => {
    setLoading(true);
    try {
      const [vehRes, tripRes] = await Promise.all([
        fetch(`/api/vehicles?employeeId=${empId}`),
        fetch(`/api/trips?employeeId=${empId}`)
      ]);
      const vehData = await vehRes.json();
      const tripData = await tripRes.json();
      setVehicles(vehData);
      setTrips(tripData);
      
      const activeTrip = tripData.find(t => t.status === 'ACTIVE');
      if (activeTrip && trackingId === null) {
        setTrackingMessage('Trip is stable now. Live location tracking is active. Keep this app open while travelling.');
        startTracking(activeTrip.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Poll for watchers on active trip
  useEffect(() => {
    const activeTrip = trips.find(t => t.status === 'ACTIVE');
    if (watcherPollRef.current) {
      clearInterval(watcherPollRef.current);
      watcherPollRef.current = null;
    }
    if (!activeTrip) {
      setWatcherCount(0);
      return;
    }
    const poll = async () => {
      try {
        const res = await fetch(`/api/trips/${activeTrip.id}/watchers`);
        if (res.ok) {
          const data = await res.json();
          setWatcherCount(data.count ?? 0);
        } else {
          setWatcherCount(0);
        }
      } catch (e) {
        setWatcherCount(0);
      }
    };
    poll();
    watcherPollRef.current = setInterval(poll, 10_000);
    return () => {
      if (watcherPollRef.current) clearInterval(watcherPollRef.current);
    };
  }, [trips]);

  const handleStartTrip = async (tripId) => {
    if (!navigator.geolocation) {
      setTrackingMessage('This phone does not support location tracking. Please use a GPS-enabled phone.');
      return;
    }
    try {
      setTrackingMessage('Checking your phone location permission...');
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      });
      const res = await fetch(`/api/trips/${tripId}/start`, { method: 'PUT' });
      if (res.ok) {
        startTracking(tripId, position);
        if (window.AndroidTripTracking) {
          window.AndroidTripTracking.startTrip(`${window.location.origin}/api/trips/${tripId}/ping`);
        }
        setTrackingMessage('Trip is stable now. Live location tracking is active. Keep this app open while travelling.');
        fetchData(employee.id);
      } else {
        setTrackingMessage('Trip could not start. Please try again.');
      }
    } catch (e) {
      console.error(e);
      setTrackingMessage(e.code === 1 ? 'Location permission was denied. Allow location access and start the trip again.' : 'GPS is unavailable. Turn on Location Services and try again.');
    }
  };

  const notificationRef = React.useRef(null);

  const startTracking = (tripId, initialPosition = null) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    // Request notification permission and show persistent notification
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          notificationRef.current = new Notification('Trip Active', {
            body: 'Trip is stable now. Your live location is being tracked for this trip.',
            requireInteraction: true, // keeps it on screen until dismissed or closed programmatically
            icon: '/favicon.ico'
          });
        }
      });
    }

    const sendPing = async (position) => {
      await fetch(`/api/trips/${tripId}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude })
      });
    };

    if (initialPosition) {
      sendPing(initialPosition).catch(error => console.error('Initial location ping failed:', error));
    }

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await sendPing(pos);
        } catch (e) { console.error('Ping failed:', e); }
      },
      (err) => {
        const messages = {
          1: 'Location permission denied. Please allow location access in your browser settings.',
          2: 'Location unavailable. Please ensure GPS is enabled.',
          3: 'Location request timed out. Retrying...',
        };
        console.warn('Geolocation error:', messages[err.code] || err.message);
        setTrackingMessage(messages[err.code] || 'Location tracking is trying again. Keep GPS enabled.');
        // Don't stop tracking on timeout — watchPosition will retry automatically
        if (err.code === 1) {
          alert(messages[1]);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    setTrackingId(id);
  };

  const handleStopTrip = async (tripId) => {
    if (trackingId !== null) {
      navigator.geolocation.clearWatch(trackingId);
      setTrackingId(null);
    }
    if (window.AndroidTripTracking) window.AndroidTripTracking.stopTrip();

    // Close the notification
    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }

    try {
      await fetch(`/api/trips/${tripId}/stop`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startLocation: '', endLocation: '' })
      });
      fetchData(employee.id);
    } catch (e) { console.error(e); }
  };

  const handleLogTrip = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          date: tripData.date,
          vehicleId: tripData.vehicleId,
          startLocation: tripData.startLocation,
          endLocation: tripData.endLocation,
          distanceKm: 0 // Default to 0 for standard trip log
        })
      });

      if (!res.ok) {
        alert('Failed to log trip');
        return;
      }
      
      setIsModalOpen(false);
      setTripData({ date: new Date().toISOString().split('T')[0], vehicleId: '', startLocation: '', endLocation: '', distanceKm: '', reason: '' });
      fetchData(employee.id);
    } catch (error) {
      console.error(error);
      alert('Error logging trip');
    }
  };

  const handleRegularizeTrip = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          ...tripData,
          status: 'PENDING_REGULARIZATION'
        })
      });

      if (!res.ok) {
        alert('Failed to regularize trip');
        return;
      }
      
      setIsRegularizeModalOpen(false);
      setTripData({ date: new Date().toISOString().split('T')[0], vehicleId: '', startLocation: '', endLocation: '', distanceKm: '', reason: '' });
      fetchData(employee.id);
    } catch (error) {
      console.error(error);
      alert('Error regularizing trip');
    }
  };

  if (loading || !employee) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading your vehicles...</div>;

  const totalDistance = trips.reduce((acc, trip) => acc + trip.distanceKm, 0);
  const pendingAmount = trips.filter(t => t.status === 'APPROVED' || t.status === 'PENDING').reduce((acc, t) => acc + t.amount, 0);

  return (
    <div style={{ padding: '2rem 2.5rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => router.push('/employee/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '-0.03em' }}>
          <Car size={28} color="var(--accent-color)" /> My Vehicles & Mileage
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={activeTab === 'dashboard' ? 'btn-primary' : 'btn-outline'}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={activeTab === 'history' ? 'btn-primary' : 'btn-outline'}
        >
          Trip History
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <>
          {trackingMessage && (
            <div role="status" aria-live="polite" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: '10px', background: trackingMessage.includes('active') || trackingMessage.includes('stable') ? '#dcfce7' : '#fef3c7', color: trackingMessage.includes('active') || trackingMessage.includes('stable') ? '#166534' : '#92400e', border: `1px solid ${trackingMessage.includes('active') || trackingMessage.includes('stable') ? '#86efac' : '#fcd34d'}`, fontWeight: 600 }}>
              {trackingMessage}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="saas-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>Total Distance Travelled</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{totalDistance.toFixed(1)} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>km</span></div>
              </div>
              <div style={{ background: 'var(--accent-faint)', padding: '1rem', borderRadius: 'var(--radius-lg)', color: 'var(--accent-color)' }}>
                <Navigation size={32} />
              </div>
            </div>

            <div className="saas-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>Pending Reimbursement</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>₹{pendingAmount.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--success-light)', padding: '1rem', borderRadius: 'var(--radius-lg)', color: 'var(--success)' }}>
                <CheckCircle size={32} />
              </div>
            </div>
          </div>

          {trips.filter(t => t.status === 'REQUESTED' || t.status === 'ACTIVE').map(trip => (
            <div key={trip.id} className="saas-card" style={{
              borderLeft: trip.status === 'ACTIVE' ? '4px solid var(--accent-color)' : '4px solid var(--danger)', 
              padding: '1.5rem', marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ background: trip.status === 'ACTIVE' ? 'var(--accent-faint)' : 'var(--danger-light)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: trip.status === 'ACTIVE' ? 'var(--accent-color)' : 'var(--danger)' }}>
                    <MapPin size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {trip.status === 'ACTIVE' ? 'Live Tracking Active' : 'Trip Tracking Requested'}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Vehicle: {trip.vehicle?.makeModel} ({trip.vehicle?.plateNumber})
                    </div>
                  </div>
                </div>
                {trip.status === 'REQUESTED' ? (
                  <button onClick={() => handleStartTrip(trip.id)} className="btn-primary">
                    Accept & Start Trip
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={() => setSelectedMapTrip(trip)} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapIcon size={16} /> Live Map
                    </button>
                    <button onClick={() => handleStopTrip(trip.id)} className="btn-danger">
                      Stop Trip & Calculate
                    </button>
                  </div>
                )}
              </div>
              {trip.status === 'ACTIVE' && watcherCount > 0 && (
                <div style={{ marginTop: '0.75rem', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  👁 Your supervisor is watching this trip
                </div>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Assigned Vehicles</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setIsRegularizeModalOpen(true)} className="btn-outline">
                Regularize Trip
              </button>
              <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                <Plus size={18} /> Log a Trip
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {vehicles.map(veh => (
              <div key={veh.id} className="saas-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '50%', color: 'var(--text-secondary)' }}>
                    <Car size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{veh.makeModel}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{veh.vehicleType}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Vehicle No</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{veh.plateNumber}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Rate</div>
                    <div style={{ fontWeight: 700, color: 'var(--success)', marginTop: '0.25rem' }}>₹{veh.ratePerKm}/km</div>
                  </div>
                </div>
              </div>
            ))}
            {vehicles.length === 0 && (
              <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '12px', padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No vehicles assigned. Contact admin to assign a vehicle to you.
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="saas-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', margin: 0 }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, color: '#4b5563', fontSize: '0.875rem' }}>Date & Route</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, color: '#4b5563', fontSize: '0.875rem' }}>Vehicle</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, color: '#4b5563', fontSize: '0.875rem' }}>Distance</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, color: '#4b5563', fontSize: '0.875rem' }}>Amount</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, color: '#4b5563', fontSize: '0.875rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(trip => (
                <tr key={trip.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{trip.date}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} /> {trip.startLocation} &rarr; {trip.endLocation}
                    </div>
                    {(trip.status === 'COMPLETED' || trip.status === 'APPROVED' || trip.status === 'PAID' || trip.status === 'REJECTED') && trip.pings?.length > 0 && (
                      <button onClick={() => setSelectedMapTrip(trip)} style={{ marginTop: '0.5rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                        <MapIcon size={12} /> View Route Map
                      </button>
                    )}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)' }}>{trip.vehicle?.makeModel}</td>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{trip.distanceKm} km</td>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: 800, color: 'var(--success)' }}>₹{trip.amount.toFixed(2)}</td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span className={`badge ${trip.status === 'PENDING' ? 'badge-warning' : trip.status === 'PENDING_REGULARIZATION' ? 'badge-warning' : trip.status === 'APPROVED' ? 'badge-secondary' : trip.status === 'PAID' ? 'badge-success' : trip.status === 'ACTIVE' ? 'badge-secondary' : trip.status === 'REQUESTED' ? 'badge-secondary' : trip.status === 'COMPLETED' ? 'badge-secondary' : 'badge-danger'}`}>
                      {trip.status === 'PENDING_REGULARIZATION' ? 'PENDING (REGULARIZATION)' : trip.status}
                    </span>
                  </td>
                </tr>
              ))}
              {trips.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No trips logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Trip Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div className="saas-card" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Log a Trip</h2>
            {vehicles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>You don't have any vehicles assigned.</p>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">Close</button>
              </div>
            ) : (
              <form onSubmit={handleLogTrip}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Date</label>
                  <input 
                    type="date" 
                    value={tripData.date} 
                    onChange={e => setTripData({...tripData, date: e.target.value})} 
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb' }}
                  />
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Vehicle</label>
                  <select 
                    value={tripData.vehicleId} 
                    onChange={e => setTripData({...tripData, vehicleId: e.target.value})} 
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb' }}
                  >
                    <option value="">Select a vehicle...</option>
                    {vehicles.map(veh => <option key={veh.id} value={veh.id}>
                      {veh.isCompanyVehicle ? '[Company] ' : ''}{veh.makeModel} ({veh.plateNumber}) - ₹{veh.ratePerKm}/km
                    </option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>From</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Office"
                      value={tripData.startLocation} 
                      onChange={e => setTripData({...tripData, startLocation: e.target.value})} 
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>To</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Client Site A"
                      value={tripData.endLocation} 
                      onChange={e => setTripData({...tripData, endLocation: e.target.value})} 
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline" style={{ flex: 1, padding: '0.875rem' }}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ flex: 2, padding: '0.875rem' }}>Start Tracking</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Regularize Trip Modal */}
      {isRegularizeModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div className="saas-card" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Regularize a Trip</h2>
            {vehicles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>You don't have any vehicles assigned.</p>
                <button type="button" onClick={() => setIsRegularizeModalOpen(false)} className="btn-outline">Close</button>
              </div>
            ) : (
              <form onSubmit={handleRegularizeTrip}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Date</label>
                  <input 
                    type="date" 
                    value={tripData.date} 
                    onChange={e => setTripData({...tripData, date: e.target.value})} 
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb' }}
                  />
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Vehicle</label>
                  <select 
                    value={tripData.vehicleId} 
                    onChange={e => setTripData({...tripData, vehicleId: e.target.value})} 
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb' }}
                  >
                    <option value="">Select a vehicle...</option>
                    {vehicles.map(veh => <option key={veh.id} value={veh.id}>
                      {veh.isCompanyVehicle ? '[Company] ' : ''}{veh.makeModel} ({veh.plateNumber}) - ₹{veh.ratePerKm}/km
                    </option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>From</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Office"
                      value={tripData.startLocation} 
                      onChange={e => setTripData({...tripData, startLocation: e.target.value})} 
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>To</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Client Site A"
                      value={tripData.endLocation} 
                      onChange={e => setTripData({...tripData, endLocation: e.target.value})} 
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Distance (km)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="e.g. 15.5"
                    value={tripData.distanceKm} 
                    onChange={e => setTripData({...tripData, distanceKm: e.target.value})} 
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb', fontSize: '1.25rem', fontWeight: 700 }}
                  />
                </div>
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Reason for Regularization</label>
                  <textarea 
                    placeholder="e.g. Forgot to turn on GPS"
                    value={tripData.reason} 
                    onChange={e => setTripData({...tripData, reason: e.target.value})} 
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb', minHeight: '80px', fontFamily: 'inherit' }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setIsRegularizeModalOpen(false)} className="btn-outline" style={{ flex: 1, padding: '0.875rem' }}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ flex: 2, padding: '0.875rem' }}>Submit Request</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {selectedMapTrip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div className="saas-card" style={{ padding: '2rem', width: '100%', maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                Trip Route Map ({selectedMapTrip.date})
              </h2>
              <button onClick={() => setSelectedMapTrip(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <XCircle size={24} />
              </button>
            </div>
            
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
              <div><strong>Vehicle:</strong> {selectedMapTrip.vehicle?.makeModel}</div>
              <div><strong>Distance:</strong> {selectedMapTrip.distanceKm} km</div>
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
