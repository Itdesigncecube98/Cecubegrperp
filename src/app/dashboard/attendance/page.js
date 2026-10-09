'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { getAttendance, markAttendance, getAnnouncements } from '../../../lib/data';
import * as XLSX from 'xlsx';
import { Plus, X, Trash2, Save, Check, Calendar, Clock, FileSpreadsheet } from 'lucide-react';
import './attendance.css';

const format24HourTime = (value) => {
  if (!value) return '';
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return String(value);

  let hours = Number(match[1]);
  if (match[3]) {
    const meridiem = match[3].toUpperCase();
    if (meridiem === 'AM' && hours === 12) hours = 0;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
  }
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
};

export default function Attendance() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredAttendance = useMemo(() => {
    if (!searchTerm.trim()) return attendanceData;
    const lowerSearch = searchTerm.toLowerCase();
    return attendanceData.filter(record => 
      (record.employee?.name || '').toLowerCase().includes(lowerSearch) ||
      (record.employee?.empId || '').toLowerCase().includes(lowerSearch) ||
      (record.employee?.department || '').toLowerCase().includes(lowerSearch)
    );
  }, [attendanceData, searchTerm]);

  const [savingId, setSavingId] = useState(null);
  const exportAttendance = () => {
    if (filteredAttendance.length === 0) return;

    const rows = filteredAttendance.map(record => ({
      'Employee ID': record.employee.empId || '',
      'Employee Name': record.employee.name || '',
      Department: record.employee.department || '',
      Date: date,
      'Time Slots': record.timeSlots.map(slot =>
        `${format24HourTime(slot.in) || '--:--'} - ${format24HourTime(slot.out) || 'Open'}`
      ).join(', '),
      Status: record.status || 'Not Marked',
      Shift: record.shiftType === 'Night' ? 'Night Shift' : 'Day Shift',
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 16 }, { wch: 28 }, { wch: 24 }, { wch: 14 },
      { wch: 32 }, { wch: 18 }, { wch: 16 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(workbook, `Attendance_${date}.xlsx`);
  };

  const handleStatusChange = (employeeId, status) => {
    setAttendanceData(prev => prev.map(record => 
      record.employee.id === employeeId ? { ...record, status } : record
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
          <h1 className="page-title" style={{ margin: 0, marginBottom: '0.5rem' }}>Attendance Tracking</h1>
          <p className="page-subtitle">Mark and view daily attendance records. Open punches are automatically closed at 19:00.</p>
        </div>
        
        <div className="attendance-controls" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <input 
              type="text" 
              placeholder="Search by name, ID, dept..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', 
                height: '42px',
                padding: '0 14px 0 40px', 
                borderRadius: '10px', 
                border: '1px solid #e2e8f0', 
                outline: 'none',
                fontSize: '14px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                background: '#fff',
                color: '#1e293b'
              }}
            />
            <svg style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          
          <div>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              style={{
                height: '42px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0 14px',
                outline: 'none',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1e293b',
                background: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                cursor: 'pointer'
              }}
            />
          </div>
          <button
            type="button"
            className="attendance-export-button"
            onClick={exportAttendance}
            disabled={filteredAttendance.length === 0}
            title="Export visible attendance to Excel"
          >
            <FileSpreadsheet size={17} />
            Export Excel
          </button>
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

      <div className="glass-panel attendance-table-wrap">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Emp ID</th>
              <th>Employee Name</th>
              <th>Department</th>
              <th>Time Slots</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="empty-state">Loading records...</td>
              </tr>
            ) : filteredAttendance.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">No matching employees found.</td>
              </tr>
            ) : (
              filteredAttendance.map(record => (
                <tr key={record.employee.id}>
                  <td style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>
                    {record.employee.empId || '-'}
                  </td>
                  <td>
                    <div className="emp-name">{record.employee.name}</div>
                  </td>
                  <td>{record.employee.department}</td>
                  <td>
                    {record.timeSlots.length ? (
                      <div className="attendance-time-list">
                        {record.timeSlots.map((slot, index) => (
                          <span className="attendance-time-slot" key={`${record.employee.id}-${index}`}>
                            {format24HourTime(slot.in) || '--:--'} - {format24HourTime(slot.out) || 'Open'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="attendance-no-times">No punches</span>
                    )}
                  </td>
                  <td>
                    <select
                      value={record.status}
                      onChange={(e) => handleStatusChange(record.employee.id, e.target.value)}
                      className="attendance-status-select"
                    >
                      <option value="Not Marked">Not Marked</option>
                      <option value="Present">Present</option>
                      <option value="Half Day">Half Day</option>
                      <option value="Absent">Absent</option>
                      <option value="EL">EL (Earned Leave)</option>
                      <option value="CL">CL (Casual Leave)</option>
                      <option value="SL">SL (Sick Leave)</option>
                    </select>
                  </td>
                  <td>
                    <div className="attendance-actions">
                      <button
                        type="button"
                        className="attendance-edit-times"
                        onClick={() => openTimeSlotsModal(record)}
                        aria-label={`Edit time slots for ${record.employee.name}`}
                        title="Edit time slots"
                      >
                        <Clock size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-primary" 
                        onClick={() => saveRow(record.employee.id)}
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
                        lang="en-GB"
                        step="60"
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
                        lang="en-GB"
                        step="60"
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
