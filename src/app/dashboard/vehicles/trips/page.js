'use client';
import React, { useState, useEffect } from 'react';
import { Search, MapPin, CheckCircle, XCircle, ArrowLeft, Map as MapIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const TripMap = dynamic(() => import('@/components/TripMap'), { ssr: false });

export default function TripReportsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMapTrip, setSelectedMapTrip] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [requestData, setRequestData] = useState({ employeeId: '', vehicleId: '' });

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
        alert('Failed to request trip');
      }
    } catch (e) {
      console.error(e);
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

  const filteredTrips = trips.filter(t => {
    const matchesSearch = 
      t.employee?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.startLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.endLocation.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <button onClick={() => setIsModalOpen(true)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, marginLeft: 'auto' }}>
          Request Live Tracking
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
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
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

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
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
            {filteredTrips.map(trip => (
              <tr key={trip.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem', fontWeight: 500 }}>{trip.employee?.name}</td>
                <td style={{ padding: '1rem' }}>{trip.date}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <MapPin size={14} color="#6b7280" /> {trip.startLocation} &rarr; {trip.endLocation}
                  </div>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                  {trip.vehicle?.makeModel}<br/>
                  <span style={{ color: '#6b7280' }}>({trip.vehicle?.plateNumber})</span>
                </td>
                <td style={{ padding: '1rem' }}>{trip.distanceKm} km</td>
                <td style={{ padding: '1rem', fontWeight: 600, color: '#059669' }}>₹{trip.amount.toFixed(2)}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                    background: trip.status === 'PENDING' ? '#fef3c7' : trip.status === 'APPROVED' ? '#dbeafe' : trip.status === 'PAID' ? '#dcfce7' : trip.status === 'ACTIVE' ? '#cffafe' : trip.status === 'REQUESTED' ? '#f3f4f6' : trip.status === 'COMPLETED' ? '#e0e7ff' : '#fee2e2',
                    color: trip.status === 'PENDING' ? '#d97706' : trip.status === 'APPROVED' ? '#2563eb' : trip.status === 'PAID' ? '#16a34a' : trip.status === 'ACTIVE' ? '#0891b2' : trip.status === 'REQUESTED' ? '#4b5563' : trip.status === 'COMPLETED' ? '#4338ca' : '#dc2626'
                  }}>
                    {trip.status}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
                  {trip.status === 'PENDING' && (
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
