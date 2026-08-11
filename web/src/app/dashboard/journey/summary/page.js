'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, MapPin, Navigation, Clock, Bell, X, Trash2 } from 'lucide-react';
import { getLocationRequests, getEmployees, requestLocation, deleteLocationRequest } from '../../../../lib/data';
import '../../attendance/attendance.css';

export default function JourneySummary() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [trips, setTrips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    fetchTrips(date);
    fetchEmployees();
  }, [date]);

  const fetchTrips = async (d) => {
    setLoading(true);
    try {
      const data = await getLocationRequests('', d);
      setTrips(data || []);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data || []);
    } catch(e) {
      console.error(e);
    }
  };

  const handleRequestLocation = async () => {
    if (!selectedEmp) return alert('Please select an employee');
    setRequesting(true);
    try {
      await requestLocation(selectedEmp);
      alert('Location request sent successfully!');
      setIsModalOpen(false);
      setSelectedEmp('');
      fetchTrips(date);
    } catch (e) {
      console.error(e);
      alert('Failed to send request');
    } finally {
      setRequesting(false);
    }
  };

  const handleDeleteTrip = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location request?')) return;
    try {
      await deleteLocationRequest(id);
      fetchTrips(date);
    } catch (e) {
      console.error(e);
      alert('Failed to delete request');
    }
  };

  const calculateDistance = (pings) => {
    if (!pings || pings.length < 2) return 0;
    let dist = 0;
    const toRad = (value) => (value * Math.PI) / 180;
    for (let i = 0; i < pings.length - 1; i++) {
      const p1 = pings[i];
      const p2 = pings[i + 1];
      const R = 6371; // km
      const dLat = toRad(p2.latitude - p1.latitude);
      const dLon = toRad(p2.longitude - p1.longitude);
      const lat1 = toRad(p1.latitude);
      const lat2 = toRad(p2.latitude);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      dist += R * c;
    }
    return dist.toFixed(1);
  };

  const formatDuration = (pings) => {
    if (!pings || pings.length < 2) return '-';
    const start = new Date(pings[0].timestamp);
    const end = new Date(pings[pings.length - 1].timestamp);
    const diffMins = Math.round((end - start) / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
  };

  return (
    <div style={{ padding: '2rem 2.5rem', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', textDecoration: 'none', fontWeight: 600, fontSize: '14px', marginBottom: '1.5rem' }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Journey Summary</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>Track employee trips and field visits</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ background: '#0f172a', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <Bell size={16} /> Request Location
          </button>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
          />
          <Link href={`/dashboard/journey/map?date=${date}`} style={{ background: '#3b82f6', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={16} /> View Map
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', gridColumn: '1 / -1' }}>Loading trips...</div>
        ) : trips.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b', gridColumn: '1 / -1' }}>No trips found for {date}</div>
        ) : (
          trips.map(trip => {
            const distance = calculateDistance(trip.pings);
            const duration = formatDuration(trip.pings);
            const hasPings = trip.pings && trip.pings.length > 0;
            const startTime = hasPings ? new Date(trip.pings[0].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
            const isFinished = trip.status === 'COMPLETED' || trip.status === 'STOPPED';
            const endTime = hasPings && isFinished ? new Date(trip.pings[trip.pings.length-1].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : (trip.status === 'ACTIVE' ? 'Ongoing' : '-');
            
            return (
              <div key={trip.id} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{trip.employee?.name || 'Unknown'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                      background: trip.status === 'ACTIVE' ? '#dbeafe' : trip.status === 'PENDING' ? '#fef08a' : isFinished ? '#dcfce7' : '#f3f4f6',
                      color: trip.status === 'ACTIVE' ? '#2563eb' : trip.status === 'PENDING' ? '#854d0e' : isFinished ? '#16a34a' : '#4b5563'
                    }}>
                      {trip.status}
                    </span>
                    <button onClick={() => handleDeleteTrip(trip.id)} title="Delete Request" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', padding: '4px', borderRadius: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ position: 'relative', paddingLeft: '20px', borderLeft: '2px dashed #cbd5e1', marginLeft: '6px', marginBottom: '1rem' }}>
                  <div style={{ position: 'absolute', width: '10px', height: '10px', background: trip.status === 'PENDING' ? '#cbd5e1' : '#3b82f6', borderRadius: '50%', left: '-6px', top: '0' }} />
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>START - {startTime}</div>
                    <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '2px' }}>{trip.address || 'Unknown Location'}</div>
                  </div>
                  
                  <div style={{ position: 'absolute', width: '10px', height: '10px', background: isFinished ? '#10b981' : '#cbd5e1', borderRadius: '50%', left: '-6px', bottom: '0' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>END - {endTime}</div>
                    <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '2px' }}>{isFinished ? 'Destination Reached' : trip.status === 'PENDING' ? 'Waiting for Employee' : 'Tracking...'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '1.25rem' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Navigation size={14} color="#64748b" />
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>DISTANCE</div>
                      <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>{distance} km</div>
                    </div>
                  </div>
                  <div style={{ width: '1px', background: '#e2e8f0' }} />
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="#64748b" />
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>DURATION</div>
                      <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>{duration}</div>
                    </div>
                  </div>
                </div>

                <Link href={`/dashboard/journey/map?tripId=${trip.id}`} style={{ width: '100%', background: '#f1f5f9', color: '#334155', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', textAlign: 'center', textDecoration: 'none', display: 'block', marginTop: 'auto', opacity: trip.status === 'PENDING' ? 0.5 : 1, pointerEvents: trip.status === 'PENDING' ? 'none' : 'auto' }}>
                  View Route on Map
                </Link>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Request Location</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Select Employee</label>
              <select 
                value={selectedEmp} 
                onChange={e => setSelectedEmp(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
              >
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.empId})</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleRequestLocation}
              disabled={requesting || !selectedEmp}
              style={{ width: '100%', background: '#3b82f6', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '14px', cursor: (requesting || !selectedEmp) ? 'not-allowed' : 'pointer', opacity: (requesting || !selectedEmp) ? 0.7 : 1 }}
            >
              {requesting ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
