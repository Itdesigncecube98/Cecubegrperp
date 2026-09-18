'use client';
import React, { useState, useEffect } from 'react';
import { Copy, Save, Plus, Pencil, Trash2, PlusCircle } from 'lucide-react';
import AppModal from '@/components/AppModal';
import ActionToolbar from '@/components/ActionToolbar';

const EMPTY_Q = { question: '', grade: '5', type: 'Objective', obj: 'N/A', weightage: '10' };

const F = ({ label, field, type = 'text', options, form, setForm }) => (
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
export default function QuestionSet() {
  const [questionSets, setQuestionSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [rows, setRows] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState({ open: false, mode: 'add' });
  const [form, setForm] = useState(EMPTY_Q);
  const [delModal, setDelModal] = useState({ open: false, id: null });
  const [newSetModal, setNewSetModal] = useState({ open: false, name: '' });

  useEffect(() => {
    fetchQuestionSets();
  }, []);

  const fetchQuestionSets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/appraisal/question-sets');
      if (res.ok) {
        const data = await res.json();
        setQuestionSets(data);
        if (data.length > 0) {
          const defaultSet = data[0];
          setSelectedSetId(defaultSet.id);
          setRows(mapQuestionsToRows(defaultSet.questions));
        }
      }
    } catch (error) {
      console.error('Failed to fetch question sets', error);
    } finally {
      setLoading(false);
    }
  };

  const mapQuestionsToRows = (questions) => {
    return questions.map(q => ({
      id: q.id,
      question: q.question,
      grade: q.grade,
      type: q.type,
      obj: q.objective || 'N/A',
      weightage: q.weightage.toString(),
    }));
  };

  const handleSetChange = (e) => {
    const id = e.target.value;
    setSelectedSetId(id);
    const selectedSet = questionSets.find(s => s.id === id);
    if (selectedSet) {
      setRows(mapQuestionsToRows(selectedSet.questions));
    } else {
      setRows([]);
    }
  };

  const handleCreateSet = async () => {
    if (!newSetModal.name) return;
    try {
      const res = await fetch('/api/appraisal/question-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSetModal.name })
      });
      if (res.ok) {
        const newSet = await res.json();
        setQuestionSets([...questionSets, newSet]);
        setSelectedSetId(newSet.id);
        setRows([]);
        setNewSetModal({ open: false, name: '' });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create question set');
      }
    } catch (error) {
      console.error('Error creating set', error);
    }
  };

  const handleSaveSet = async () => {
    if (!selectedSetId) return;
    setSaving(true);
    try {
      const selectedSet = questionSets.find(s => s.id === selectedSetId);
      const payload = {
        name: selectedSet.name,
        questions: rows
      };
      
      const res = await fetch(`/api/appraisal/question-sets/${selectedSetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const updatedSet = await res.json();
        setQuestionSets(prev => prev.map(s => s.id === updatedSet.id ? updatedSet : s));
        setRows(mapQuestionsToRows(updatedSet.questions));
        alert('Saved successfully!');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save question set');
      }
    } catch (error) {
      console.error('Error saving set', error);
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => { setForm(EMPTY_Q); setModal({ open: true, mode: 'add' }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ open: true, mode: 'edit' }); };
  const openDel = (id) => setDelModal({ open: true, id });

  const handleSaveRow = () => {
    if (!form.question) return;
    if (modal.mode === 'add') setRows(p => [...p, { ...form, id: `new-${Date.now()}` }]);
    else setRows(p => p.map(r => r.id === form.id ? form : r));
    setModal({ open: false });
  };
  const handleDeleteRow = () => {
    setRows(p => p.filter(r => r.id !== delModal.id));
    setDelModal({ open: false, id: null });
  };



  const totalWeightage = rows.reduce((sum, r) => sum + Number(r.weightage || 0), 0);

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="filter-group" style={{ flex: 1 }}>
          <label>Question Set</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select value={selectedSetId} onChange={handleSetChange} style={{ flex: 1 }}>
              <option value="" disabled>Select a Question Set</option>
              {questionSets.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button className="btn-secondary" onClick={() => setNewSetModal({ open: true, name: '' })} style={{ padding: '0.5rem' }}>
              <PlusCircle size={16} />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2, gap: '0.5rem', flex: 1, justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={handleSaveSet} disabled={saving || !selectedSetId}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <ActionToolbar onReset={() => setRows([])} shareTitle="Appraisal Question Set" />

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>
      ) : (
        <>
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
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      {selectedSetId ? 'No questions added yet. Click "New Question" below.' : 'Select or create a question set to begin.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={row.id}>
                      <td style={{ textAlign: 'center', color: '#94a3b8' }}>{index + 1}</td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 10px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Weightage Total: <strong style={{ color: totalWeightage === 100 ? '#15803d' : '#b45309', fontSize: '0.95rem' }}>{totalWeightage}</strong></span>
            <button className="btn-primary" onClick={openAdd} disabled={!selectedSetId}><Plus size={14} /> New Question</button>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <AppModal isOpen={modal.open} title={modal.mode === 'add' ? 'Add Question' : 'Edit Question'}
        onClose={() => setModal({ open: false })} onConfirm={handleSaveRow}
        confirmLabel={modal.mode === 'add' ? 'Add' : 'Update'} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <F label="Question *" field="question" form={form} setForm={setForm} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
            <F label="Optimal Grade" field="grade" options={['1','2','3','4','5']} form={form} setForm={setForm} />
            <F label="Question Type" field="type" options={['Objective','Subjective','Rating']} form={form} setForm={setForm} />
            <F label="Question Objective" field="obj" form={form} setForm={setForm} />
            <F label="Weightage (%)" field="weightage" type="number" form={form} setForm={setForm} />
          </div>
        </div>
      </AppModal>

      {/* Delete Row Modal */}
      <AppModal isOpen={delModal.open} title="Delete Question"
        onClose={() => setDelModal({ open: false })} onConfirm={handleDeleteRow}
        confirmLabel="Delete" confirmColor="#ef4444" size="sm">
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Are you sure you want to delete this question? This cannot be undone.</p>
      </AppModal>

      {/* New Set Modal */}
      <AppModal isOpen={newSetModal.open} title="New Question Set"
        onClose={() => setNewSetModal({ open: false, name: '' })} onConfirm={handleCreateSet}
        confirmLabel="Create" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Set Name *</label>
            <input type="text" value={newSetModal.name} onChange={e => setNewSetModal({ ...newSetModal, name: e.target.value })}
              style={{ padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }} placeholder="e.g., Accounts Question Set" />
          </div>
        </div>
      </AppModal>

    </div>
  );
}
