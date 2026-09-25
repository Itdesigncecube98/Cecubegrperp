'use client';
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar, Save, ArrowLeft, Settings } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function LTASetupPage() {
  const [setups, setSetups] = useState([
    { 
      id: 1, 
      effectiveFrom: '2026-08-21',
      minServedLimit: '12',
      maxLimit: '50000',
      availOnceIn: '1',
      formula: '(Basic + DA) * 1.5'
    }
  ]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    effectiveFrom: new Date().toISOString().split('T')[0],
    minServedLimit: '',
    maxLimit: '',
    availOnceIn: '',
    formula: ''
  });

  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null });

  const resetForm = () => {
    setFormData({
      effectiveFrom: new Date().toISOString().split('T')[0],
      minServedLimit: '',
      maxLimit: '',
      availOnceIn: '',
      formula: ''
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (setup) => {
    setFormData({ ...setup });
    setEditingId(setup.id);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteDialog({ isOpen: true, id });
  };

  const confirmDelete = () => {
    setSetups(setups.filter(s => s.id !== deleteDialog.id));
    setDeleteDialog({ isOpen: false, id: null });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.minServedLimit || !formData.maxLimit || !formData.availOnceIn) {
      alert('Please fill all required fields');
      return;
    }

    if (editingId) {
      setSetups(setups.map(s => s.id === editingId ? { ...formData, id: editingId } : s));
    } else {
      setSetups([...setups, { ...formData, id: Date.now() }]);
    }
    resetForm();
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #0ea5e9db',
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
          <Calendar size={24} />
          LTA Setup <span style={{ fontSize: '14px', fontWeight: 400, color: '#6b7280' }}>View all details</span>
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
            <Plus size={18} /> Add LTA Setup
          </button>
        )}
      </div>

      {isFormOpen && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} /> {editingId ? 'Edit LTA Setup' : 'Add LTA Setup'}
            </h3>
            <button onClick={resetForm} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              <ArrowLeft size={16} /> Back
            </button>
          </div>
          
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Effective From</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="date" 
                    value={formData.effectiveFrom} 
                    onChange={e => setFormData({...formData, effectiveFrom: e.target.value})} 
                    style={inputStyle} 
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Min Served Limit in Months <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="number" 
                  value={formData.minServedLimit} 
                  onChange={e => setFormData({...formData, minServedLimit: e.target.value})} 
                  style={inputStyle} 
                />
              </div>
              <div>
                <label style={labelStyle}>LTA Payable Amount Max Limit <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="number" 
                  value={formData.maxLimit} 
                  onChange={e => setFormData({...formData, maxLimit: e.target.value})} 
                  style={inputStyle} 
                />
              </div>
              <div>
                <label style={labelStyle}>LTA Facility can avail Once in <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="number" 
                  value={formData.availOnceIn} 
                  onChange={e => setFormData({...formData, availOnceIn: e.target.value})} 
                  style={inputStyle} 
                />
              </div>
              
              <div style={{ gridColumn: 'span 4' }}>
                <label style={labelStyle}>Formula</label>
                <input 
                  type="text" 
                  value={formData.formula} 
                  onChange={e => setFormData({...formData, formula: e.target.value})} 
                  style={inputStyle} 
                />
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
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Effective From</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Min Served Limit</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Max Limit</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Avail Once In</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Formula</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {setups.map((setup, i) => (
                <tr key={setup.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{setup.effectiveFrom}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{setup.minServedLimit} months</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>₹{setup.maxLimit}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{setup.availOnceIn} years</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4b5563' }}>{setup.formula}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleEdit(setup)} style={{ padding: '4px', color: '#0ea5e9', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteClick(setup.id)} style={{ padding: '4px', color: '#6b7280', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {setups.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    No LTA Setup found.
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
        title="Delete LTA Setup"
        message="Are you sure you want to delete this setup?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null })}
      />
    </div>
  );
}
