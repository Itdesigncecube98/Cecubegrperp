'use client';
import React, { useState } from 'react';
import { Copy, Save, Plus, Pencil, Trash2 } from 'lucide-react';
import AppModal from '@/components/AppModal';
import ActionToolbar from '@/components/ActionToolbar';

const EMPTY_Q = { question: '', grade: '5', type: 'Objective', obj: 'N/A', weightage: '10' };

export default function QuestionSet() {
  const [rows, setRows] = useState([
    { id: 1, question: 'Recording Daily Financial Transactions including Invoices, Receipts, and Payments', grade: '5', type: 'Objective', obj: 'N/A', weightage: '10' },
    { id: 2, question: 'Ensuring Timely and Correct Accounting Entries in Tally/ERP', grade: '5', type: 'Objective', obj: 'N/A', weightage: '10' },
  ]);
  const [modal, setModal] = useState({ open: false, mode: 'add' });
  const [form, setForm] = useState(EMPTY_Q);
  const [delModal, setDelModal] = useState({ open: false, id: null });

  const openAdd = () => { setForm(EMPTY_Q); setModal({ open: true, mode: 'add' }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ open: true, mode: 'edit' }); };
  const openDel = (id) => setDelModal({ open: true, id });

  const handleSave = () => {
    if (!form.question) return;
    if (modal.mode === 'add') setRows(p => [...p, { ...form, id: Date.now() }]);
    else setRows(p => p.map(r => r.id === form.id ? form : r));
    setModal({ open: false });
  };
  const handleDelete = () => {
    setRows(p => p.filter(r => r.id !== delModal.id));
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

  const totalWeightage = rows.reduce((sum, r) => sum + Number(r.weightage || 0), 0);

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <div className="filter-group" style={{ flex: 2 }}>
          <label>Question Set</label>
          <select defaultValue="accounts"><option value="accounts">Accounts AM Question Set</option></select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2, gap: '0.5rem' }}>
          <button className="btn-primary"><Copy size={14} /> Copy</button>
        </div>
      </div>

      <ActionToolbar onReset={() => setRows([])} shareTitle="Appraisal Question Set" />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button className="btn-primary"><Save size={14} /> Save</button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px 10px 0 0' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 36, textAlign: 'center' }}>#</th>
              <th>Question</th>
              <th style={{ textAlign: 'center', width: 90 }}>Optimal Grade</th>
              <th style={{ width: 110 }}>Question Type</th>
              <th>Question Objective</th>
              <th style={{ textAlign: 'center', width: 80 }}>Weightage</th>
              <th style={{ textAlign: 'center', width: 80 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={{ textAlign: 'center', color: '#94a3b8' }}>↕</td>
                <td style={{ fontWeight: 500 }}>{row.question}</td>
                <td style={{ textAlign: 'center' }}>{row.grade}</td>
                <td>{row.type}</td>
                <td>{row.obj}</td>
                <td style={{ textAlign: 'center' }}>{row.weightage}</td>
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

      <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 10px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Weightage Total: <strong style={{ color: totalWeightage === 100 ? '#15803d' : '#b45309', fontSize: '0.95rem' }}>{totalWeightage}</strong></span>
        <button className="btn-primary" onClick={openAdd}><Plus size={14} /> New Question</button>
      </div>

      {/* Add/Edit Modal */}
      <AppModal isOpen={modal.open} title={modal.mode === 'add' ? 'Add Question' : 'Edit Question'}
        onClose={() => setModal({ open: false })} onConfirm={handleSave}
        confirmLabel={modal.mode === 'add' ? 'Add' : 'Update'} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <F label="Question *" field="question" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
            <F label="Optimal Grade" field="grade" options={['1','2','3','4','5']} />
            <F label="Question Type" field="type" options={['Objective','Subjective','Rating']} />
            <F label="Question Objective" field="obj" />
            <F label="Weightage (%)" field="weightage" type="number" />
          </div>
        </div>
      </AppModal>

      {/* Delete Modal */}
      <AppModal isOpen={delModal.open} title="Delete Question"
        onClose={() => setDelModal({ open: false })} onConfirm={handleDelete}
        confirmLabel="Delete" confirmColor="#ef4444" size="sm">
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Are you sure you want to delete this question? This cannot be undone.</p>
      </AppModal>
    </div>
  );
}
