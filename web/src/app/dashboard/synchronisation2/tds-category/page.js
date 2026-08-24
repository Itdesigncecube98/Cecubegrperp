'use client';
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ShieldAlert, Save, X } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function TDSCategoryPage() {
  const [categories, setCategories] = useState([]);

  React.useEffect(() => {
    const saved = localStorage.getItem('tdsCategories');
    if (saved) {
      setCategories(JSON.parse(saved));
    } else {
      setCategories([
        { id: 1, name: 'Male' },
        { id: 2, name: 'Female' },
        { id: 3, name: 'Senior Citizen' },
        { id: 4, name: 'Optional Scheme' },
        { id: 5, name: 'Super Senior Citizen' },
      ]);
    }
  }, []);

  React.useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem('tdsCategories', JSON.stringify(categories));
    }
  }, [categories]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: ''
  });

  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null });

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (category) => {
    setFormData({ name: category.name });
    setEditingId(category.id);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteDialog({ isOpen: true, id });
  };

  const confirmDelete = () => {
    setCategories(categories.filter(c => c.id !== deleteDialog.id));
    setDeleteDialog({ isOpen: false, id: null });
    
    // Explicit update for local storage on delete
    const remaining = categories.filter(c => c.id !== deleteDialog.id);
    localStorage.setItem('tdsCategories', JSON.stringify(remaining));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Category Name is required');
      return;
    }

    if (editingId) {
      setCategories(categories.map(c => c.id === editingId ? { ...formData, id: editingId } : c));
    } else {
      setCategories([...categories, { ...formData, id: Date.now() }]);
    }
    resetForm();
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '13px',
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
          <ShieldAlert size={24} />
          TDS Category
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
            <Plus size={18} /> New Category
          </button>
        )}
      </div>

      {isFormOpen && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ background: '#f1f5f9', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>
              {editingId ? 'Edit TDS Category' : 'Add TDS Category'}
            </h3>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Category Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  style={inputStyle}
                  autoFocus
                />
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
      {!isFormOpen && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0ea5e9', color: '#fff' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, width: '100px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr key={cat.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563', fontWeight: 500 }}>{cat.name}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleEdit(cat)} style={{ padding: '4px', color: '#0ea5e9', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteClick(cat.id)} style={{ padding: '4px', color: '#6b7280', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan="2" style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    No Categories found.
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
        title="Delete Category"
        message="Are you sure you want to delete this category?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null })}
      />
    </div>
  );
}
