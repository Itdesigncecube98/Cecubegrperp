'use client';
import React, { useState, useEffect } from 'react';
import { getEmployees } from '../lib/data';
import { Mail, Plus, X, Calendar, ChevronLeft, Clock } from 'lucide-react';
import Link from 'next/link';

export default function OvertimeManagement() {
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'assign'
  
  // Assign Tab State
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ date: '', hours: '', reason: '' });
  
  // Schedule Tab State
  const [scheduledOvertimes, setScheduledOvertimes] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [toast, setToast] = useState(null);

  const loadAssignData = async () => {
    try {
      const empData = await getEmployees();
      setEmployees(Array.isArray(empData) ? empData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadScheduleData = async () => {
    setLoadingSchedule(true);
    try {
      const res = await fetch('/api/overtime');
      const data = await res.json();
      setScheduledOvertimes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  useEffect(() => {
    loadAssignData();
    loadScheduleData();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleSelect = (id) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(prev => prev.filter(e => e !== id));
    } else {
      setSelectedEmployees(prev => [...prev, id]);
    }
  };

  const selectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.id));
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) {
      showToast('Please select at least one employee', 'error');
      return;
    }
    
    try {
      const res = await fetch('/api/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: selectedEmployees,
          date: formData.date,
          hours: formData.hours,
          reason: formData.reason
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Assigned overtime and sent emails to ${data.count} employees`);
        setIsModalOpen(false);
        setFormData({ date: '', hours: '', reason: '' });
        setSelectedEmployees([]);
        loadScheduleData(); // Refresh schedule tab
        setActiveTab('schedule'); // Switch to schedule to see the new entries
      } else {
        showToast(data.error || 'Failed to assign overtime', 'error');
      }
    } catch (error) {
      showToast('Error connecting to server', 'error');
    }
  };

  const handleStatusAction = async (id, status) => {
    try {
      const res = await fetch('/api/overtime', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        showToast(`Overtime ${status.toLowerCase()} successfully.`);
        loadScheduleData();
      } else {
        const data = await res.json();
        showToast(data.error || `Failed to update status`, 'error');
      }
    } catch (error) {
      showToast('Error connecting to server', 'error');
    }
  };

  return (
    <div style={{ marginTop: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Overtime Management</h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', margin: '4px 0 0 0' }}>View scheduled overtimes and assign new ones.</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('schedule')}
          style={{ 
            background: 'none', border: 'none', borderBottom: activeTab === 'schedule' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'schedule' ? '#3b82f6' : '#64748b',
            padding: '0 0 12px 0', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Clock size={16} /> Scheduled Overtimes
        </button>
        <button 
          onClick={() => setActiveTab('assign')}
          style={{ 
            background: 'none', border: 'none', borderBottom: activeTab === 'assign' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'assign' ? '#3b82f6' : '#64748b',
            padding: '0 0 12px 0', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Plus size={16} /> Assign Overtime
        </button>
      </div>

      {activeTab === 'schedule' && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8ecf4', boxShadow: '0 4px 20px rgba(15,23,42,0.03)', padding: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #f1f5f9', background: '#f8fafc', borderTopLeftRadius: '10px' }}>Date</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>Employee</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>Hours</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>Reason</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #f1f5f9', background: '#f8fafc', borderTopRightRadius: '10px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingSchedule ? (
                <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading schedule...</td></tr>
              ) : scheduledOvertimes.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No overtimes assigned yet.</td></tr>
              ) : (
                scheduledOvertimes.map(ot => (
                  <tr key={ot.id}>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{ot.date}</td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#3b82f6', fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}>
                      {ot.employee?.name || 'Unknown'} <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '4px' }}>({ot.employee?.empId || '-'})</span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>{ot.hours || '-'}</td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>{ot.reason || '-'}</td>
                    <td style={{ padding: '16px', fontSize: '14px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: ot.status === 'PENDING' ? '#fef3c7' : ot.status === 'APPROVED' ? '#dcfce7' : ot.status === 'REJECTED' ? '#fee2e2' : '#e0e7ff', color: ot.status === 'PENDING' ? '#b45309' : ot.status === 'APPROVED' ? '#166534' : ot.status === 'REJECTED' ? '#991b1b' : '#3730a3', fontSize: '12px', fontWeight: 600 }}>{ot.status}</span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', borderBottom: '1px solid #f1f5f9' }}>
                      {ot.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleStatusAction(ot.id, 'APPROVED')} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                          <button onClick={() => handleStatusAction(ot.id, 'REJECTED')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'assign' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Select Employees</h2>
            <button 
              onClick={() => setIsModalOpen(true)}
              disabled={selectedEmployees.length === 0}
              style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '8px', 
                padding: '10px 20px', 
                background: selectedEmployees.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: selectedEmployees.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: selectedEmployees.length === 0 ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              <Mail size={16} /> Assign Overtime ({selectedEmployees.length})
            </button>
          </div>
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8ecf4', boxShadow: '0 4px 20px rgba(15,23,42,0.03)', padding: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #f1f5f9', background: '#f8fafc', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px', width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={employees.length > 0 && selectedEmployees.length === employees.length}
                      onChange={selectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>Emp ID</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>Employee Name</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>Email</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #f1f5f9', background: '#f8fafc', borderTopRightRadius: '10px', borderBottomRightRadius: '10px' }}>Department</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading employees...</td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No employees found.</td>
                  </tr>
                ) : (
                  employees.map(emp => (
                    <tr key={emp.id} onClick={() => toggleSelect(emp.id)} style={{ cursor: 'pointer', transition: 'background 0.2s', background: selectedEmployees.includes(emp.id) ? '#f8fafc' : 'transparent' }}>
                      <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedEmployees.includes(emp.id)}
                          onChange={() => {}} 
                          onClick={(e) => e.stopPropagation()} 
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#3b82f6', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>
                        {emp.empId || '-'}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a', fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}>
                        {emp.name}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                        {emp.email || emp.otherEmail || '-'}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                        {emp.department || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Assign Overtime</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
            </div>
            
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              This will assign overtime and send a notification email to <strong>{selectedEmployees.length}</strong> selected employee(s).
            </p>

            <form onSubmit={handleAssign}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Overtime Date *</label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Expected Hours (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g., 2 hours, 18:00 to 20:00"
                  value={formData.hours}
                  onChange={e => setFormData({ ...formData, hours: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Reason / Note (Optional)</label>
                <textarea 
                  rows={3}
                  placeholder="e.g., Project delivery deadline"
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}>Assign & Send Email</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px',
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white', padding: '12px 24px', borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 9999, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
