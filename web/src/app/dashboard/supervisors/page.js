'use client';
import React, { useState, useEffect } from 'react';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, getEmployeeStats } from '../../../lib/data';
import { Plus, Edit2, Trash2, X, BarChart2, User, PhoneCall, Briefcase, Users, Mail, Settings, PlusCircle, Shield, Clock } from 'lucide-react';
import './supervisors.css';

export default function SupervisorsPage() {
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsData, setStatsData] = useState([]);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [selectedEmpName, setSelectedEmpName] = useState('');
  const [formData, setFormData] = useState({ id: '', empId: '', name: '', email: '', password: '', department: '', supervisorId: '', selectedEmployeeId: '' });

  const calculateTotalTime = (slots) => {
    if (!slots || slots.length === 0) return '-';
    let totalMinutes = 0;
    slots.forEach(slot => {
      if (slot.in && slot.out) {
        const [inH, inM] = slot.in.split(':').map(Number);
        const [outH, outM] = slot.out.split(':').map(Number);
        const inTotal = (inH || 0) * 60 + (inM || 0);
        let outTotal = (outH || 0) * 60 + (outM || 0);
        
        // Handle AM/PM mistake or overnight shifts
        if (outTotal < inTotal) {
          const adjustedOut = outTotal + 12 * 60;
          if (adjustedOut >= inTotal) {
            outTotal = adjustedOut; // They probably meant PM
          } else {
            outTotal += 24 * 60; // Overnight shift
          }
        }
        
        totalMinutes += (outTotal - inTotal);
      }
    });
    if (totalMinutes === 0) return '-';
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  const loadEmployees = async () => {
    const data = await getEmployees('SUPERVISOR');
    setEmployees(Array.isArray(data) ? data : []);
    const regularEmps = await getEmployees('EMPLOYEE');
    setAllEmployees(Array.isArray(regularEmps) ? regularEmps : []);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const openModal = (emp = null) => {
    if (emp) {
      setFormData({ 
        id: emp.id,
        empId: emp.empId || '',
        name: emp.name || '',
        email: emp.email || '',
        password: emp.password || '',
        department: emp.department || '',
        supervisorId: emp.supervisorId || '',
        selectedEmployeeId: ''
      });
    } else {
      setFormData({ id: '', empId: '', name: '', email: '', password: '', department: '', supervisorId: '', selectedEmployeeId: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openStatsModal = async (emp) => {
    setSelectedEmpName(emp.name);
    setExpandedMonth(null);
    const data = await getEmployeeStats(emp.id);
    setStatsData(data);
    setIsStatsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.id) {
      await updateEmployee(formData.id, formData);
    } else {
      if (formData.selectedEmployeeId) {
        await updateEmployee(formData.selectedEmployeeId, { role: 'SUPERVISOR' });
      } else {
        alert("Please select an employee to promote.");
        return;
      }
    }
    loadEmployees();
    closeModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to demote this supervisor back to an employee?')) {
      await updateEmployee(id, { role: 'EMPLOYEE' });
      loadEmployees();
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Supervisors</h1>
          <p className="page-subtitle">Manage your company supervisors and their credentials.</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={20} /> Add Supervisor
        </button>
      </div>

      <div className="glass-panel table-container">
        <table>
          <thead>
            <tr>
              <th>Emp ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Supervisor</th>
              <th>Password</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">No supervisors found.</td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>
                    {emp.empId || '-'}
                  </td>
                  <td>
                    <div className="emp-name">{emp.name}</div>
                  </td>
                  <td>{emp.email}</td>
                  <td><span className="badge badge-success">{emp.department}</span></td>
                  <td>
                    {emp.supervisorId ? (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {employees.find(e => e.id === emp.supervisorId)?.name || `ID: ${emp.supervisorId}`}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className="masked-password">••••••••</span>
                  </td>
                  <td className="text-right">
                    <button className="icon-btn" title="View Stats" onClick={() => openStatsModal(emp)} style={{ color: 'var(--accent-color)' }}>
                      <BarChart2 size={16} />
                    </button>
                    <button className="icon-btn edit-btn" onClick={() => openModal(emp)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="icon-btn delete-btn" onClick={() => handleDelete(emp.id)} title="Demote to Employee">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Employee Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
          <div className="modal-header">
            <h2>{formData.id ? 'Edit Supervisor' : 'Add New Supervisor'}</h2>
            <button className="icon-btn" onClick={closeModal}>
              <X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              {!formData.id ? (
                <div className="input-group">
                  <label>Select Existing Employee</label>
                  <select required value={formData.selectedEmployeeId} onChange={e => setFormData({...formData, selectedEmployeeId: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%' }}>
                    <option value="">-- Select Employee --</option>
                    {allEmployees.map(empOption => (
                      <option key={empOption.id} value={empOption.id}>{empOption.name} ({empOption.department})</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Select an employee to promote to Supervisor role. No new password needed.</p>
                </div>
              ) : (
                <>
                  <div className="input-group">
                    <label>Employee ID (Optional)</label>
                    <input type="text" placeholder="e.g. E-001" value={formData.empId} onChange={e => setFormData({...formData, empId: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>Name</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>Email</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>Department</label>
                    <input required type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>Password</label>
                    <input type="text" placeholder="Leave blank to keep current password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                </>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">
                  {formData.id ? 'Update Supervisor' : 'Add Supervisor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {isStatsModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>{selectedEmpName}'s Attendance Stats</h2>
              <button className="icon-btn" onClick={() => setIsStatsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="table-container">
              <table style={{ marginBottom: '0' }}>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Present</th>
                    <th>Late</th>
                    <th>Absent</th>
                    <th>Night Shift</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {statsData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state" style={{ padding: '2rem' }}>No attendance records found.</td>
                    </tr>
                  ) : (
                    statsData.map(stat => (
                      <React.Fragment key={stat.month}>
                        <tr>
                          <td style={{ fontWeight: '600' }}>{stat.month}</td>
                          <td><span className="badge badge-success">{stat.Present}</span></td>
                          <td><span className="badge badge-warning">{stat.Late || 0}</span></td>
                          <td><span className="badge badge-danger">{stat.Absent}</span></td>
                          <td><span className="badge" style={{ background: '#3b82f6', color: 'white' }}>{stat['Night Shift'] || 0}</span></td>
                          <td className="text-right">
                            <button 
                              className="btn-outline" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => setExpandedMonth(expandedMonth === stat.month ? null : stat.month)}
                            >
                              {expandedMonth === stat.month ? 'Hide Details' : 'View Details'}
                            </button>
                          </td>
                        </tr>
                        {expandedMonth === stat.month && (
                          <tr>
                            <td colSpan="6" style={{ padding: '0', backgroundColor: '#f9fafb' }}>
                              <table style={{ margin: '0.5rem 1rem', width: 'calc(100% - 2rem)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                                <thead>
                                  <tr>
                                    <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.65rem' }}>Date</th>
                                    <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.65rem' }}>Status</th>
                                    <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.65rem' }}>Shift</th>
                                    <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.65rem' }}>Time Slots (In - Out)</th>
                                    <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.65rem' }}>Total Time</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {stat.details.map(d => {
                                    const dayName = new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
                                    const isSunday = new Date(d.date + 'T00:00:00').getDay() === 0;
                                    
                                    const isNightSlot = (slot) => {
                                      if (!slot.in) return false;
                                      const hour = parseInt(slot.in.split(':')[0], 10);
                                      return hour >= 19 || hour < 6;
                                    };
                                    
                                    let hasDay = false;
                                    let hasNight = false;
                                    
                                    if (d.timeSlots && d.timeSlots.length > 0) {
                                      d.timeSlots.forEach(s => {
                                        if (isNightSlot(s)) hasNight = true;
                                        else hasDay = true;
                                      });
                                    } else {
                                      if (d.shiftType === 'Night' || d.status === 'Night Shift') hasNight = true;
                                      else hasDay = true;
                                    }

                                    return (
                                    <tr key={d.date} style={{ backgroundColor: isSunday ? '#fff1f2' : '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '1rem 1.25rem' }}>
                                        <div style={{ fontWeight: 700, color: isSunday ? '#be123c' : '#1e293b' }}>{dayName}</div>
                                        <div style={{ fontSize: '12px', color: isSunday ? '#e11d48' : '#64748b', marginTop: '2px' }}>{d.date}</div>
                                      </td>
                                      <td style={{ padding: '1rem 1.25rem' }}>
                                        {d.status === 'Present' ? (
                                          <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{d.status}</span>
                                        ) : d.status === 'Absent' ? (
                                          <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{d.status}</span>
                                        ) : d.status === 'Late' ? (
                                          <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{d.status}</span>
                                        ) : (
                                          <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{d.status}</span>
                                        )}
                                      </td>
                                      <td style={{ padding: '1rem 1.25rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                                          {hasDay && <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '2px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700 }}>Day</span>}
                                          {hasNight && <span style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '2px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700 }}>Night</span>}
                                        </div>
                                      </td>
                                      <td style={{ padding: '1rem 1.25rem' }}>
                                        {d.timeSlots && d.timeSlots.length > 0 ? (
                                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {d.timeSlots.map((slot, i) => {
                                              const isNight = isNightSlot(slot);
                                              return (
                                              <span key={i} style={{ 
                                                backgroundColor: isNight ? '#f3e8ff' : '#dbeafe', 
                                                color: isNight ? '#7e22ce' : '#0369a1', 
                                                padding: '4px 12px', 
                                                borderRadius: '16px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600
                                              }}>
                                                {slot.in || '?'} - {slot.out || '?'}
                                              </span>
                                            )})}
                                          </div>
                                        ) : (
                                          <span style={{ color: 'var(--text-secondary)' }}>-</span>
                                        )}
                                      </td>
                                      <td style={{ padding: '1rem 1.25rem', fontWeight: '500', color: '#1e293b' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          {d.timeSlots && d.timeSlots.length > 0 && <Clock size={14} color="#64748b" />} {calculateTotalTime(d.timeSlots)}
                                        </div>
                                      </td>
                                    </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
