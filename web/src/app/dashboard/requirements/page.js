'use client';
import React, { useState } from 'react';
import { Plus, Search, FileDown, Pencil, Trash2 } from 'lucide-react';
import './requirements.css';
import AppModal from '@/components/AppModal';
import ActionToolbar from '@/components/ActionToolbar';

const EMPTY = { positionName: '', department: '', raiseBy: '', raiseDate: '', empType: 'Permanent', indentType: 'New', reqFrom: '', approvedBy: '', handledBy: '', status: 'Pending' };

export default function Requirements() {
  const [data, setData] = useState([
    { id: 1, positionName: 'Civil Engineer', department: 'Operations / Projects', raiseBy: 'Anup Singh', raiseDate: '2026-07-01', empType: 'Permanent', indentType: 'New', reqFrom: '2026-07-15', approvedBy: 'Director', handledBy: 'HR', status: 'Approved' },
    { id: 2, positionName: 'Design Engineer', department: 'General Administration', raiseBy: 'Aayushee Varshney', raiseDate: '2026-07-10', empType: 'Contract', indentType: 'Replacement', reqFrom: '2026-08-01', approvedBy: 'Manager', handledBy: 'HR', status: 'Pending' },
  ]);
  const [modal, setModal] = useState({ open: false, mode: 'add', row: null });
  const [form, setForm] = useState(EMPTY);
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

  const openAdd = () => { setForm(EMPTY); setModal({ open: true, mode: 'add', row: null }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ open: true, mode: 'edit', row }); };
  const openDelete = (id) => setDeleteModal({ open: true, id });

  const handleSave = () => {
    if (!form.positionName) return;
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

  const Field = ({ label, field, type = 'text', options }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{label}</label>
      {options ? (
        <select value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={{ padding: '0.45rem 0.65rem', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '0.82rem' }}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
          style={{ padding: '0.45rem 0.65rem', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '0.82rem' }} />
      )}
    </div>
  );

  return (
    <div className="req-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Position Indent</h1>
          <p className="page-subtitle">Manage manpower requirements and position indents.</p>
        </div>
        <button className="btn-primary" onClick={openAdd} style={{ gap: '0.4rem' }}>
          <Plus size={15} /> Add New
        </button>
      </div>

      <div className="req-content">
        <ActionToolbar onReset={() => {}} shareTitle="Position Indent" />
        <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--req-glass-border)', paddingBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem' }}>Filter Criteria</h3>
          <div className="filter-bar" style={{ marginBottom: '0.75rem' }}>
            <div className="filter-group"><label>Company <span style={{ color: 'red' }}>*</span></label><select><option>10 all selected!</option></select></div>
            <div className="filter-group"><label>Branch <span style={{ color: 'red' }}>*</span></label><select><option>5 all selected!</option></select></div>
            <div className="filter-group"><label>Position</label><select><option>Select</option></select></div>
            <div className="filter-group"><label>Raise By</label><select><option>Select</option></select></div>
          </div>
          <div className="filter-bar" style={{ marginBottom: '0.75rem' }}>
            <div className="filter-group"><label>Raise From</label><input type="date" defaultValue="2026-07-20" /></div>
            <div className="filter-group"><label>Raise To</label><input type="date" defaultValue="2026-08-20" /></div>
            <div className="filter-group"><label>Status</label><select><option>All</option></select></div>
            <div className="filter-group"><label>Type</label><select><option>All</option></select></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" style={{ gap: '0.4rem' }}><Search size={14} /> Search</button>
          </div>
        </div>

        <div className="action-bar">
          <button className="btn-outline" style={{ gap: '0.4rem', borderColor: 'var(--req-primary)', color: 'var(--req-primary)' }}>
            <FileDown size={14} /> Export To Excel
          </button>
          <div className="pagination-controls">
            <span>Show Rows:</span>
            <select defaultValue="40"><option>40</option><option>100</option></select>
            <span>Page: 1 of 1</span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {['Go', '<<', '<', '>', '>>'].map(b => <button key={b} className="btn-outline">{b}</button>)}
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid var(--req-glass-border)', borderRadius: '10px', marginTop: '0.75rem' }}>
          <table>
            <thead>
              <tr>
                <th>Position Name</th><th>Department</th><th>Raise By</th><th>Raise Date</th>
                <th>Emp Type</th><th>Indent Type</th><th>Req. From</th>
                <th>Approved By</th><th>Handled By</th><th>Status</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan="11" className="empty-state">No Details Found</td></tr>
              ) : data.map(row => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 500 }}>{row.positionName}</td>
                  <td>{row.department}</td><td>{row.raiseBy}</td><td>{row.raiseDate}</td>
                  <td>{row.empType}</td><td>{row.indentType}</td><td>{row.reqFrom}</td>
                  <td>{row.approvedBy}</td><td>{row.handledBy}</td>
                  <td><span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                    background: row.status === 'Approved' ? '#dcfce7' : '#fef3c7',
                    color: row.status === 'Approved' ? '#15803d' : '#b45309' }}>{row.status}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="icon-btn edit-btn" title="Edit" onClick={() => openEdit(row)}><Pencil size={15} /></button>
                    <button className="icon-btn delete-btn" title="Delete" onClick={() => openDelete(row.id)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AppModal isOpen={modal.open} title={modal.mode === 'add' ? 'Add Position Indent' : 'Edit Position Indent'}
        onClose={() => setModal({ open: false })} onConfirm={handleSave} confirmLabel={modal.mode === 'add' ? 'Add' : 'Update'} size="lg">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Position Name *" field="positionName" />
          <Field label="Department" field="department" />
          <Field label="Raise By" field="raiseBy" />
          <Field label="Raise Date" field="raiseDate" type="date" />
          <Field label="Emp Type" field="empType" options={['Permanent', 'Contract', 'Trainee']} />
          <Field label="Indent Type" field="indentType" options={['New', 'Replacement']} />
          <Field label="Required From" field="reqFrom" type="date" />
          <Field label="Approved By" field="approvedBy" />
          <Field label="Handled By" field="handledBy" />
          <Field label="Status" field="status" options={['Pending', 'Approved', 'Rejected']} />
        </div>
      </AppModal>

      {/* Delete Modal */}
      <AppModal isOpen={deleteModal.open} title="Confirm Delete"
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={handleDelete} confirmLabel="Delete" confirmColor="#ef4444" size="sm">
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Are you sure you want to delete this record? This action cannot be undone.</p>
      </AppModal>
    </div>
  );
}
