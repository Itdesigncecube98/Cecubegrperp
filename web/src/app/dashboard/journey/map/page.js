'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, MapPin } from 'lucide-react';
import { getLocationRequests, updateLocationRequest } from '../../../../lib/data';
import '../../attendance/attendance.css';

export default function JourneyMap() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async (d, showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await getLocationRequests('', d);
      // Data contains location requests with employee relation
      setRequests(data || []);
    } catch(e) {
      console.error(e);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(date);
    const interval = setInterval(() => {
      fetchRequests(date, false);
    }, 10000);
    return () => clearInterval(interval);
  }, [date]);

  const handleStopTracking = async (reqId) => {
    try {
      await updateLocationRequest({ id: reqId, status: 'STOPPED' });
      fetchRequests(date, false);
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Map View</div>
      </div>

      <div className="card">
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Organization</label>
            <select className="filterInput">
              <option>Cecube Engineering India Pvt Ltd</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Date</label>
            <input type="date" className="filterInput" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Status</label>
            <select className="filterInput">
              <option>All</option>
            </select>
          </div>
        </div>
        <div className="filterActions" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btnPrimary">View</button>
            <button className="btn btnPrimary">Clear</button>
          </div>
          <button className="btn btnPrimary">More Filters</button>
        </div>
      </div>

      <div className="card" style={{ minHeight: '500px' }}>
        <h2 className="tableTitle" style={{ marginBottom: '1.5rem' }}>Employee Locations ({date})</h2>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading locations...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No location requests found for this date.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {requests.map(req => (
              <div key={req.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '15px', color: '#111827' }}>{req.employee?.name || 'Unknown'}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '0.5rem' }}>{new Date(req.requestedAt).toLocaleTimeString()}</div>
                
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ 
                    backgroundColor: req.status === 'ACTIVE' ? '#dbeafe' : req.status === 'COMPLETED' ? '#dcfce7' : req.status === 'STOPPED' ? '#f3f4f6' : '#fef3c7', 
                    color: req.status === 'ACTIVE' ? '#2563eb' : req.status === 'COMPLETED' ? '#16a34a' : req.status === 'STOPPED' ? '#4b5563' : '#d97706',
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold'
                  }}>{req.status}</span>
                  {req.movementType && (
                    <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                      {req.movementType}
                    </span>
                  )}
                  {req.status === 'ACTIVE' && (
                    <button onClick={() => handleStopTracking(req.id)} style={{
                      backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', marginLeft: 'auto'
                    }}>Stop Tracking</button>
                  )}
                </div>

                {(req.status === 'ACTIVE' || req.status === 'COMPLETED' || req.status === 'STOPPED') && req.latitude && req.longitude && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                      <MapPin size={16} color="#ef4444" />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Live Location</span>
                      <a href={`https://maps.google.com/?q=${req.latitude},${req.longitude}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '12px', marginLeft: 'auto' }}>
                        Open in Maps
                      </a>
                    </div>
                    <iframe 
                      width="100%" 
                      height="200" 
                      frameBorder="0" 
                      scrolling="no" 
                      marginHeight="0" 
                      marginWidth="0" 
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${req.longitude - 0.005},${req.latitude - 0.005},${req.longitude + 0.005},${req.latitude + 0.005}&layer=mapnik&marker=${req.latitude},${req.longitude}`} 
                      style={{ border: '1px solid #e5e7eb', borderRadius: '4px' }}
                    ></iframe>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
