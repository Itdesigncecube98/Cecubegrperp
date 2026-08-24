'use client';
import React, { useState } from 'react';
import { PlusCircle, FileDown, Pencil, Trash2 } from 'lucide-react';
import AppModal from '@/components/AppModal';
import ActionToolbar from '@/components/ActionToolbar';

const EMPTY = { cycle: '', period: '', freq: 'Monthly', count: '', status: 'Open' };

export default function PayCycle() {
  const [fromDate, setFromDate] = useState('2025-08-01');
  const [toDate, setToDate] = useState('2026-08-31');
  const [status, setStatus] = useState('All');
  const [data, setData] = useState([
    { id: 1, cycle: 'July 2026', status: 'Open', period: '01 Jul 2026 - 31 Jul 2026', freq: 'Monthly', count: 80 },
    { id: 2, cycle: 'June 2026', status: 'Open', period: '01 Jun 2026 - 30 Jun 2026', freq: 'Monthly', count: 79 },
  ]);
  const [modal, setModal] = useState({ open: false, mode: 'add' });
  const [form, setForm] = useState(EMPTY);
  const [delModal, setDelModal] = useState({ open: false, id: null });

  const openAdd = () => { setForm(EMPTY); setModal({ open: true, mode: 'add' }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ open: true, mode: 'edit' }); };
  const openDel = (id) => setDelModal({ open: true, id });

  const handleSave = () => {
    if (!form.cycle) return;
    if (modal.mode === 'add') setData(p => [...p, { ...form, id: Date.now(), count: Number(form.count) }]);
    else setData(p => p.map(r => r.id === form.id ? { ...form, count: Number(form.count) } : r));
    setModal({ open: false });
  };
  const handleDelete = () => {
    setData(p => p.filter(r => r.id !== delModal.id));
    setDelModal({ open: false, id: null });
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
      {/* Filters */}
      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem' }}>Filter Criteria</h3>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div className="filter-group">
            <label>From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option>All</option><option>Open</option><option>Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <ActionToolbar onReset={() => { setFromDate('2025-08-01'); setToDate('2026-08-31'); setStatus('All'); }} shareTitle="Pay Cycle" />

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>Pay Cycle</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-outline" style={{ borderColor: '#0284c7', color: '#0284c7' }}>
            <FileDown size={14} /> Export To Excel
          </button>
          <button className="btn-primary" onClick={openAdd}>
            <PlusCircle size={14} /> New Pay Cycle
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 10 }}>
        <table>
          <thead>
            <tr>
              <th>Pay Cycle</th>
              <th>Period</th>
              <th>Frequency</th>
              <th style={{ textAlign: 'center' }}>Total Employees</th>
              <th style={{ textAlign: 'center', width: 90 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id}>
                <td style={{ fontWeight: 600, color: '#0284c7' }}>{row.cycle} ({row.status})</td>
                <td>{row.period}</td>
                <td>{row.freq}</td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.count}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    <button className="icon-btn edit-btn" title="Edit" onClick={() => openEdit(row)}><Pencil size={14} /></button>
                    <button className="icon-btn delete-btn" title="Delete" onClick={() => openDel(row.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AppModal isOpen={modal.open} title={modal.mode === 'add' ? 'Add Pay Cycle' : 'Edit Pay Cycle'}
        onClose={() => setModal({ open: false })} onConfirm={handleSave}
        confirmLabel={modal.mode === 'add' ? 'Add' : 'Update'} size="md">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <F label="Pay Cycle Name *" field="cycle" />
          <F label="Period (e.g. 01 Jul 2026 - 31 Jul 2026)" field="period" />
          <F label="Frequency" field="freq" options={['Monthly', 'Weekly', 'Bi-Weekly']} />
          <F label="Total Employees" field="count" type="number" />
          <F label="Status" field="status" options={['Open', 'Closed']} />
        </div>
      </AppModal>

      {/* Delete Modal */}
      <AppModal isOpen={delModal.open} title="Delete Pay Cycle"
        onClose={() => setDelModal({ open: false })} onConfirm={handleDelete}
        confirmLabel="Delete" confirmColor="#ef4444" size="sm">
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Are you sure you want to delete this pay cycle? This action cannot be undone.</p>
      </AppModal>
    </div>
  );
}
