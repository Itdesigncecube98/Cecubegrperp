'use client';
import React, { useState, useEffect } from 'react';
import { getAttendance, markAttendance, getAnnouncements } from '../../../lib/data';
import { Plus, X, Trash2, Save, Check, Calendar } from 'lucide-react';
import './attendance.css';

export default function Attendance() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);

  // Time Slots Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [currentSlots, setCurrentSlots] = useState([]);

  const loadData = async (targetDate) => {
    setLoading(true);
    try {
      const data = await getAttendance(targetDate);
      // parse timeSlots string back to array if it's string
      const parsedData = data.map(item => ({
        ...item,
        timeSlots: item.timeSlots ? JSON.parse(item.timeSlots) : []
      }));
      setAttendanceData(parsedData);
      
      const anns = await getAnnouncements();
      setAnnouncements(Array.isArray(anns) ? anns : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(date);
  }, [date]);

  const holiday = Array.isArray(announcements)
    ? announcements.find(a => a?.isHoliday && a?.date === date)
    : null;

  const [savingId, setSavingId] = useState(null);

  const handleStatusChange = (employeeId, status) => {
    setAttendanceData(prev => prev.map(record => 
      record.employee.id === employeeId ? { ...record, status } : record
    ));
  };

  const handleShiftChange = (employeeId, shiftType) => {
    setAttendanceData(prev => prev.map(record => 
      record.employee.id === employeeId ? { ...record, shiftType } : record
    ));
  };

  const saveRow = async (employeeId) => {
    const record = attendanceData.find(r => r.employee.id === employeeId);
    if (!record) return;

    setSavingId(employeeId);
    try {
      await markAttendance(employeeId, date, record.status, record.shiftType || 'Day', JSON.stringify(record.timeSlots));
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setSavingId(null), 1000); // Show checkmark for 1 second
    }
  };

  const openTimeSlotsModal = (record) => {
    setSelectedEmp(record);
    setCurrentSlots([...record.timeSlots]);
    setIsModalOpen(true);
  };

  const addTimeSlot = () => {
    setCurrentSlots([...currentSlots, { in: '', out: '' }]);
  };

  const updateTimeSlot = (index, field, value) => {
    const updated = [...currentSlots];
    updated[index][field] = value;
    setCurrentSlots(updated);
  };

  const removeTimeSlot = (index) => {
    setCurrentSlots(currentSlots.filter((_, i) => i !== index));
  };

  const saveTimeSlots = async () => {
    // Optimistic update
    setAttendanceData(prev => prev.map(record => 
      record.employee.id === selectedEmp.employee.id 
        ? { ...record, timeSlots: currentSlots } 
        : record
    ));

    // Server update
    await markAttendance(selectedEmp.employee.id, date, selectedEmp.status, selectedEmp.shiftType || 'Day', JSON.stringify(currentSlots));
    
    setIsModalOpen(false);
    setSelectedEmp(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Tracking</h1>
          <p className="page-subtitle">Mark and view daily attendance records.</p>
        </div>
        
        <div className="date-picker-wrapper glass-panel">
          <label>Select Date:</label>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="date-input"
          />
        </div>
      </div>

      {holiday && (
        <div style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', border: '1px solid #86efac', padding: '1.25rem 1.5rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.1)' }}>
          <div style={{ background: '#16a34a', color: '#fff', padding: '10px', borderRadius: '10px' }}>
            <Calendar size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#14532d', margin: '0 0 4px 0' }}>Holiday: {holiday.subject}</h2>
            <p style={{ fontSize: '14px', color: '#166534', margin: 0 }}>Attendance is not required for employees today.</p>
          </div>
        </div>
      )}

      <div className="glass-panel table-container">
        <table>
          <thead>
            <tr>
              <th>Emp ID</th>
              <th>Employee Name</th>
              <th>Department</th>
              <th>Shift</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="empty-state">Loading records...</td>
              </tr>
            ) : attendanceData.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">No employees found. Please add employees first.</td>
              </tr>
            ) : (
              attendanceData.map(record => (
                <tr key={record.employee.id}>
                  <td style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>
                    {record.employee.empId || '-'}
                  </td>
                  <td>
                    <div className="emp-name">{record.employee.name}</div>
                  </td>
                  <td>{record.employee.department}</td>
                  <td>
                    <span className={`badge ${
                      record.status === 'Present' ? 'badge-success' : 
                      record.status === 'Absent' ? 'badge-danger' : ''
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td>
                    <select 
                      value={record.shiftType || 'Day'}
                      onChange={(e) => handleShiftChange(record.employee.id, e.target.value)}
                      className="status-select"
                      style={{ width: '110px' }}
                    >
                      <option value="Day">Day Shift</option>
                      <option value="Night">Night Shift</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <select 
                        value={record.status}
                        onChange={(e) => handleStatusChange(record.employee.id, e.target.value)}
                        className="status-select"
                        style={{ width: '120px' }}
                      >
                        <option value="Not Marked">Not Marked</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                      </select>
                      
                      <button 
                        className="btn-outline" 
                        onClick={() => openTimeSlotsModal(record)}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        Times ({record.timeSlots.length})
                      </button>

                      <button 
                        className="btn-primary" 
                        onClick={() => saveRow(record.employee.id)}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        {savingId === record.employee.id ? <Check size={16} /> : <Save size={16} />} 
                        {savingId === record.employee.id ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Time Slots Modal */}
      {isModalOpen && selectedEmp && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Time Slots for {selectedEmp.employee.name}</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Date: {date}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              {currentSlots.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 1rem' }}>No time slots added.</div>
              ) : (
                currentSlots.map((slot, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>In Time</label>
                      <input 
                        type="time" 
                        value={slot.in} 
                        onChange={(e) => updateTimeSlot(idx, 'in', e.target.value)}
                        className="date-input" 
                        style={{ padding: '0.5rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Out Time</label>
                      <input 
                        type="time" 
                        value={slot.out} 
                        onChange={(e) => updateTimeSlot(idx, 'out', e.target.value)}
                        className="date-input"
                        style={{ padding: '0.5rem' }}
                      />
                    </div>
                    <button 
                      className="icon-btn delete-btn" 
                      onClick={() => removeTimeSlot(idx)}
                      style={{ marginTop: '1rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="btn-outline" onClick={addTimeSlot}>
                <Plus size={16} /> Add Slot
              </button>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="button" className="btn-primary" onClick={saveTimeSlots}>Save Slots</button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
