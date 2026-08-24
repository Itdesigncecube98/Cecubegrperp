'use client';
import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react';
import AppModal from '@/components/AppModal';
import ActionToolbar from '@/components/ActionToolbar';

const EMPTY = { name: '', days: [], assignedTo: 'All Employees' };
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function WeekoffTypes() {
  const [data, setData] = useState([
    { id: 1, name: 'Sunday Off', days: ['Sunday'], assignedTo: 'All Employees' },
    { id: 2, name: 'Weekend Off', days: ['Saturday', 'Sunday'], assignedTo: 'Selected Employees' },
    { id: 3, name: 'Monday Off', days: ['Monday'], assignedTo: 'Selected Employees' },
  ]);
  const [modal, setModal] = useState({ open: false, mode: 'add', row: null });
  const [form, setForm] = useState(EMPTY);
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  const [searchTerm, setSearchTerm] = useState('');

  const openAdd = () => { setForm(EMPTY); setModal({ open: true, mode: 'add', row: null }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ open: true, mode: 'edit', row }); };
  const openDelete = (id) => setDeleteModal({ open: true, id });

  const handleSave = () => {
    if (!form.name || form.days.length === 0) return;
    if (modal.mode === 'add') {
      setData(prev => [...prev, { ...form, id: Date.now() }]);
    } else {
      setData(prev => prev.map(r => r.id === form.id ? form : r));
    }
    setModal({ open: false, mode: 'add', row: null });
  };

  const handleDelete = () => {
    setData(prev => prev.filter(r => r.id !== deleteModal.id));
    setDeleteModal({ open: false, id: null });
  };

  const toggleDay = (day) => {
    setForm(prev => {
      if (prev.days.includes(day)) {
        return { ...prev, days: prev.days.filter(d => d !== day) };
      }
      return { ...prev, days: [...prev.days, day] };
    });
  };

  const filteredData = data.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div>
      <ActionToolbar onReset={() => setSearchTerm('')} shareTitle="Weekoff Types Configuration" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#fff', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
          <Search size={16} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search weekoff types..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '0.85rem', width: '220px' }} 
          />
        </div>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <Plus size={15} /> Add Weekoff Type
        </button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
        <table>
          <thead>
            <tr>
              <th>Weekoff Name</th>
              <th>Days Off</th>
              <th>Assigned To</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan="4" className="empty-state" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No Weekoff Types Found</td></tr>
            ) : filteredData.map(row => (
              <tr key={row.id}>
                <td style={{ fontWeight: 500 }}>{row.name}</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {row.days.map(d => (
                      <span key={d} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', fontWeight: 500 }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#475569' }}>
                    <Users size={14} />
                    {row.assignedTo}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    <button className="icon-btn edit-btn" title="Edit" onClick={() => openEdit(row)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#0284c7' }}><Pencil size={15} /></button>
                    <button className="icon-btn delete-btn" title="Delete" onClick={() => openDelete(row.id)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      <AppModal isOpen={modal.open} title={modal.mode === 'add' ? 'Add Weekoff Type' : 'Edit Weekoff Type'}
        onClose={() => setModal({ open: false })} onConfirm={handleSave} confirmLabel={modal.mode === 'add' ? 'Add' : 'Update'} size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Weekoff Name *</label>
            <input type="text" placeholder="e.g. Alternate Saturdays" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              style={{ padding: '0.45rem 0.65rem', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '0.82rem' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Select Days Off *</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {DAYS_OF_WEEK.map(day => (
                <div 
                  key={day}
                  onClick={() => toggleDay(day)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: `1px solid ${form.days.includes(day) ? '#0284c7' : '#cbd5e1'}`,
                    background: form.days.includes(day) ? '#e0f2fe' : '#fff',
                    color: form.days.includes(day) ? '#0369a1' : '#475569',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Assign To</label>
            <select value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} style={{ padding: '0.45rem 0.65rem', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '0.82rem' }}>
              <option>All Employees</option>
              <option>Selected Employees</option>
            </select>
          </div>

          {form.assignedTo === 'Selected Employees' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Select Employees</label>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0 0' }}>Employee multi-select dropdown would appear here.</p>
            </div>
          )}

        </div>
      </AppModal>

      {/* Delete Modal */}
      <AppModal isOpen={deleteModal.open} title="Confirm Delete"
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={handleDelete} confirmLabel="Delete" confirmColor="#ef4444" size="sm">
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Are you sure you want to delete this weekoff type? This action cannot be undone.</p>
      </AppModal>
    </div>
  );
}
