'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { ChevronLeft, List, MapPin } from 'lucide-react';
import { getLocationRequests } from '../../../../lib/data';
import dynamic from 'next/dynamic';
import '../../attendance/attendance.css';
import { useSearchParams } from 'next/navigation';

// Dynamically import MapComponent with SSR disabled
const MapComponent = dynamic(() => import('./MapComponent'), { 
  ssr: false,
  loading: () => <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading Map...</div>
});

export default function JourneyMap() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const tripIdParam = searchParams.get('tripId');
  
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(dateParam || today);
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(tripIdParam || '');
  const [loading, setLoading] = useState(true);

  const fetchTrips = async (d) => {
    setLoading(true);
    try {
      const data = await getLocationRequests('', d);
      setTrips(Array.isArray(data) ? data : []);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips(date);
    const interval = setInterval(() => {
      // Background poll
      getLocationRequests('', date).then(data => {
        if(Array.isArray(data)) setTrips(data);
      }).catch(()=>{});
    }, 10000);
    return () => clearInterval(interval);
  }, [date]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ padding: '1rem 2.5rem', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', textDecoration: 'none', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
            <ChevronLeft size={14} /> Back to Dashboard
          </Link>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Live Map Tracking</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', maxWidth: '250px' }}
          >
            <option value="">All Trips</option>
            {trips.map(trip => (
              <option key={trip.id} value={trip.id}>{trip.employee?.name} - {trip.status}</option>
            ))}
          </select>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ flex: 1, padding: '1.5rem 2.5rem', position: 'relative' }}>
        <div style={{ width: '100%', height: '100%', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading Map...</div>}>
            <MapComponent trips={trips} selectedTripId={selectedTripId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
