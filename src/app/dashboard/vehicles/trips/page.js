'use client';
import React, { useState, useEffect } from 'react';
import { Search, MapPin, CheckCircle, XCircle, ArrowLeft, Map as MapIcon, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const TripMap = dynamic(() => import('@/components/TripMap'), { ssr: false });
import { exportToCSV } from '../../../../lib/exportUtils';
import Dialog from '../../../../components/Dialog';
import { cleanTripTrack } from '@/lib/tripGps';

export default function TripReportsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegularizeModalOpen, setIsRegularizeModalOpen] = useState(false);
  const [selectedMapTrip, setSelectedMapTrip] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [requestData, setRequestData] = useState({ employeeId: '', vehicleId: '' });
  const [regularizeData, setRegularizeData] = useState({ employeeId: '', vehicleId: '', date: new Date().toISOString().split('T')[0], startLocation: '', endLocation: '', distanceKm: '', reason: '' });
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });

  const cleanedGpsDistanceKm = selectedMapTrip
    ? cleanTripTrack(selectedMapTrip.pings || []).distanceKm
    : 0;
  const savedDistanceKm = Number(selectedMapTrip?.distanceKm || 0);
  const hasGpsDistanceMismatch = selectedMapTrip?.pings?.length > 1
    && Math.abs(savedDistanceKm - cleanedGpsDistanceKm) > Math.max(1, savedDistanceKm * 0.2);

  const router = useRouter();

  useEffect(() => {
    fetchTrips();
    fetchEmployeesAndVehicles();
  }, []);

  const fetchEmployeesAndVehicles = async () => {
    try {
      const [empRes, vehRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/vehicles')
      ]);
      setEmployees(await empRes.json());
      setVehicles(await vehRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleRequestTrip = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/trips/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchTrips();
      } else {
        setDialogConfig({
          isOpen: true,
          type: 'alert',
          title: 'Error',
          message: 'Failed to request trip'
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegularizeTrip = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...regularizeData,
          status: 'PENDING_REGULARIZATION'
        })
      });

      if (!res.ok) {
        setDialogConfig({
          isOpen: true,
          type: 'alert',
          title: 'Error',
          message: 'Failed to regularize trip'
        });
        return;
      }
      
      setIsRegularizeModalOpen(false);
      setRegularizeData({ employeeId: '', vehicleId: '', date: new Date().toISOString().split('T')[0], startLocation: '', endLocation: '', distanceKm: '', reason: '' });
      fetchTrips();
    } catch (error) {
      console.error(error);
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Error',
        message: 'Error regularizing trip'
      });
    }
  };

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trips');
      const data = await res.json();
      setTrips(data);
    } catch (e) {
      console.error(e);
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
      if (res.ok) fetchTrips();
    } catch (e) {
      console.error(e);
    }
  };

  const applyCleanGpsDistance = async () => {
    if (!selectedMapTrip || ['APPROVED', 'PAID'].includes(selectedMapTrip.status)) return;
    const distanceKm = Number(cleanedGpsDistanceKm.toFixed(2));
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) return;
    const ratePerKm = Number(selectedMapTrip.vehicle?.ratePerKm || 0);
    const revisedAmount = distanceKm * ratePerKm;
    const accepted = window.confirm(
      `Update this trip from ${savedDistanceKm.toFixed(2)} km to ${distanceKm.toFixed(2)} km?\n\nThe expense will be recalculated from the vehicle rate (${revisedAmount.toFixed(2)}).`
    );
    if (!accepted) return;

    try {
      const response = await fetch(`/api/trips/${selectedMapTrip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedMapTrip.status, distanceKm }),
      });
      const updated = await response.json();
      if (!response.ok) throw new Error(updated.error || 'Could not update this trip.');
      setTrips(current => current.map(trip => trip.id === updated.id ? { ...trip, ...updated } : trip));
      setSelectedMapTrip(current => current?.id === updated.id ? { ...current, ...updated } : current);
      setDialogConfig({ isOpen: true, type: 'alert', title: 'Trip updated', message: `Distance updated to ${Number(updated.distanceKm).toFixed(2)} km and expense recalculated.` });
    } catch (error) {
      setDialogConfig({ isOpen: true, type: 'alert', title: 'Update failed', message: error.message || 'Could not update this trip.' });
    }
  };

  const filteredTrips = trips.filter(t => {
    const matchesSearch = 
      t.employee?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.startLocation && t.startLocation.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.endLocation && t.endLocation.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesDate = !dateFilter || t.date === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleExport = () => {
    if (filteredTrips.length === 0) return;
    const rows = filteredTrips.map(t => ({
      'EMPLOYEE': t.employee?.name || '—',
      'DATE': t.date || '—',
      'ROUTE': `${t.startLocation || '—'} -> ${t.endLocation || '—'}`,
      'VEHICLE': `${t.vehicle?.makeModel || '—'} (${t.vehicle?.plateNumber || '—'})`,
      'DISTANCE (KM)': t.distanceKm || 0,
      'AMOUNT (INR)': t.amount || 0,
      'STATUS': t.status || '—'
    }));
    exportToCSV(`trip-reports-${dateFilter || 'all'}.csv`, rows);
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontWeight: 500 }}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
          Trip & Mileage Reports
        </h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setIsRegularizeModalOpen(true)} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
            Regularize Trip
          </button>
          <button onClick={() => setIsModalOpen(true)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
            Request Live Tracking
          </button>
        </div>
        <button onClick={handleExport} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input 
            type="text" 
            placeholder="Search by employee or location..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
          />
        </div>
        <input 
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #d1d5db', color: '#4b5563' }}
        />
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
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

      <div style={{ background: '#fff', overflowX: 'auto', border: '1px solid #d1d5db' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
              <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', color: '#374151', fontWeight: 600 }}>Employee</th>
              <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', color: '#374151', fontWeight: 600 }}>Date</th>
              <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', color: '#374151', fontWeight: 600 }}>Route</th>
              <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', color: '#374151', fontWeight: 600 }}>Vehicle</th>
              <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', color: '#374151', fontWeight: 600 }}>Distance</th>
              <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', color: '#374151', fontWeight: 600 }}>Amount</th>
              <th style={{ padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', color: '#374151', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', color: '#374151', fontWeight: 600, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrips.map(trip => (
              <tr key={trip.id} style={{ borderBottom: '1px solid #d1d5db' }}>
                <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', fontWeight: 500, color: '#111827' }}>{trip.employee?.name}</td>
                <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', color: '#4b5563' }}>{trip.date}</td>
                <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', color: '#4b5563' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} color="#9ca3af" /> {trip.startLocation} &rarr; {trip.endLocation}
                  </div>
                  {trip.reason && (
                    <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>
                      Reason: {trip.reason}
                    </div>
                  )}
                </td>
                <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', color: '#4b5563' }}>
                  {trip.vehicle?.makeModel}<br/>
                  <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>({trip.vehicle?.plateNumber})</span>
                </td>
                <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', color: '#4b5563' }}>{trip.distanceKm} km</td>
                <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db', fontWeight: 600, color: '#059669' }}>₹{trip.amount.toFixed(2)}</td>
                <td style={{ padding: '0.75rem 1rem', borderRight: '1px solid #d1d5db' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block',
                    background: trip.status === 'PENDING' || trip.status === 'PENDING_REGULARIZATION' ? '#fef3c7' : trip.status === 'APPROVED' ? '#dbeafe' : trip.status === 'PAID' ? '#dcfce7' : trip.status === 'ACTIVE' ? '#cffafe' : trip.status === 'REQUESTED' ? '#f3f4f6' : trip.status === 'COMPLETED' ? '#e0e7ff' : '#fee2e2',
                    color: trip.status === 'PENDING' || trip.status === 'PENDING_REGULARIZATION' ? '#d97706' : trip.status === 'APPROVED' ? '#2563eb' : trip.status === 'PAID' ? '#16a34a' : trip.status === 'ACTIVE' ? '#0891b2' : trip.status === 'REQUESTED' ? '#4b5563' : trip.status === 'COMPLETED' ? '#4338ca' : '#dc2626'
                  }}>
                    {trip.status === 'PENDING_REGULARIZATION' ? 'REGULARIZATION PENDING' : trip.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {(trip.status === 'ACTIVE' || trip.status === 'COMPLETED' || trip.status === 'APPROVED' || trip.status === 'PAID' || trip.status === 'REJECTED') && (trip.pings?.length > 0 || trip.status === 'ACTIVE') && (
                    <button onClick={() => setSelectedMapTrip(trip)} style={{ background: trip.status === 'ACTIVE' ? '#eff6ff' : '#f3f4f6', color: trip.status === 'ACTIVE' ? '#1d4ed8' : '#374151', border: `1px solid ${trip.status === 'ACTIVE' ? '#bfdbfe' : '#d1d5db'}`, padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapIcon size={14} /> {trip.status === 'ACTIVE' ? 'Live Map' : 'Route'}
                    </button>
                  )}
                  {trip.status === 'COMPLETED' && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => updateStatus(trip.id, 'APPROVED')} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>Approve</button>
                      <button onClick={() => updateStatus(trip.id, 'REJECTED')} style={{ background: '#fff', color: '#ef4444', border: '1px solid #ef4444', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>Reject</button>
                    </div>
                  )}
                  {(trip.status === 'PENDING' || trip.status === 'PENDING_REGULARIZATION') && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => updateStatus(trip.id, 'APPROVED')} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>Approve</button>
                      <button onClick={() => updateStatus(trip.id, 'REJECTED')} style={{ background: '#fff', color: '#ef4444', border: '1px solid #ef4444', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>Reject</button>
                    </div>
                  )}
                  {trip.status === 'APPROVED' && (
                    <button onClick={() => updateStatus(trip.id, 'PAID')} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>Mark Paid</button>
                  )}
                </td>
              </tr>
            ))}
            {filteredTrips.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No trips found matching your criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>Request Live Tracking</h2>
            <form onSubmit={handleRequestTrip}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Employee</label>
                <select 
                  value={requestData.employeeId} 
                  onChange={e => setRequestData({...requestData, employeeId: e.target.value})} 
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Vehicle</label>
                <select 
                  value={requestData.vehicleId} 
                  onChange={e => setRequestData({...requestData, vehicleId: e.target.value})} 
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.filter(v => v.employeeId === requestData.employeeId || v.isCompanyVehicle).map(veh => (
                    <option key={veh.id} value={veh.id}>
                      {veh.isCompanyVehicle ? '[Company] ' : ''}{veh.makeModel} - {veh.plateNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: '#fff', border: '1px solid #d1d5db', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Send Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRegularizeModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>Regularize a Trip</h2>
            <form onSubmit={handleRegularizeTrip}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Employee</label>
                <select 
                  value={regularizeData.employeeId} 
                  onChange={e => setRegularizeData({...regularizeData, employeeId: e.target.value})} 
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Date</label>
                <input 
                  type="date" 
                  value={regularizeData.date} 
                  onChange={e => setRegularizeData({...regularizeData, date: e.target.value})} 
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Vehicle</label>
                <select 
                  value={regularizeData.vehicleId} 
                  onChange={e => setRegularizeData({...regularizeData, vehicleId: e.target.value})} 
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.filter(v => v.employeeId === regularizeData.employeeId || v.isCompanyVehicle).map(veh => (
                    <option key={veh.id} value={veh.id}>
                      {veh.isCompanyVehicle ? '[Company] ' : ''}{veh.makeModel} - {veh.plateNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>From</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Office"
                    value={regularizeData.startLocation} 
                    onChange={e => setRegularizeData({...regularizeData, startLocation: e.target.value})} 
                    required
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>To</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Client Site"
                    value={regularizeData.endLocation} 
                    onChange={e => setRegularizeData({...regularizeData, endLocation: e.target.value})} 
                    required
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Distance (km)</label>
                <input 
                  type="number" 
                  step="0.1"
                  placeholder="e.g. 15.5"
                  value={regularizeData.distanceKm} 
                  onChange={e => setRegularizeData({...regularizeData, distanceKm: e.target.value})} 
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Reason for Regularization</label>
                <textarea 
                  placeholder="e.g. Forgot to turn on GPS"
                  value={regularizeData.reason} 
                  onChange={e => setRegularizeData({...regularizeData, reason: e.target.value})} 
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', fontFamily: 'inherit' }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setIsRegularizeModalOpen(false)} style={{ background: '#fff', border: '1px solid #d1d5db', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedMapTrip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                Trip Route Map ({selectedMapTrip.date})
              </h2>
              <button onClick={() => setSelectedMapTrip(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <XCircle size={24} />
              </button>
            </div>
            
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
              <div><strong>Employee:</strong> {selectedMapTrip.employee?.name}</div>
              <div><strong>Vehicle:</strong> {selectedMapTrip.vehicle?.makeModel}</div>
              <div><strong>Recorded distance:</strong> {Number(selectedMapTrip.distanceKm || 0).toFixed(2)} km</div>
              {selectedMapTrip.pings?.length > 1 && (
                <div><strong>Clean GPS trace:</strong> {cleanedGpsDistanceKm.toFixed(2)} km</div>
              )}
            </div>

            {hasGpsDistanceMismatch && (
              <div role="status" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid #fcd34d', background: '#fffbeb', color: '#92400e', fontSize: '0.85rem' }}>
                This trip contains GPS jumps, so the recorded mileage and expense may be overstated. The map uses the cleaned GPS trace; review this report before approving the expense.
                {!['APPROVED', 'PAID'].includes(selectedMapTrip.status) && (
                  <button onClick={applyCleanGpsDistance} style={{ marginLeft: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid #d97706', background: '#fff', color: '#92400e', fontWeight: 700, cursor: 'pointer' }}>
                    Apply cleaned distance &amp; recalculate expense
                  </button>
                )}
              </div>
            )}

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

      <Dialog 
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
