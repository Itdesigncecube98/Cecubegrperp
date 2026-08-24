'use client';
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Clock, Save, ArrowLeft } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function ShiftPage() {
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    const savedShifts = localStorage.getItem('employeeShifts');
    if (savedShifts) {
      setShifts(JSON.parse(savedShifts));
    } else {
      const defaultShifts = [
        { 
          id: 1, 
          shiftName: 'General', 
          shortName: '', 
          startTime: '09:30 AM', 
          endTime: '06:30 PM', 
          timeInHalfDay: '10:00 AM', 
          timeOutHalfDay: '05:15 PM', 
          latemarkAllow: '3', 
          gracePeriod: '0', 
          latemarkUpto: '0', 
          remark: '' 
        }
      ];
      setShifts(defaultShifts);
      localStorage.setItem('employeeShifts', JSON.stringify(defaultShifts));
    }
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    shiftName: '',
    shortName: '',
    startTime: '12:00 AM',
    shiftTimeHours: '0',
    shiftTimeMinutes: '0',
    endTime: '12:00 AM',
    timeInAfterEnabled: true,
    timeInAfter: '12:00 AM',
    timeOutBeforeEnabled: true,
    timeOutBefore: '12:00 AM',
    latemarksAllowed: '',
    totalLateMinutes: '',
    graceInTime: '',
    latemarkUpto: '',
    remark: ''
  });

  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null });

  const resetForm = () => {
    setFormData({
      shiftName: '',
      shortName: '',
      startTime: '12:00 AM',
      shiftTimeHours: '0',
      shiftTimeMinutes: '0',
      endTime: '12:00 AM',
      timeInAfterEnabled: true,
      timeInAfter: '12:00 AM',
      timeOutBeforeEnabled: true,
      timeOutBefore: '12:00 AM',
      latemarksAllowed: '',
      totalLateMinutes: '',
      graceInTime: '',
      latemarkUpto: '',
      remark: ''
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (s) => {
    // Map table fields to form fields for simple editing demo
    setFormData({
      ...formData,
      shiftName: s.shiftName,
      shortName: s.shortName,
      startTime: s.startTime,
      endTime: s.endTime,
      latemarksAllowed: s.latemarkAllow,
      graceInTime: s.gracePeriod,
      latemarkUpto: s.latemarkUpto,
      remark: s.remark,
      timeInAfter: s.timeInHalfDay,
      timeOutBefore: s.timeOutHalfDay
    });
    setEditingId(s.id);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteDialog({ isOpen: true, id });
  };

  const confirmDelete = () => {
    const newShifts = shifts.filter(s => s.id !== deleteDialog.id);
    setShifts(newShifts);
    localStorage.setItem('employeeShifts', JSON.stringify(newShifts));
    setDeleteDialog({ isOpen: false, id: null });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.shiftName) {
      alert('Name of Shift is required');
      return;
    }

    const newShift = {
      shiftName: formData.shiftName,
      shortName: formData.shortName,
      startTime: formData.startTime,
      endTime: formData.endTime,
      timeInHalfDay: formData.timeInAfter,
      timeOutHalfDay: formData.timeOutBefore,
      latemarkAllow: formData.latemarksAllowed || '0',
      gracePeriod: formData.graceInTime || '0',
      latemarkUpto: formData.latemarkUpto || '0',
      remark: formData.remark
    };

    let newShifts;
    if (editingId) {
      newShifts = shifts.map(s => s.id === editingId ? { ...newShift, id: editingId } : s);
    } else {
      newShifts = [...shifts, { ...newShift, id: Date.now() }];
    }
    setShifts(newShifts);
    localStorage.setItem('employeeShifts', JSON.stringify(newShifts));
    resetForm();
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #0ea5e9',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#374151',
    outline: 'none',
    background: '#fff'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: '#0ea5e9',
    marginBottom: '6px'
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '18px', fontWeight: 700 }}>
          <Clock size={24} />
          Shift <span style={{ fontSize: '14px', fontWeight: 400, color: '#6b7280' }}>View all details</span>
        </div>
        {!isFormOpen && (
          <button
            onClick={handleAdd}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', background: '#0ea5e9', color: '#fff',
              border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Plus size={18} /> New
          </button>
        )}
      </div>

      {isFormOpen && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>Add Shift</h3>
            <button onClick={resetForm} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              <ArrowLeft size={16} /> Back
            </button>
          </div>
          
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
              
              {/* Row 1 */}
              <div style={{ gridColumn: 'span 3' }}>
                <label style={labelStyle}>Name of Shift <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" value={formData.shiftName} onChange={e => setFormData({...formData, shiftName: e.target.value})} style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Short Name</label>
                <input type="text" value={formData.shortName} onChange={e => setFormData({...formData, shortName: e.target.value})} style={inputStyle} />
              </div>

              {/* Row 2 */}
              <div>
                <label style={labelStyle}>Start Time</label>
                <input type="text" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Shift Time - Hours</label>
                <select value={formData.shiftTimeHours} onChange={e => setFormData({...formData, shiftTimeHours: e.target.value})} style={inputStyle}>
                  {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Minutes</label>
                <select value={formData.shiftTimeMinutes} onChange={e => setFormData({...formData, shiftTimeMinutes: e.target.value})} style={inputStyle}>
                  <option value="0">0</option>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="45">45</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>End Time</label>
                <input type="text" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} style={{ ...inputStyle, background: '#f3f4f6' }} readOnly />
              </div>

              {/* Row 3 */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>
                  Time In After <input type="checkbox" checked={formData.timeInAfterEnabled} onChange={e => setFormData({...formData, timeInAfterEnabled: e.target.checked})} />
                </label>
                <input type="text" value={formData.timeInAfter} onChange={e => setFormData({...formData, timeInAfter: e.target.value})} style={inputStyle} disabled={!formData.timeInAfterEnabled} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>
                  Time Out Before <input type="checkbox" checked={formData.timeOutBeforeEnabled} onChange={e => setFormData({...formData, timeOutBeforeEnabled: e.target.checked})} />
                </label>
                <input type="text" value={formData.timeOutBefore} onChange={e => setFormData({...formData, timeOutBefore: e.target.value})} style={inputStyle} disabled={!formData.timeOutBeforeEnabled} />
              </div>

              {/* Row 4 */}
              <div>
                <label style={labelStyle}>No. of Latemarks Allowed</label>
                <input type="number" value={formData.latemarksAllowed} onChange={e => setFormData({...formData, latemarksAllowed: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Total Late Minutes Allowed</label>
                <input type="number" value={formData.totalLateMinutes} onChange={e => setFormData({...formData, totalLateMinutes: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Grace In Time (In Minutes)</label>
                <input type="number" value={formData.graceInTime} onChange={e => setFormData({...formData, graceInTime: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Latemark Upto (In Minutes)</label>
                <input type="number" value={formData.latemarkUpto} onChange={e => setFormData({...formData, latemarkUpto: e.target.value})} style={inputStyle} />
              </div>

              {/* Row 5 */}
              <div style={{ gridColumn: 'span 4' }}>
                <label style={labelStyle}>Remark</label>
                <input type="text" value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} style={inputStyle} />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px' }}>
              <button
                type="submit"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 500, cursor: 'pointer', fontSize: '13px' }}
              >
                <Save size={16} /> Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {!isFormOpen && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0ea5e9', color: '#fff' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Shift Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Short Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Start Time</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>End Time</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Time In Half Day</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Time Out Half Day</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>LateMark Allow(No)</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Grace Period</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Latemark Upto</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Remark</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift, i) => (
                <tr key={shift.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{shift.shiftName}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{shift.shortName}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{shift.startTime}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{shift.endTime}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{shift.timeInHalfDay}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{shift.timeOutHalfDay}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{shift.latemarkAllow}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{shift.gracePeriod}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{shift.latemarkUpto}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{shift.remark}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleEdit(shift)} style={{ padding: '4px', color: '#0ea5e9', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteClick(shift.id)} style={{ padding: '4px', color: '#6b7280', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && (
                <tr>
                  <td colSpan="11" style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    No Shifts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        isOpen={deleteDialog.isOpen}
        type="confirm"
        title="Delete Shift"
        message="Are you sure you want to delete this shift?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null })}
      />
    </div>
  );
}
