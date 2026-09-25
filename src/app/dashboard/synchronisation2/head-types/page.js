'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, Save, X, ToggleLeft, ToggleRight, Printer } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function HeadTypesPage() {
  const [headTypes, setHeadTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', isActive: true });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null });
  const [infoDialog, setInfoDialog] = useState({ isOpen: false, title: '', message: '' });

  const fetchHeadTypes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/setup/head-types');
      const data = await res.json();
      setHeadTypes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch head types:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHeadTypes();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', description: '', isActive: true });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (ht) => {
    setFormData({ name: ht.name, description: ht.description || '', isActive: ht.isActive });
    setEditingId(ht.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setInfoDialog({ isOpen: true, title: 'Validation Error', message: 'Head Type Name is required' });
      return;
    }
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const payload = { ...formData, ...(editingId && { id: editingId }) };
      const res = await fetch('/api/setup/head-types', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        setInfoDialog({ isOpen: true, title: 'Error', message: err.error || 'Failed to save' });
      } else {
        await fetchHeadTypes();
        resetForm();
      }
    } catch (e) {
      setInfoDialog({ isOpen: true, title: 'Error', message: 'Something went wrong' });
    }
    setSaving(false);
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      await fetch('/api/setup/head-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus })
      });
      await fetchHeadTypes();
    } catch (e) { console.error(e); }
  };

  const confirmDelete = async () => {
    try {
      await fetch(`/api/setup/head-types?id=${deleteDialog.id}`, { method: 'DELETE' });
      await fetchHeadTypes();
    } catch (e) { console.error(e); }
    setDeleteDialog({ isOpen: false, id: null });
  };

  const inp = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #e2e8f0', borderRadius: '7px',
    fontSize: '14px', color: '#1e293b', outline: 'none', background: '#fff',
    boxSizing: 'border-box'
  };
  const lbl = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#0ea5e9', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' };

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tag size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Head Types Master</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Define salary head categories</div>
          </div>
        </div>
        {!isFormOpen && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
              <Printer size={15} /> Print
            </button>
            <button onClick={handleAdd} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 20px', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }}>
              <Plus size={16} /> Add Head Type
            </button>
          </div>
        )}
      </div>

      {/* Form */}
      {isFormOpen && (
        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', marginBottom: '24px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ background: 'linear-gradient(135deg,#f1f5f9,#e8f4fd)', padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>{editingId ? 'Edit Head Type' : 'Add New Head Type'}</span>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={lbl}>Head Type Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={inp} placeholder="e.g. CTC, Earning, Deduction" autoFocus />
              </div>
              <div>
                <label style={lbl}>Description</label>
                <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={inp} placeholder="Brief description of this head type" />
              </div>
              <div>
                <label style={lbl}>Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <button type="button" onClick={() => setFormData({ ...formData, isActive: !formData.isActive })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: formData.isActive ? '#0ea5e9' : '#94a3b8' }}>
                    {formData.isActive ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: formData.isActive ? '#0ea5e9' : '#94a3b8' }}>{formData.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button type="button" onClick={resetForm} style={{ padding: '9px 20px', border: '1.5px solid #e2e8f0', background: '#fff', borderRadius: '8px', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 24px', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                <Save size={15} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', borderBottom: '1.5px solid #e2e8f0' }}>
              <th style={{ padding: '13px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Head Type Name</th>
              <th style={{ padding: '13px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</th>
              <th style={{ padding: '13px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
              <th style={{ padding: '13px 18px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : headTypes.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No Head Types found. Click &quot;Add Head Type&quot; to get started.</td></tr>
            ) : headTypes.map((ht, i) => (
              <tr key={ht.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '13px 18px' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{ht.name}</span>
                </td>
                <td style={{ padding: '13px 18px', fontSize: '13px', color: '#64748b' }}>{ht.description || '—'}</td>
                <td style={{ padding: '13px 18px' }}>
                  <button onClick={() => toggleStatus(ht.id, ht.isActive)} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: ht.isActive ? '#dcfce7' : '#f1f5f9', color: ht.isActive ? '#16a34a' : '#64748b' }}>
                    {ht.isActive ? '● Active' : '○ Inactive'}
                  </button>
                </td>
                <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleEdit(ht)} title="Edit" style={{ padding: '6px 10px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Edit2 size={15} /></button>
                    <button onClick={() => setDeleteDialog({ isOpen: true, id: ht.id })} title="Delete" style={{ padding: '6px 10px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog isOpen={deleteDialog.isOpen} type="confirm" title="Delete Head Type" message="Are you sure? This may affect Salary Heads using this type." onConfirm={confirmDelete} onCancel={() => setDeleteDialog({ isOpen: false, id: null })} />
      <Dialog isOpen={infoDialog.isOpen} type="info" title={infoDialog.title} message={infoDialog.message} onConfirm={() => setInfoDialog({ isOpen: false, title: '', message: '' })} onCancel={() => setInfoDialog({ isOpen: false, title: '', message: '' })} />
    </div>
  );
}
