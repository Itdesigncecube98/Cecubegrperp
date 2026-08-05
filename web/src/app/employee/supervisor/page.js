'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPunchRequests, updatePunchRequestStatus } from '../../../lib/data';
import { Check, X, Clock, ArrowLeft } from 'lucide-react';
import './supervisor.css';

export default function SupervisorDashboard() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (!empData) {
      router.replace('/login');
    } else {
      const parsed = JSON.parse(empData);
      setEmployee(parsed);
      loadRequests(parsed.id);
    }
  }, [router]);

  async function loadRequests(supervisorId) {
    setLoading(true);
    try {
      const data = await getPunchRequests(supervisorId);
      if (Array.isArray(data)) {
        setRequests(data);
      } else {
        console.error('API returned non-array:', data);
        setRequests([]);
        showToast('Failed to load requests from server', 'error');
      }
    } catch (e) {
      console.error('Failed to fetch requests', e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  const handleAction = async (id, status) => {
    try {
      await updatePunchRequestStatus(id, status);
      showToast(`Request ${status.toLowerCase()} successfully!`);
      if (employee) {
        loadRequests(employee.id);
      }
    } catch (e) {
      console.error('Failed to update status', e);
      showToast('Failed to update status', 'error');
    }
  };

  if (!employee) return null;

  return (
    <div className="dashboard-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="icon-btn" onClick={() => router.push('/employee/dashboard')} style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Supervisor Dashboard</h1>
          <p className="page-subtitle" style={{ color: '#6b7280' }}>Manage punch requests from your team.</p>
        </div>
      </div>

      <div className="glass-panel table-container">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '1rem' }}>Date & Time</th>
              <th style={{ padding: '1rem' }}>Employee</th>
              <th style={{ padding: '1rem' }}>Department</th>
              <th style={{ padding: '1rem' }}>Type</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading team requests...</td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No punch requests found from your team.</td>
              </tr>
            ) : (
              requests.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500' }}>{req.date}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Clock size={12} /> {req.time}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '600', color: '#111827' }}>{req.employee?.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{req.employee?.email}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500' }}>
                      {req.employee?.department}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ backgroundColor: req.type === 'IN' ? '#dcfce7' : '#fee2e2', color: req.type === 'IN' ? '#16a34a' : '#dc2626', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500' }}>
                      PUNCH {req.type}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {req.status === 'PENDING' && <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500' }}>Pending</span>}
                    {req.status === 'APPROVED' && <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500' }}>Approved</span>}
                    {req.status === 'REJECTED' && <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500' }}>Rejected</span>}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    {req.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleAction(req.id, 'APPROVED')}
                          style={{ padding: '0.4rem', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Approve"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => handleAction(req.id, 'REJECTED')}
                          style={{ padding: '0.4rem', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Reject"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>Processed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
