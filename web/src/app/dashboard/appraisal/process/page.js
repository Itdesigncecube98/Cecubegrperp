'use client';
import React, { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import AppModal from '@/components/AppModal';
import ActionToolbar from '@/components/ActionToolbar';

const EMPTY = { name: '', start: '', end: '', sub: '', weightQ: '100', weightS: '100', status: 'Active' };

export default function AppraisalProcess() {
  const [data, setData] = useState([
    { id: 1, name: 'Employee Appraisal 2025-2026', start: '01/04/2025', end: '31/03/2026', sub: '31/05/2025', weightQ: '100', weightS: '100', status: 'Active' },
    { id: 2, name: 'Employee Appraisal 2024-25', start: '01/04/2024', end: '31/03/2025', sub: '16/10/2025', weightQ: '100', weightS: '100', status: 'Active' },
  ]);
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState({ open: false, mode: 'add' });
  const [form, setForm] = useState(EMPTY);
  const [delModal, setDelModal] = useState({ open: false, id: null, bulk: false });

  const toggleSelect = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(selected.length === data.length ? [] : data.map(r => r.id));

  const openAdd = () => { setForm(EMPTY); setModal({ open: true, mode: 'add' }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ open: true, mode: 'edit' }); };
  const openDel = (id) => setDelModal({ open: true, id, bulk: false });
  const openBulkDel = () => { if (selected.length) setDelModal({ open: true, id: null, bulk: true }); };

  const handleSave = () => {
    if (!form.name) return;
    if (modal.mode === 'add') setData(p => [...p, { ...form, id: Date.now() }]);
    else setData(p => p.map(r => r.id === form.id ? form : r));
    setModal({ open: false });
  };
  const handleDelete = () => {
    if (delModal.bulk) setData(p => p.filter(r => !selected.includes(r.id))), setSelected([]);
    else setData(p => p.filter(r => r.id !== delModal.id));
    setDelModal({ open: false, id: null, bulk: false });
  };

  const F = ({ label, field, type = 'text', options }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{label}</label>
      {options
        ? <select value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={{ padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }}>
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        : <input type={type} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
            style={{ padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }} />
      }
    </div>
  );

  return (
    <div>
      <ActionToolbar onReset={() => { setData([]); setSelected([]); }} shareTitle="Appraisal Process" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{selected.length > 0 && `${selected.length} selected`}</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {selected.length > 0 && (
            <button className="btn-primary" style={{ background: '#ef4444' }} onClick={openBulkDel}>
              <Trash2 size={14} /> Delete Selected
            </button>
          )}
          <button className="btn-primary" onClick={openAdd}><Plus size={14} /> Add Process</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 10 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 36, textAlign: 'center' }}><input type="checkbox" checked={selected.length === data.length && data.length > 0} onChange={toggleAll} /></th>
              <th>Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Submission Date</th>
              <th style={{ textAlign: 'right' }}>Wt. (Question)</th>
              <th style={{ textAlign: 'right' }}>Wt. (Skill)</th>
              <th>Status</th>
              <th style={{ textAlign: 'center', width: 80 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id} style={{ background: selected.includes(row.id) ? '#eff6ff' : undefined }}>
                <td style={{ textAlign: 'center' }}><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelect(row.id)} /></td>
                <td style={{ fontWeight: 600 }}>{row.name}</td>
                <td>{row.start}</td><td>{row.end}</td><td>{row.sub}</td>
                <td style={{ textAlign: 'right' }}>{row.weightQ}</td>
                <td style={{ textAlign: 'right' }}>{row.weightS}</td>
                <td><span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, background: '#dcfce7', color: '#15803d' }}>{row.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    <button className="icon-btn edit-btn" onClick={() => openEdit(row)}><Pencil size={14} /></button>
                    <button className="icon-btn delete-btn" onClick={() => openDel(row.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AppModal isOpen={modal.open} title={modal.mode === 'add' ? 'Add Appraisal Process' : 'Edit Appraisal Process'}
        onClose={() => setModal({ open: false })} onConfirm={handleSave}
        confirmLabel={modal.mode === 'add' ? 'Add' : 'Update'} size="lg">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ gridColumn: '1 / -1' }}><F label="Process Name *" field="name" /></div>
          <F label="Start Date" field="start" type="date" />
          <F label="End Date" field="end" type="date" />
          <F label="Submission Date" field="sub" type="date" />
          <F label="Status" field="status" options={['Active', 'Inactive', 'Completed']} />
          <F label="Weightage (Question %)" field="weightQ" type="number" />
          <F label="Weightage (Skill %)" field="weightS" type="number" />
        </div>
      </AppModal>

      <AppModal isOpen={delModal.open} title={delModal.bulk ? 'Delete Selected' : 'Delete Process'}
        onClose={() => setDelModal({ open: false })} onConfirm={handleDelete}
        confirmLabel="Delete" confirmColor="#ef4444" size="sm">
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          {delModal.bulk ? `Delete ${selected.length} selected processes?` : 'Delete this appraisal process?'} This cannot be undone.
        </p>
      </AppModal>
    </div>
  );
}
