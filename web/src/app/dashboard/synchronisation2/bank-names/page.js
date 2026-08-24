'use client';
import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import AppModal from '@/components/AppModal';
import ActionToolbar from '@/components/ActionToolbar';

const EMPTY = { name: '', status: 'Active' };

export default function BankNames() {
  const [data, setData] = useState([
    { id: 1, name: 'State Bank of India', status: 'Active' },
    { id: 2, name: 'HDFC Bank', status: 'Active' },
    { id: 3, name: 'ICICI Bank', status: 'Active' },
    { id: 4, name: 'Axis Bank', status: 'Active' },
  ]);
  const [modal, setModal] = useState({ open: false, mode: 'add', row: null });
  const [form, setForm] = useState(EMPTY);
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  const [searchTerm, setSearchTerm] = useState('');

  const openAdd = () => { setForm(EMPTY); setModal({ open: true, mode: 'add', row: null }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ open: true, mode: 'edit', row }); };
  const openDelete = (id) => setDeleteModal({ open: true, id });

  const handleSave = () => {
    if (!form.name) return;
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

  const filteredData = data.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div>
      <ActionToolbar onReset={() => setSearchTerm('')} shareTitle="Bank Names Configuration" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#fff', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
          <Search size={16} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search banks..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '0.85rem', width: '200px' }} 
          />
        </div>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <Plus size={15} /> Add Bank
        </button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
        <table>
          <thead>
            <tr>
              <th>Bank Name</th>
              <th style={{ width: '150px' }}>Status</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan="3" className="empty-state" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No Banks Found</td></tr>
            ) : filteredData.map(row => (
              <tr key={row.id}>
                <td style={{ fontWeight: 500 }}>{row.name}</td>
                <td>
                  <span style={{ 
                    padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                    background: row.status === 'Active' ? '#e0f2fe' : '#f1f5f9',
                    color: row.status === 'Active' ? '#0ea5e9' : '#64748b' 
                  }}>
                    {row.status}
                  </span>
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
      <AppModal isOpen={modal.open} title={modal.mode === 'add' ? 'Add Bank Name' : 'Edit Bank Name'}
        onClose={() => setModal({ open: false })} onConfirm={handleSave} confirmLabel={modal.mode === 'add' ? 'Add' : 'Update'} size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Bank Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              style={{ padding: '0.45rem 0.65rem', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '0.82rem' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={{ padding: '0.45rem 0.65rem', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '0.82rem' }}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
      </AppModal>

      {/* Delete Modal */}
      <AppModal isOpen={deleteModal.open} title="Confirm Delete"
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={handleDelete} confirmLabel="Delete" confirmColor="#ef4444" size="sm">
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Are you sure you want to delete this bank? This action cannot be undone.</p>
      </AppModal>
    </div>
  );
}
