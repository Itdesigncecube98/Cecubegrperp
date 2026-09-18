'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import AppModal from '@/components/AppModal';
import ActionToolbar from '@/components/ActionToolbar';
import Dialog from '@/components/Dialog';

const EMPTY = { name: '', status: 'Active' };

export default function IssuingAuthorityPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'add', row: null });
  const [form, setForm] = useState(EMPTY);
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAuthorities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/synchronisation2/issuing-authority');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthorities();
  }, []);

  const openAdd = () => { setForm(EMPTY); setModal({ open: true, mode: 'add', row: null }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ open: true, mode: 'edit', row }); };
  const openDelete = (id) => setDeleteModal({ open: true, id });

  const handleSave = async () => {
    if (!form.name.trim()) return;
    
    try {
      if (modal.mode === 'add') {
        const response = await fetch('/api/synchronisation2/issuing-authority', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        if (response.ok) {
          fetchAuthorities();
        }
      } else {
        const response = await fetch(`/api/synchronisation2/issuing-authority/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        if (response.ok) {
          fetchAuthorities();
        }
      }
      setModal({ open: false, mode: 'add', row: null });
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/synchronisation2/issuing-authority/${deleteModal.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchAuthorities();
      }
      setDeleteModal({ open: false, id: null });
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const filteredData = data.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div>
      <ActionToolbar onReset={() => setSearchTerm('')} shareTitle="Issuing Authority Configuration" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#fff', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
          <Search size={16} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search authorities..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '0.85rem', width: '200px' }} 
          />
        </div>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', background: '#0ea5e9', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
          <Plus size={15} /> Add Authority
        </button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0ea5e9', color: '#fff' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Institute/University</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, width: '150px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, width: '100px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading...</td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No Records Found</td></tr>
            ) : filteredData.map((row, index) => (
              <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6', background: index % 2 === 0 ? '#f8fafc' : '#fff' }}>
                <td style={{ padding: '8px 16px', fontSize: '13px', color: '#4b5563', fontWeight: 500 }}>{row.name}</td>
                <td style={{ padding: '8px 16px' }}>
                  <span style={{ 
                    padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
                    background: row.status === 'Active' ? '#e0f2fe' : '#f1f5f9',
                    color: row.status === 'Active' ? '#0ea5e9' : '#64748b' 
                  }}>
                    {row.status}
                  </span>
                </td>
                <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button title="Edit" onClick={() => openEdit(row)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#0284c7' }}><Pencil size={14} /></button>
                    <button title="Delete" onClick={() => openDelete(row.id)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      <AppModal isOpen={modal.open} title={modal.mode === 'add' ? 'Add Issuing Authority' : 'Edit Issuing Authority'}
        onClose={() => setModal({ open: false, row: null })} onConfirm={handleSave} confirmLabel={modal.mode === 'add' ? 'Save' : 'Update'} size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Institute/University *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none' }} autoFocus />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none' }}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </AppModal>

      {/* Delete Modal */}
      <AppModal isOpen={deleteModal.open} title="Confirm Delete"
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={handleDelete} confirmLabel="Delete" confirmColor="#ef4444" size="sm">
        <p style={{ color: '#64748b', fontSize: '14px' }}>Are you sure you want to delete this issuing authority? This action cannot be undone.</p>
      </AppModal>
    </div>
  );
}
