'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, RefreshCw } from 'lucide-react';

export default function LeavingReasonsPage() {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', isActive: true });

  const fetchReasons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/setup/leaving-reasons');
      if (res.ok) {
        const data = await res.json();
        setReasons(data);
      }
    } catch (error) {
      console.error('Failed to fetch leaving reasons:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReasons();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert('Name is required');

    try {
      const url = editingId ? `/api/setup/leaving-reasons/${editingId}` : '/api/setup/leaving-reasons';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        fetchReasons();
        handleCloseModal();
      } else {
        const data = await res.json();
        alert(data.error || 'Operation failed');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this reason?')) return;
    try {
      const res = await fetch(`/api/setup/leaving-reasons/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchReasons();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleEdit = (reason) => {
    setFormData({ name: reason.name, description: reason.description || '', isActive: reason.isActive });
    setEditingId(reason.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setFormData({ name: '', description: '', isActive: true });
    setEditingId(null);
    setIsModalOpen(false);
  };

  return (
    <div style={{ minHeight: '60vh', padding: 'clamp(16px, 3vw, 32px)', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 22 }}>
          <div>
            <div style={{ color: '#db2777', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Employee Setup</div>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 750 }}>Leaving Reasons</h1>
            <p style={{ margin: '7px 0 0', color: '#64748b', fontSize: 14 }}>Maintain the reasons used when recording an employee exit.</p>
          </div>
          <button type="button" onClick={() => setIsModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 42, padding: '0 16px', border: 0, borderRadius: 9, background: '#db2777', color: '#fff', fontWeight: 650, cursor: 'pointer', boxShadow: '0 4px 10px rgba(219,39,119,.18)' }}>
            <Plus size={17} /> Add reason
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[{ label: 'All reasons', value: reasons.length, color: '#7c3aed' }, { label: 'Active', value: reasons.filter(reason => reason.isActive).length, color: '#059669' }, { label: 'Inactive', value: reasons.filter(reason => !reason.isActive).length, color: '#64748b' }].map(item => (
            <div key={item.label} style={{ minWidth: 150, padding: '13px 16px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', flex: '1 1 150px' }}>
              <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>{item.label}</div>
              <div style={{ marginTop: 3, color: item.color, fontSize: 22, fontWeight: 750 }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 3px 12px rgba(15,23,42,.04)' }}>
          <div style={{ padding: '15px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ color: '#0f172a', fontSize: 14, fontWeight: 700 }}>Termination and resignation reasons</div>
            <span style={{ color: '#64748b', fontSize: 12 }}>{reasons.length} total</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 650, borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead><tr style={{ background: '#f8fafc', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Reason</th><th style={{ padding: '12px 18px', fontWeight: 700 }}>Description</th><th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'center' }}>Status</th><th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ padding: 42, textAlign: 'center', color: '#64748b' }}><RefreshCw className="spin" size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />Loading reasons…</td></tr>
                ) : reasons.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: 46, textAlign: 'center' }}><div style={{ color: '#334155', fontWeight: 650 }}>No reasons added yet</div><div style={{ marginTop: 5, color: '#64748b', fontSize: 13 }}>Add a reason to make it available in employee exit records.</div></td></tr>
                ) : reasons.map((reason, index) => (
                  <tr key={reason.id} style={{ borderTop: '1px solid #f1f5f9', background: index % 2 ? '#fff' : '#fcfdff' }}>
                    <td style={{ padding: '15px 18px', color: '#0f172a', fontWeight: 650 }}>{reason.name}</td>
                    <td style={{ padding: '15px 18px', color: '#64748b', fontSize: 13 }}>{reason.description || '—'}</td>
                    <td style={{ padding: '15px 18px', textAlign: 'center' }}><span style={{ display: 'inline-flex', padding: '4px 9px', borderRadius: 20, background: reason.isActive ? '#dcfce7' : '#f1f5f9', color: reason.isActive ? '#15803d' : '#64748b', fontSize: 11, fontWeight: 700 }}>{reason.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ padding: '15px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" onClick={() => handleEdit(reason)} aria-label={`Edit ${reason.name}`} title="Edit reason" style={{ width: 34, height: 34, border: '1px solid #dbeafe', borderRadius: 8, background: '#eff6ff', color: '#2563eb', cursor: 'pointer', marginRight: 6 }}><Edit2 size={15} /></button>
                      <button type="button" onClick={() => handleDelete(reason.id)} aria-label={`Delete ${reason.name}`} title="Delete reason" style={{ width: 34, height: 34, border: '1px solid #fee2e2', borderRadius: 8, background: '#fff1f2', color: '#e11d48', cursor: 'pointer' }}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) handleCloseModal(); }} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,.52)', backdropFilter: 'blur(3px)' }}>
          <div role="dialog" aria-modal="true" aria-labelledby="leaving-reason-title" style={{ width: '100%', maxWidth: 480, borderRadius: 14, background: '#fff', boxShadow: '0 24px 70px rgba(15,23,42,.25)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #e2e8f0' }}>
              <div><h2 id="leaving-reason-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{editingId ? 'Edit leaving reason' : 'Add leaving reason'}</h2><p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>This label appears in employee exit records.</p></div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 22 }}>
              <div style={{ marginBottom: 16 }}>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason name *</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Resigned, Performance Issue"
                  required 
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Optional details..."
                  rows={3}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 22, padding: '11px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <input 
                  type="checkbox" 
                  id="isActive" 
                  checked={formData.isActive} 
                  onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active</label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={handleCloseModal} style={{ minHeight: 40, padding: '0 14px', border: '1px solid #cbd5e1', borderRadius: 8, color: '#475569', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ minHeight: 40, padding: '0 16px', border: 0, borderRadius: 8, color: '#fff', background: '#db2777', fontWeight: 650, cursor: 'pointer' }}>{editingId ? 'Update reason' : 'Add reason'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
