'use client';
import React, { useState, useEffect } from 'react';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, getEmployeeStats } from '../../../lib/data';
import { Plus, Edit2, Trash2, X, BarChart2 } from 'lucide-react';
import './employees.css';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsData, setStatsData] = useState([]);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [selectedEmpName, setSelectedEmpName] = useState('');
  const [formData, setFormData] = useState({ id: '', empId: '', name: '', email: '', password: '', department: '', supervisorId: '' });

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

  const loadData = async () => {
    try {
      const data = await getEmployees();
      setEmployees(Array.isArray(data) ? data : []);
      // All employees can be supervisors — load all for the dropdown
      setSupervisors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadData();
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
        supervisorId: emp.supervisorId || ''
      });
    } else {
      setFormData({ id: '', empId: '', name: '', email: '', password: '', department: '', supervisorId: '' });
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
      await addEmployee({ ...formData, role: 'EMPLOYEE' });
    }
    loadData();
    closeModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      await deleteEmployee(id);
      loadData();
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage your company employees and their credentials.</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={20} /> Add Employee
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
                <td colSpan="6" className="empty-state">No employees found.</td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>
                    {emp.empId || '-'}
                  </td>
                  <td>
                    <div className="emp-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <a href={`/dashboard/employees/${emp.id}`} style={{ color: '#007bff', textDecoration: 'none', fontWeight: 600 }}>{emp.name}</a>
                      {emp.role === 'SUPERVISOR' && <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>Supervisor</span>}
                    </div>
                  </td>
                  <td>{emp.email}</td>
                  <td><span className="badge badge-success">{emp.department}</span></td>
                  <td>
                    {emp.supervisorId ? (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        {supervisors.find(e => e.id === emp.supervisorId)?.name || `ID: ${emp.supervisorId}`}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className="masked-password">••••••••</span>
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                      <button className="icon-btn" title="View Stats" onClick={() => openStatsModal(emp)} style={{ color: 'var(--accent-color)' }}>
                        <BarChart2 size={16} />
                      </button>
                      <button className="icon-btn edit-btn" onClick={() => openModal(emp)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="icon-btn delete-btn" onClick={() => handleDelete(emp.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
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
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h2>{formData.id ? 'Edit Employee' : 'Add Employee'}</h2>
              <button className="icon-btn" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
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
                <input required type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Supervisor (Optional)</label>
                <select value={formData.supervisorId || ''} onChange={e => setFormData({...formData, supervisorId: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <option value="">No Supervisor</option>
                  {supervisors.filter(s => s.id !== formData.id).map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name} ({sup.department})</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">Save Employee</button>
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
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {statsData.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-state" style={{ padding: '2rem' }}>No attendance records found.</td>
                    </tr>
                  ) : (
                    statsData.map(stat => (
                      <React.Fragment key={stat.month}>
                        <tr>
                          <td style={{ fontWeight: '600' }}>{stat.month}</td>
                          <td><span className="badge badge-success">{stat.Present}</span></td>
                          <td><span className="badge badge-warning">{stat.Late}</span></td>
                          <td><span className="badge badge-danger">{stat.Absent}</span></td>
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
                            <td colSpan="5" style={{ padding: '0', backgroundColor: '#f9fafb' }}>
                              <table style={{ margin: '0.5rem 1rem', width: 'calc(100% - 2rem)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                                <thead>
                                  <tr>
                                    <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.65rem' }}>Date</th>
                                    <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.65rem' }}>Status</th>
                                    <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.65rem' }}>Time Slots (In - Out)</th>
                                    <th style={{ backgroundColor: '#f3f4f6', fontSize: '0.65rem' }}>Total Time</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {stat.details.map(d => (
                                    <tr key={d.date} style={{ backgroundColor: '#ffffff' }}>
                                      <td style={{ padding: '0.5rem 1rem' }}>{d.date}</td>
                                      <td style={{ padding: '0.5rem 1rem' }}>{d.status}</td>
                                      <td style={{ padding: '0.5rem 1rem' }}>
                                        {d.timeSlots && d.timeSlots.length > 0 ? (
                                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {d.timeSlots.map((slot, i) => (
                                              <span key={i} className="badge badge-success" style={{ backgroundColor: '#e0e7ff', color: 'var(--accent-color)' }}>
                                                {slot.in || '?'} - {slot.out || '?'}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span style={{ color: 'var(--text-secondary)' }}>-</span>
                                        )}
                                      </td>
                                      <td style={{ padding: '0.5rem 1rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                                        {calculateTotalTime(d.timeSlots)}
                                      </td>
                                    </tr>
                                  ))}
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
