'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UserCog, Save, X, ToggleLeft, ToggleRight, Printer } from 'lucide-react';
import Dialog from '@/components/Dialog';

export default function SalaryHeadsPage() {
  const [heads, setHeads] = useState([]);
  const [headTypes, setHeadTypes] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ description: '', calculationType: 'C : Calculate By Formula', remark: '', isActive: true });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null });
  const [infoDialog, setInfoDialog] = useState({ isOpen: false, title: '', message: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [headsRes, typesRes] = await Promise.all([
        fetch('/api/setup/salary-heads'),
        fetch('/api/setup/head-types')
      ]);
      const headsData = await headsRes.json();
      const typesData = await typesRes.json();

      if (Array.isArray(typesData) && typesData.length > 0) {
        const activeTypes = typesData.filter(t => t.isActive);
        setHeadTypes(activeTypes);
        if (!activeTab) setActiveTab(activeTypes[0]?.name || '');
      }
      if (Array.isArray(headsData)) {
        setHeads(headsData.map(h => ({ ...h, category: h.headType?.name || '' })));
      }
    } catch (e) {
      console.error('Failed to fetch data:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const resetForm = () => {
    setFormData({ description: '', calculationType: 'C : Calculate By Formula', remark: '', isActive: true });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (head) => {
    setFormData({ description: head.description, calculationType: head.calculationType, remark: head.remark || '', isActive: head.isActive });
    setEditingId(head.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      setInfoDialog({ isOpen: true, title: 'Validation Error', message: 'Description is required' });
      return;
    }
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const payload = { ...formData, category: activeTab, ...(editingId && { id: editingId }) };
      const res = await fetch('/api/setup/salary-heads', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        setInfoDialog({ isOpen: true, title: 'Error', message: err.error || 'Failed to save' });
      } else {
        await fetchAll();
        resetForm();
      }
    } catch (e) {
      setInfoDialog({ isOpen: true, title: 'Error', message: 'Something went wrong' });
    }
    setSaving(false);
  };

  const toggleStatus = async (id, current) => {
    try {
      await fetch('/api/setup/salary-heads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !current })
      });
      await fetchAll();
    } catch (e) { console.error(e); }
  };

  const confirmDelete = async () => {
    try {
      await fetch(`/api/setup/salary-heads?id=${deleteDialog.id}`, { method: 'DELETE' });
      await fetchAll();
    } catch (e) { console.error(e); }
    setDeleteDialog({ isOpen: false, id: null });
  };

  const filteredHeads = heads.filter(h => h.category === activeTab);

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '14px', color: '#1e293b', outline: 'none', background: '#fff', boxSizing: 'border-box' };
  const lbl = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#0ea5e9', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCog size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Salary Heads Master</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Manage all salary components</div>
          </div>
        </div>
        {!isFormOpen && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
              <Printer size={15} /> Print
            </button>
            <button onClick={() => { resetForm(); setIsFormOpen(true); }} disabled={!activeTab} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 20px', background: activeTab ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : '#e2e8f0', color: activeTab ? '#fff' : '#94a3b8', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: activeTab ? 'pointer' : 'not-allowed', boxShadow: activeTab ? '0 2px 8px rgba(14,165,233,0.3)' : 'none' }}>
              <Plus size={16} /> Add {activeTab} Head
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      {loading ? (
        <div style={{ padding: '16px 0', color: '#94a3b8', fontSize: '14px' }}>Loading head types...</div>
      ) : headTypes.length === 0 ? (
        <div style={{ padding: '20px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: '10px', color: '#92400e', marginBottom: '24px', fontSize: '14px' }}>
          ⚠️ No Head Types found. Please go to <strong>Head Types</strong> tab and add some (e.g. CTC, Earning, Deduction, Other).
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '0', overflowX: 'auto' }}>
          {headTypes.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.name); setIsFormOpen(false); }}
              style={{
                padding: '10px 22px',
                background: 'none',
                color: activeTab === tab.name ? '#0ea5e9' : '#64748b',
                border: 'none',
                borderBottom: activeTab === tab.name ? '3px solid #0ea5e9' : '3px solid transparent',
                fontWeight: activeTab === tab.name ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                marginBottom: '-2px'
              }}
            >
              {tab.name} Heads
            </button>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {isFormOpen && (
        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', marginBottom: '24px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ background: 'linear-gradient(135deg,#f1f5f9,#e8f4fd)', padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>{editingId ? `Edit ${activeTab} Head` : `Add ${activeTab} Head`}</span>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={lbl}>Description <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={inp} placeholder="e.g. Basic Salary" autoFocus />
              </div>
              <div>
                <label style={lbl}>Calculation Type</label>
                <select value={formData.calculationType} onChange={e => setFormData({ ...formData, calculationType: e.target.value })} style={inp}>
                  <option value="C : Calculate By Formula">C : Calculate By Formula</option>
                  <option value="F : Fixed Amount">F : Fixed Amount</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <button type="button" onClick={() => setFormData({ ...formData, isActive: !formData.isActive })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: formData.isActive ? '#0ea5e9' : '#94a3b8' }}>
                    {formData.isActive ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: formData.isActive ? '#0ea5e9' : '#94a3b8' }}>{formData.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <div>
                <label style={lbl}>Remark</label>
                <input type="text" value={formData.remark} onChange={e => setFormData({ ...formData, remark: e.target.value })} style={inp} placeholder="Optional note" />
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
              <th style={{ padding: '13px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</th>
              <th style={{ padding: '13px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Calculation Type</th>
              <th style={{ padding: '13px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
              <th style={{ padding: '13px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Remark</th>
              <th style={{ padding: '13px 18px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : filteredHeads.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No {activeTab} heads found. Click &quot;Add {activeTab} Head&quot; to add one.</td></tr>
            ) : filteredHeads.map((head, i) => (
              <tr key={head.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '13px 18px', fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{head.description}</td>
                <td style={{ padding: '13px 18px', fontSize: '13px', color: '#64748b' }}>{head.calculationType}</td>
                <td style={{ padding: '13px 18px' }}>
                  <button onClick={() => toggleStatus(head.id, head.isActive)} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: head.isActive ? '#dcfce7' : '#f1f5f9', color: head.isActive ? '#16a34a' : '#64748b' }}>
                    {head.isActive ? '● Active' : '○ Inactive'}
                  </button>
                </td>
                <td style={{ padding: '13px 18px', fontSize: '13px', color: '#94a3b8' }}>{head.remark || '—'}</td>
                <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleEdit(head)} style={{ padding: '6px 10px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Edit2 size={15} /></button>
                    <button onClick={() => setDeleteDialog({ isOpen: true, id: head.id })} style={{ padding: '6px 10px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog isOpen={deleteDialog.isOpen} type="confirm" title="Delete Salary Head" message="Are you sure you want to delete this salary head? This action cannot be undone." onConfirm={confirmDelete} onCancel={() => setDeleteDialog({ isOpen: false, id: null })} />
      <Dialog isOpen={infoDialog.isOpen} type="info" title={infoDialog.title} message={infoDialog.message} onConfirm={() => setInfoDialog({ isOpen: false, title: '', message: '' })} onCancel={() => setInfoDialog({ isOpen: false, title: '', message: '' })} />
    </div>
  );
}
