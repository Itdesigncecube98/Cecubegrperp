'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import AppModal from '@/components/AppModal';
import ActionToolbar from '@/components/ActionToolbar';

const EMPTY = { name: '', status: 'Active' };

export default function BankNames() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'add', row: null });
  const [form, setForm] = useState(EMPTY);
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBanks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/synchronisation2/bank-names');
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
    fetchBanks();
  }, []);

  const openAdd = () => { setForm(EMPTY); setModal({ open: true, mode: 'add', row: null }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ open: true, mode: 'edit', row }); };
  const openDelete = (id) => setDeleteModal({ open: true, id });

  const handleSave = async () => {
    if (!form.name.trim()) return;
    
    try {
      if (modal.mode === 'add') {
        const response = await fetch('/api/synchronisation2/bank-names', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        if (response.ok) {
          fetchBanks();
        } else {
          const err = await response.json();
          alert(err.error || 'Failed to add bank name');
        }
      } else {
        const response = await fetch(`/api/synchronisation2/bank-names/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        if (response.ok) {
          fetchBanks();
        } else {
          const err = await response.json();
          alert(err.error || 'Failed to update bank name');
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
    
    setModal({ open: false, mode: 'add', row: null });
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/synchronisation2/bank-names/${deleteModal.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchBanks();
      } else {
        console.error('Failed to delete bank name');
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
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
            {loading ? (
              <tr><td colSpan="3" className="empty-state" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading banks...</td></tr>
            ) : filteredData.length === 0 ? (
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
