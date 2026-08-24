'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UserCog, Save, X, ToggleLeft, ToggleRight, Printer } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function SalaryHeadsPage() {
  const [activeTab, setActiveTab] = useState('CTC');
  const [heads, setHeads] = useState([]);
  const [headTypes, setHeadTypes] = useState([
    { name: 'CTC', isActive: true },
    { name: 'Earning', isActive: true },
    { name: 'Deduction', isActive: true },
    { name: 'Other', isActive: true }
  ]);

  useEffect(() => {
    const savedTypes = localStorage.getItem('headTypes');
    if (savedTypes) {
      setHeadTypes(JSON.parse(savedTypes));
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('salaryHeads');
    if (saved) {
      setHeads(JSON.parse(saved));
    } else {
      setHeads([
        { id: 1, category: 'CTC', description: 'Gross Salary', calculationType: 'Calculate By Formula', remark: '', isActive: true },
        { id: 2, category: 'CTC', description: 'Employer PF', calculationType: 'Fixed Amount', remark: '', isActive: true },
        { id: 3, category: 'Earning', description: 'Basic', calculationType: 'Calculate By Formula', remark: '', isActive: true },
        { id: 4, category: 'Earning', description: 'HRA', calculationType: 'Calculate By Formula', remark: '', isActive: true },
        { id: 5, category: 'Deduction', description: 'Advance', calculationType: 'Fixed Amount', remark: '', isActive: true },
        { id: 6, category: 'Other', description: 'Special Allowance', calculationType: 'Fixed Amount', remark: '', isActive: true },
      ]);
    }
  }, []);

  useEffect(() => {
    if (heads.length > 0) {
      localStorage.setItem('salaryHeads', JSON.stringify(heads));
    }
  }, [heads]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    description: '',
    calculationType: 'C : Calculate By Formula',
    remark: '',
    isActive: true
  });

  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null });
  const [infoDialog, setInfoDialog] = useState({ isOpen: false, title: '', message: '' });

  const resetForm = () => {
    setFormData({
      description: '',
      calculationType: 'C : Calculate By Formula',
      remark: '',
      isActive: true
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (head) => {
    setFormData({ ...head });
    setEditingId(head.id);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteDialog({ isOpen: true, id });
  };

  const confirmDelete = () => {
    setHeads(heads.filter(h => h.id !== deleteDialog.id));
    setDeleteDialog({ isOpen: false, id: null });
  };

  const toggleStatus = (id) => {
    setHeads(heads.map(h => h.id === id ? { ...h, isActive: !h.isActive } : h));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description) {
      setInfoDialog({ isOpen: true, title: 'Validation Error', message: 'Description is required' });
      return;
    }

    if (editingId) {
      setHeads(heads.map(h => h.id === editingId ? { ...formData, id: editingId, category: activeTab } : h));
    } else {
      setHeads([...heads, { ...formData, id: Date.now(), category: activeTab }]);
    }
    resetForm();
  };

  const filteredHeads = heads.filter(h => h.category === activeTab);

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
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '18px', fontWeight: 700 }}>
          <UserCog size={24} />
          Salary Heads Master <span style={{ fontSize: '14px', fontWeight: 400, color: '#6b7280' }}>Manage all salary components</span>
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
              <Plus size={18} /> Add {activeTab} Head
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', overflowX: 'auto' }}>
        {headTypes.filter(ht => ht.isActive).map(tab => (
          <button
            key={tab.name}
            onClick={() => { setActiveTab(tab.name); setIsFormOpen(false); }}
            style={{
              padding: '8px 24px',
              background: activeTab === tab.name ? '#0ea5e9' : '#f3f4f6',
              color: activeTab === tab.name ? '#fff' : '#4b5563',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.name} Heads
          </button>
        ))}
      </div>

      {isFormOpen && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ background: '#f1f5f9', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>
              {editingId ? `Edit ${activeTab} Head` : `Add ${activeTab} Head`}
            </h3>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Description <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={inputStyle}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>Calculation Type</label>
                <select
                  value={formData.calculationType}
                  onChange={(e) => setFormData({ ...formData, calculationType: e.target.value })}
                  style={inputStyle}
                >
                  <option value="C : Calculate By Formula">C : Calculate By Formula</option>
                  <option value="F : Fixed Amount">F : Fixed Amount</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: formData.isActive ? '#0ea5e9' : '#9ca3af' }}
                  >
                    {formData.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: formData.isActive ? '#0ea5e9' : '#6b7280' }}>
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Remark</label>
                <input
                  type="text"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  style={inputStyle}
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
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Description</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Calculation Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Remark</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredHeads.map((head, i) => (
              <tr key={head.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>{head.description}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>{head.calculationType}</td>
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
                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#4b5563' }}>{head.remark}</td>
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
            {filteredHeads.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                  No {activeTab} heads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        isOpen={deleteDialog.isOpen}
        type="confirm"
        title="Delete Head"
        message="Are you sure you want to delete this item? This action cannot be undone."
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
