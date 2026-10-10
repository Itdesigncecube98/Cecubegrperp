'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import GoogleMapsView from '@/components/GoogleMapsView';

export default function PunchLiveLocationMap({ active = true, refreshInterval = 15000 }) {
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [authExpired, setAuthExpired] = useState(false);
  
  // Filtering state
  const [historyDate, setHistoryDate] = useState('');
  const [filterEmployeeIds, setFilterEmployeeIds] = useState([]);
  const [targetTime, setTargetTime] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // List of all employees for the dropdown
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEmployees(data);
      })
      .catch(console.error);
  }, []);

  const toggleEmployee = (empId) => {
    setFilterEmployeeIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const refreshLocations = useCallback(async () => {
    if (authExpired) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (historyDate) params.append('historyDate', historyDate);
      if (filterEmployeeIds.length > 0) params.append('filterEmployeeId', filterEmployeeIds.join(','));
      if (targetTime) params.append('targetTime', targetTime);
      
      const response = await fetch(`/api/attendance/live-location?${params.toString()}`, { cache: 'no-store' });
      if (response.status === 401) {
        setAuthExpired(true);
        setError('Your session has expired. Sign in again to view live locations.');
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load locations.');
      setLocations(Array.isArray(data.locations) ? data.locations : []);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Could not load locations.');
    } finally {
      setLoading(false);
    }
  }, [authExpired, historyDate, filterEmployeeIds, targetTime]);

  useEffect(() => {
    if (!active || authExpired) return undefined;
    
    // Initial fetch
    refreshLocations();
    
    // Only auto-refresh if we are in live view (no historyDate)
    if (!historyDate) {
      const intervalId = window.setInterval(refreshLocations, refreshInterval);
      return () => window.clearInterval(intervalId);
    }
  }, [active, authExpired, refreshInterval, refreshLocations, historyDate]);

  if (!active) return null;

  return (
    <section style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', marginBottom: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>{historyDate ? 'Historical GPS Tracking' : 'Live Fleet & Employee Tracking'}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            {loading ? 'Loading locations…' : `${locations.length} location${locations.length === 1 ? '' : 's'} found`}
          </p>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, background: '#fff', cursor: 'pointer', minWidth: 160, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{filterEmployeeIds.length === 0 ? 'All Employees' : `${filterEmployeeIds.length} Selected`}</span>
              <span style={{ fontSize: 10, marginLeft: 8 }}>▼</span>
            </div>
            {isDropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 250, overflowY: 'auto', minWidth: 220 }}>
                <div 
                  onClick={() => setFilterEmployeeIds([])}
                  style={{ padding: '8px 12px', fontSize: 13, borderBottom: '1px solid #e2e8f0', cursor: 'pointer', color: filterEmployeeIds.length === 0 ? '#3b82f6' : '#475569', fontWeight: filterEmployeeIds.length === 0 ? 600 : 400 }}
                >
                  All Employees
                </div>
                {employees.map(emp => (
                  <label key={emp.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', fontSize: 13, cursor: 'pointer', color: '#334155' }}>
                    <input 
                      type="checkbox" 
                      checked={filterEmployeeIds.includes(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      style={{ marginRight: 8 }}
                    />
                    {emp.name} {emp.empId ? `(${emp.empId})` : ''}
                  </label>
                ))}
                <div style={{ padding: '8px 12px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', position: 'sticky', bottom: 0 }}>
                  <button 
                    onClick={() => { setIsDropdownOpen(false); refreshLocations(); }}
                    style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <input 
            type="date" 
            value={historyDate}
            onChange={e => setHistoryDate(e.target.value)}
            title="Select date (leave empty for live tracking)"
            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, background: '#fff' }}
          />
          
          {historyDate && (
            <input 
              type="time" 
              value={targetTime}
              onChange={e => setTargetTime(e.target.value)}
              title="Select a specific time to see where they were (leave empty for full day)"
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, background: '#fff' }}
            />
          )}

          <button type="button" onClick={refreshLocations} style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 12px', background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            Apply Filter
          </button>
        </div>
      </div>
      
      {error ? (
        <div role="alert" style={{ padding: 12, color: '#b91c1c', background: '#fef2f2', borderRadius: 8 }}>
          {error}
          {authExpired && (
            <> <Link href="/login" style={{ color: '#1d4ed8', fontWeight: 600 }}>Sign in</Link></>
          )}
        </div>
      ) : locations.length ? (
        <GoogleMapsView
          locations={locations.map(location => ({
            ...location,
            name: `${location.employee?.name || location.employeeId}${location.employee?.empId ? ` (${location.employee.empId})` : ''}`,
          }))}
          paths={locations.filter(l => l.path && l.path.length > 1).map(l => l.path)}
          historyMarkers={locations.flatMap(l => 
            (l.path || []).filter((_, i) => i % 4 === 0).map(p => ({
              lat: p.lat,
              lng: p.lng,
              title: `${l.employee?.name} at ${new Date(p.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
            }))
          )}
          height={360}
          active
        />
      ) : (
        <div style={{ padding: 24, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
          No active punch locations are being shared.
        </div>
      )}
    </section>
  );
}
