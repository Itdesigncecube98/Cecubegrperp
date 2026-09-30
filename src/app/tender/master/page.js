'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, X } from 'lucide-react';

const TYPES = [
  { key: 'HOLDING_COMPANY', label: 'Holding Company' },
  { key: 'WORK_CATEGORY', label: 'Work Category' },
  { key: 'OVERHEAD_CATEGORY', label: 'Overhead Category' },
  { key: 'TENDER_STAGE', label: 'Tender Stage' }
];

export default function TenderMasterPage() {
  const [activeType, setActiveType] = useState(TYPES[0].key);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const loadItems = async (type) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tender/master?type=${type}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(activeType); }, [activeType]);

  const openNew = () => {
    setEditingItem(null);
    setForm({ name: '', code: '', description: '' });
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({ name: item.name, code: item.code || '', description: item.description || '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await fetch('/api/tender/master', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingItem.id, ...form })
        });
      } else {
        const res = await fetch('/api/tender/master', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: activeType, ...form })
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Failed to save');
          return;
        }
      }
      setForm({ name: '', code: '', description: '' });
      setEditingItem(null);
      loadItems(activeType);
    } catch (e) {
      console.error(e);
      alert('Error saving entry');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return;
    await fetch(`/api/tender/master?id=${id}`, { method: 'DELETE' });
    loadItems(activeType);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Tender Master Entry</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveType(t.key); openNew(); }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: activeType === t.key ? '#2563eb' : '#fff',
              color: activeType === t.key ? '#fff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Name *</label>
          <input
            required
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', minWidth: '200px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Code</label>
          <input
            value={form.code}
            onChange={e => setForm({ ...form, code: e.target.value })}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', width: '120px' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Description</label>
          <input
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }}
          />
        </div>
        <button type="submit" style={{ padding: '0.55rem 1.25rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> {editingItem ? 'Update' : 'Add'}
        </button>
        {editingItem && (
          <button type="button" onClick={openNew} style={{ padding: '0.55rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        )}
      </form>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8rem' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8rem' }}>Code</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8rem' }}>Description</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af' }}>No entries yet.</td></tr>
            )}
            {items.map(item => (
              <tr key={item.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{item.name}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{item.code || '-'}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{item.description || '-'}</td>
                <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button onClick={() => openEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
