'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import AppModal from '@/components/AppModal';
import ActionToolbar from '@/components/ActionToolbar';

const EMPTY = { name: '', start: '', end: '', sub: '', weightQ: '100', weightS: '100', status: 'Active' };

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
export default function AppraisalProcess() {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState({ open: false, mode: 'add' });
  const [form, setForm] = useState(EMPTY);
  const [delModal, setDelModal] = useState({ open: false, id: null, bulk: false });

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/appraisal/processes');
      if (res.ok) {
        const json = await res.json();
        // Map backend to frontend schema
        const mappedData = json.map(p => ({
          id: p.id,
          name: p.name,
          start: p.startDate || '',
          end: p.endDate || '',
          sub: p.submissionDate || '',
          weightQ: p.weightageQuestion.toString(),
          weightS: p.weightageSkill.toString(),
          status: p.status,
        }));
        setData(mappedData);
      }
    } catch (error) {
      console.error('Failed to fetch processes', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(selected.length === data.length ? [] : data.map(r => r.id));

  const openAdd = () => { setForm(EMPTY); setModal({ open: true, mode: 'add' }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ open: true, mode: 'edit' }); };
  const openDel = (id) => setDelModal({ open: true, id, bulk: false });
  const openBulkDel = () => { if (selected.length) setDelModal({ open: true, id: null, bulk: true }); };

  const handleSave = async () => {
    if (!form.name) return;

    try {
      const payload = {
        name: form.name,
        start: form.start,
        end: form.end,
        sub: form.sub,
        weightQ: form.weightQ,
        weightS: form.weightS,
        status: form.status,
      };

      if (modal.mode === 'add') {
        const res = await fetch('/api/appraisal/processes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          await fetchProcesses();
          setModal({ open: false });
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to create process');
        }
      } else {
        const res = await fetch(`/api/appraisal/processes/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          await fetchProcesses();
          setModal({ open: false });
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to update process');
        }
      }
    } catch (error) {
      console.error('Error saving process', error);
    }
  };

  const handleDelete = async () => {
    try {
      if (delModal.bulk) {
        const res = await fetch('/api/appraisal/processes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selected }),
        });
        if (res.ok) {
          await fetchProcesses();
          setSelected([]);
        } else {
          alert('Failed to delete selected processes');
        }
      } else {
        const res = await fetch(`/api/appraisal/processes/${delModal.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          await fetchProcesses();
          setSelected(p => p.filter(id => id !== delModal.id));
        } else {
          alert('Failed to delete process');
        }
      }
    } catch (error) {
      console.error('Error deleting process', error);
    } finally {
      setDelModal({ open: false, id: null, bulk: false });
    }
  };



  return (
    <div>
      <ActionToolbar onReset={() => { fetchProcesses(); setSelected([]); }} shareTitle="Appraisal Process" />
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
            {loading ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>No appraisal processes found.</td></tr>
            ) : (
              data.map(row => (
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <AppModal isOpen={modal.open} title={modal.mode === 'add' ? 'Add Appraisal Process' : 'Edit Appraisal Process'}
        onClose={() => setModal({ open: false })} onConfirm={handleSave}
        confirmLabel={modal.mode === 'add' ? 'Add' : 'Update'} size="lg">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ gridColumn: '1 / -1' }}><F label="Process Name *" field="name" form={form} setForm={setForm} /></div>
          <F label="Start Date" field="start" type="date" form={form} setForm={setForm} />
          <F label="End Date" field="end" type="date" form={form} setForm={setForm} />
          <F label="Submission Date" field="sub" type="date" form={form} setForm={setForm} />
          <F label="Status" field="status" options={['Active', 'Inactive', 'Completed']} form={form} setForm={setForm} />
          <F label="Weightage (Question %)" field="weightQ" type="number" form={form} setForm={setForm} />
          <F label="Weightage (Skill %)" field="weightS" type="number" form={form} setForm={setForm} />
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
