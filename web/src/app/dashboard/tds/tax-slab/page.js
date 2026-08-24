'use client';
import React, { useState } from 'react';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import AppModal from '@/components/AppModal';
import ActionToolbar from '@/components/ActionToolbar';

const EMPTY = { lower: '', upper: '', rate: '' };

export default function TaxSlab() {
  const [categories, setCategories] = useState([
    { id: 1, name: 'Male' },
    { id: 2, name: 'Female' },
    { id: 3, name: 'Senior Citizen' },
    { id: 4, name: 'Optional Scheme' },
    { id: 5, name: 'Super Senior Citizen' },
  ]);

  React.useEffect(() => {
    const saved = localStorage.getItem('tdsCategories');
    if (saved) {
      setCategories(JSON.parse(saved));
    }
  }, []);

  const [slabs, setSlabs] = useState([
    { id: 1, lower: '0', upper: '250000', rate: '0' },
    { id: 2, lower: '250001', upper: '500000', rate: '5' },
  ]);
  const [modal, setModal] = useState({ open: false, mode: 'add' });
  const [form, setForm] = useState(EMPTY);
  const [delModal, setDelModal] = useState({ open: false, id: null });

  const openAdd = () => { setForm(EMPTY); setModal({ open: true, mode: 'add' }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ open: true, mode: 'edit' }); };
  const openDel = (id) => setDelModal({ open: true, id });

  const handleSave = () => {
    if (!form.lower) return;
    if (modal.mode === 'add') setSlabs(p => [...p, { ...form, id: Date.now() }]);
    else setSlabs(p => p.map(r => r.id === form.id ? form : r));
    setModal({ open: false });
  };
  const handleDelete = () => {
    setSlabs(p => p.filter(r => r.id !== delModal.id));
    setDelModal({ open: false, id: null });
  };

  const F = ({ label, field }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{label}</label>
      <input type="number" value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        style={{ padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }} />
    </div>
  );

  return (
    <div>
      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Financial Year <span style={{ color: 'red' }}>*</span></label>
          <select defaultValue="2026-2027">
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Category <span style={{ color: 'red' }}>*</span></label>
          <select defaultValue="Male">
            <option value="">-- Select --</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-actions">
          <button className="btn-primary"><Search size={14} /> Search</button>
        </div>
      </div>

      <ActionToolbar onReset={() => {}} shareTitle="TDS Tax Slab" />

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0' }}>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Result</span>
        <button className="btn-primary" onClick={openAdd}><Plus size={14} /> New Slab</button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 10 }}>
        <table>
          <thead>
            <tr>
              <th>Tax Slab Lower</th>
              <th>Tax Slab Upper</th>
              <th>Tax Rate (%)</th>
              <th style={{ width: 90, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {slabs.map(s => (
              <tr key={s.id}>
                <td>{s.lower}</td>
                <td>{s.upper}</td>
                <td>{s.rate}%</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    <button className="icon-btn edit-btn" onClick={() => openEdit(s)}><Pencil size={14} /></button>
                    <button className="icon-btn delete-btn" onClick={() => openDel(s.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AppModal isOpen={modal.open} title={modal.mode === 'add' ? 'Add Tax Slab' : 'Edit Tax Slab'}
        onClose={() => setModal({ open: false })} onConfirm={handleSave}
        confirmLabel={modal.mode === 'add' ? 'Add' : 'Update'} size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <F label="Tax Slab Lower (₹) *" field="lower" />
          <F label="Tax Slab Upper (₹)" field="upper" />
          <F label="Tax Rate (%)" field="rate" />
        </div>
      </AppModal>

      {/* Delete Modal */}
      <AppModal isOpen={delModal.open} title="Delete Tax Slab"
        onClose={() => setDelModal({ open: false })} onConfirm={handleDelete}
        confirmLabel="Delete" confirmColor="#ef4444" size="sm">
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Delete this tax slab entry? This cannot be undone.</p>
      </AppModal>
    </div>
  );
}
