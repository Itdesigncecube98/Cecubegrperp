'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CalendarDays, Save, X, Printer, RotateCcw } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function MusterStatusPage() {
  const [statuses, setStatuses] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/synchronisation2/muster-status');
      if (res.ok) {
        const json = await res.json();
        setStatuses(json);
      } else {
        showToast('Failed to fetch muster statuses', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Error connecting to server', 'error');
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    description: '',
    shortName: '',
    color: '#e5e7eb'
  });

  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null });

  const resetForm = () => {
    setFormData({ description: '', shortName: '', color: '#e5e7eb' });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (s) => {
    setFormData({ ...s });
    setEditingId(s.id);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteDialog({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch(`/api/synchronisation2/muster-status/${deleteDialog.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Muster status deleted successfully');
        fetchStatuses();
        setDeleteDialog({ isOpen: false, id: null });
      } else {
        showToast('Failed to delete muster status', 'error');
      }
    } catch (error) {
      showToast('Error deleting', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.shortName) {
      showToast('Description and Short Name are required', 'error');
      return;
    }

    try {
      const url = editingId ? `/api/synchronisation2/muster-status/${editingId}` : '/api/synchronisation2/muster-status';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showToast(editingId ? 'Muster status updated successfully' : 'Muster status added successfully');
        fetchStatuses();
        resetForm();
      } else {
        showToast('Failed to save muster status', 'error');
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
          <CalendarDays size={24} />
          Muster Status
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', background: '#e5e7eb', color: '#4b5563',
              border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer'
            }}
          >
            <RotateCcw size={16} /> Reset to Default
          </button>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', background: '#0284c7', color: '#fff',
              border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer'
            }}
            onClick={() => window.print()}
          >
            <Printer size={16} /> Print
          </button>
          {!isFormOpen && (
            <button
              onClick={handleAdd}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', background: '#0ea5e9', color: '#fff',
                border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer'
              }}
            >
              <Plus size={16} /> New
            </button>
          )}
        </div>
      </div>

      {isFormOpen && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ background: '#f1f5f9', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>
              {editingId ? 'Edit Muster Status' : 'Add Muster Status'}
            </h3>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Description <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  style={inputStyle}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>Short Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={formData.shortName}
                  onChange={(e) => setFormData({...formData, shortName: e.target.value})}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Status Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="color"
                    value={formData.color === '#e5e7eb' ? '#d1d5db' : formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    style={{ width: '40px', height: '38px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Color indicator for reports</span>
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
              <th style={{ width: '40px', padding: '12px', textAlign: 'center' }}>
                <input type="checkbox" style={{ cursor: 'pointer' }} />
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Description</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#374151', width: '60px' }}>Color</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Short Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#374151', width: '100px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((status, i) => (
              <tr key={status.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <input type="checkbox" style={{ cursor: 'pointer' }} />
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>{status.description}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ width: '14px', height: '14px', background: status.color, margin: '0 auto', border: '1px solid #d1d5db' }}></div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>{status.shortName}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleEdit(status)} style={{ padding: '4px', color: '#0ea5e9', border: 'none', background: 'none', cursor: 'pointer' }}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteClick(status.id)} style={{ padding: '4px', color: '#6b7280', border: 'none', background: 'none', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {statuses.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                  No Muster Statuses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        isOpen={deleteDialog.isOpen}
        type="confirm"
        title="Delete Muster Status"
        message="Are you sure you want to delete this muster status?"
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
