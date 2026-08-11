'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Car } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('employee'); // 'employee' or 'company'
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, employeeId: '', isCompanyVehicle: false, makeModel: '', plateNumber: '', vehicleType: 'Two Wheeler', ratePerKm: 0, isActive: true });

  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vehRes, empRes] = await Promise.all([
        fetch('/api/vehicles'),
        fetch('/api/employees')
      ]);
      const vehData = await vehRes.json();
      const empData = await empRes.json();
      setVehicles(vehData);
      setEmployees(empData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const url = formData.id ? `/api/vehicles/${formData.id}` : '/api/vehicles';
      const method = formData.id ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to save vehicle');
        return;
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Error saving vehicle');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const openModal = (veh = null) => {
    if (veh) {
      setFormData({ ...veh, employeeId: veh.employeeId || '', isCompanyVehicle: veh.isCompanyVehicle });
    } else {
      setFormData({ id: null, employeeId: '', isCompanyVehicle: activeTab === 'company', makeModel: '', plateNumber: '', vehicleType: 'Two Wheeler', ratePerKm: 0, isActive: true });
    }
    setIsModalOpen(true);
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.makeModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (v.employee?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'company') {
      return v.isCompanyVehicle && matchesSearch;
    } else {
      return !v.isCompanyVehicle && matchesSearch;
    }
  });

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Car /> Vehicle Directory
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => router.push('/dashboard/vehicles/trips')} style={{
            background: '#fff', border: '1px solid #d1d5db', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 500
          }}>
            Trip Reports
          </button>
          <button onClick={() => openModal()} style={{
            background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('employee')} 
          style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: activeTab === 'employee' ? 600 : 400, color: activeTab === 'employee' ? '#2563eb' : '#4b5563', borderBottom: activeTab === 'employee' ? '2px solid #2563eb' : '2px solid transparent', cursor: 'pointer' }}
        >
          Employee Vehicles
        </button>
        <button 
          onClick={() => setActiveTab('company')} 
          style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: activeTab === 'company' ? 600 : 400, color: activeTab === 'company' ? '#2563eb' : '#4b5563', borderBottom: activeTab === 'company' ? '2px solid #2563eb' : '2px solid transparent', cursor: 'pointer' }}
        >
          Company Vehicles
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
        <input 
          type="text" 
          placeholder="Search vehicles or employees..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
        />
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {activeTab === 'employee' && <th style={{ padding: '1rem' }}>Employee</th>}
              <th style={{ padding: '1rem' }}>Vehicle</th>
              <th style={{ padding: '1rem' }}>Vehicle No</th>
              <th style={{ padding: '1rem' }}>Type</th>
              <th style={{ padding: '1rem' }}>Rate (per km)</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.map(veh => (
              <tr key={veh.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                {activeTab === 'employee' && <td style={{ padding: '1rem' }}>{veh.employee?.name}</td>}
                <td style={{ padding: '1rem', fontWeight: 500 }}>{veh.makeModel}</td>
                <td style={{ padding: '1rem' }}>{veh.plateNumber}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ padding: '4px 8px', background: '#f3f4f6', borderRadius: '4px', fontSize: '0.875rem' }}>
                    {veh.vehicleType}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>₹{veh.ratePerKm}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ padding: '4px 8px', background: veh.isActive ? '#dcfce7' : '#fee2e2', color: veh.isActive ? '#16a34a' : '#dc2626', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 500 }}>
                    {veh.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <button onClick={() => openModal(veh)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', marginRight: '1rem' }}><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(veh.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>{formData.id ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
            <form onSubmit={handleSave}>
              {!formData.isCompanyVehicle && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Employee</label>
                  <select 
                    value={formData.employeeId} 
                    onChange={e => setFormData({...formData, employeeId: e.target.value})} 
                    required={!formData.isCompanyVehicle}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Make & Model</label>
                <input 
                  type="text" 
                  value={formData.makeModel} 
                  onChange={e => setFormData({...formData, makeModel: e.target.value})} 
                  placeholder="e.g. Honda Activa"
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Vehicle No</label>
                <input 
                  type="text" 
                  value={formData.plateNumber} 
                  onChange={e => setFormData({...formData, plateNumber: e.target.value})} 
                  placeholder="e.g. HR26AB1234"
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Vehicle Type</label>
                  <select 
                    value={formData.vehicleType} 
                    onChange={e => setFormData({...formData, vehicleType: e.target.value})} 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  >
                    <option value="Two Wheeler">Two Wheeler</option>
                    <option value="Four Wheeler">Four Wheeler</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Rate per Km (₹)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formData.ratePerKm === null || isNaN(formData.ratePerKm) ? '' : formData.ratePerKm} 
                    onChange={e => setFormData({...formData, ratePerKm: e.target.value === '' ? '' : parseFloat(e.target.value)})} 
                    required
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  <input 
                    type="checkbox" 
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                  /> Active
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: '#fff', border: '1px solid #d1d5db', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Save Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
