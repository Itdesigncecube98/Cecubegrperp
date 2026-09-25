'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CalendarHeart, Save, X, ToggleLeft, ToggleRight } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function LeaveTypePage() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await fetch('/api/synchronisation2/leave-type');
      if (res.ok) {
        const json = await res.json();
        setLeaveTypes(json);
      } else {
        showToast('Failed to fetch leave types', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Error connecting to server', 'error');
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    isActive: true
  });

  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null });

  const resetForm = () => {
    setFormData({ name: '', isActive: true });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (lt) => {
    setFormData({ ...lt });
    setEditingId(lt.id);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteDialog({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch(`/api/synchronisation2/leave-type/${deleteDialog.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Leave type deleted successfully');
        fetchLeaveTypes();
        setDeleteDialog({ isOpen: false, id: null });
      } else {
        showToast('Failed to delete leave type', 'error');
      }
    } catch (error) {
      showToast('Error deleting', 'error');
    }
  };

  const toggleStatus = async (id) => {
    const lt = leaveTypes.find(l => l.id === id);
    if (!lt) return;
    try {
      const res = await fetch(`/api/synchronisation2/leave-type/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lt, isActive: !lt.isActive })
      });
      if (res.ok) {
        fetchLeaveTypes();
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch (error) {
      showToast('Error updating status', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('LeaveType Name is required', 'error');
      return;
    }

    try {
      const url = editingId ? `/api/synchronisation2/leave-type/${editingId}` : '/api/synchronisation2/leave-type';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showToast(editingId ? 'Leave type updated successfully' : 'Leave type added successfully');
        fetchLeaveTypes();
        resetForm();
      } else {
        showToast('Failed to save leave type', 'error');
      }
    } catch (error) {
      showToast('Error saving', 'error');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#374151',
    outline: 'none',
    background: '#fff'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#0ea5e9',
    marginBottom: '6px'
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '18px', fontWeight: 700 }}>
          <CalendarHeart size={24} />
          Leave Type
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
          <div style={{ background: '#f1f5f9', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>
              {editingId ? 'Edit Leave Type' : 'Add Leave Type'}
            </h3>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>LeaveType Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={inputStyle}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: formData.isActive ? '#0ea5e9' : '#9ca3af' }}
                  >
                    {formData.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: formData.isActive ? '#0ea5e9' : '#6b7280' }}>
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={resetForm}
                style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', color: '#475569', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
              >
                <Save size={16} /> Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151', width: '60%' }}>LeaveType Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Active</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {leaveTypes.map((lt, i) => (
              <tr key={lt.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>{lt.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>
                  <button 
                    onClick={() => toggleStatus(lt.id)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: lt.isActive ? '#e0f2fe' : '#f3f4f6',
                      color: lt.isActive ? '#0ea5e9' : '#6b7280',
                    }}
                  >
                    {lt.isActive ? 'Yes' : 'No'}
                  </button>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleEdit(lt)} style={{ padding: '6px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteClick(lt.id)} style={{ padding: '6px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {leaveTypes.length === 0 && (
              <tr>
                <td colSpan="3" style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                  No Leave Types found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        isOpen={deleteDialog.isOpen}
        type="confirm"
        title="Delete Leave Type"
        message="Are you sure you want to delete this leave type?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null })}
      />

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '30px', fontWeight: 500, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
