'use client';
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Tag, Save, X, ToggleLeft, ToggleRight, Printer } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function HeadTypesPage() {
  const [headTypes, setHeadTypes] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('headTypes');
    if (saved) {
      setHeadTypes(JSON.parse(saved));
    } else {
      setHeadTypes([
        { id: 1, name: 'CTC', description: 'Cost to company components', isActive: true },
        { id: 2, name: 'Earning', description: 'Earnings for the employee', isActive: true },
        { id: 3, name: 'Deduction', description: 'Deductions from salary', isActive: true },
        { id: 4, name: 'Other', description: 'Other miscellaneous components', isActive: true },
      ]);
    }
  }, []);

  useEffect(() => {
    if (headTypes.length > 0) {
      localStorage.setItem('headTypes', JSON.stringify(headTypes));
    }
  }, [headTypes]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true
  });

  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null });
  const [infoDialog, setInfoDialog] = useState({ isOpen: false, title: '', message: '' });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isActive: true
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (headType) => {
    setFormData({ ...headType });
    setEditingId(headType.id);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteDialog({ isOpen: true, id });
  };

  const confirmDelete = () => {
    setHeadTypes(headTypes.filter(h => h.id !== deleteDialog.id));
    setDeleteDialog({ isOpen: false, id: null });
    const remaining = headTypes.filter(h => h.id !== deleteDialog.id);
    localStorage.setItem('headTypes', JSON.stringify(remaining));
  };

  const toggleStatus = (id) => {
    setHeadTypes(headTypes.map(h => h.id === id ? { ...h, isActive: !h.isActive } : h));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      setInfoDialog({ isOpen: true, title: 'Validation Error', message: 'Name is required' });
      return;
    }

    if (editingId) {
      setHeadTypes(headTypes.map(h => h.id === editingId ? { ...formData, id: editingId } : h));
    } else {
      setHeadTypes([...headTypes, { ...formData, id: Date.now() }]);
    }
    resetForm();
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
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '18px', fontWeight: 700 }}>
          <Tag size={24} />
          Head Types Master <span style={{ fontSize: '14px', fontWeight: 400, color: '#6b7280' }}>Define custom head categories</span>
        </div>
        {!isFormOpen && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => window.print()}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', background: '#f3f4f6', color: '#374151',
                border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Printer size={18} /> Print
            </button>
            <button
              onClick={handleAdd}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', background: '#0ea5e9', color: '#fff',
                border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Plus size={18} /> Add Head Type
            </button>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ background: '#f1f5f9', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>
              {editingId ? 'Edit Head Type' : 'Add Head Type'}
            </h3>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Head Type Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={inputStyle}
                  placeholder="e.g., Travel Heads"
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  style={inputStyle}
                  placeholder="Brief description of this head type"
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
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Head Type Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Description</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {headTypes.map((head, i) => (
              <tr key={head.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>{head.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>{head.description}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>
                  <button 
                    onClick={() => toggleStatus(head.id)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: head.isActive ? '#e0f2fe' : '#f3f4f6',
                      color: head.isActive ? '#0ea5e9' : '#6b7280',
                    }}
                  >
                    {head.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleEdit(head)} style={{ padding: '6px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteClick(head.id)} style={{ padding: '6px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {headTypes.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                  No Head Types found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        isOpen={deleteDialog.isOpen}
        type="confirm"
        title="Delete Head Type"
        message="Are you sure you want to delete this head type? It may affect existing Salary Heads using this type."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null })}
      />
      <Dialog
        isOpen={infoDialog.isOpen}
        type="info"
        title={infoDialog.title}
        message={infoDialog.message}
        onConfirm={() => setInfoDialog({ isOpen: false, title: '', message: '' })}
        onCancel={() => setInfoDialog({ isOpen: false, title: '', message: '' })}
      />
    </div>
  );
}
