'use client';
import React, { useState, useEffect } from 'react';
import { Home, ChevronRight, MessageSquare, Save, RefreshCw, AlertCircle, CheckCircle2, Search, Plus, Trash2 } from 'lucide-react';
import '../../contracting.css';

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  enquiryDate: today(),
  dueDate: '',
  expiryDate: '',
  paymentTerms: '',
  deliveryTerms: '',
  specialCond: '',
};

export default function ContractingEnquiryGeneration() {
  const [projects, setProjects] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedContractorIds, setSelectedContractorIds] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [enquiryTasks, setEnquiryTasks] = useState([
    { id: Date.now(), selectedTaskId: '', taskName: '', unit: '', qty: 1 }
  ]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedEnquiry, setSavedEnquiry] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/contractors').then(r => r.json()),
      fetch('/api/engineering/task-library').then(r => r.json()),
    ]).then(([proj, cont, tlib]) => {
      setProjects(Array.isArray(proj) ? proj : []);
      setContractors(Array.isArray(cont) ? cont.filter(c => c.status !== 'Inactive') : []);
      if (Array.isArray(tlib)) {
        const allTasks = [];
        tlib.forEach(g => (g.tasks || []).forEach(t => allTasks.push(t)));
        setTasks(allTasks);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  const toggleContractor = (id) => {
    setSelectedContractorIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const addTaskRow = () => setEnquiryTasks(prev => [...prev, { id: Date.now(), selectedTaskId: '', taskName: '', unit: '', qty: 1 }]);
  const removeTaskRow = (id) => setEnquiryTasks(prev => prev.filter(t => t.id !== id));
  const updateTaskRow = (id, field, value) => setEnquiryTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  
  const fillFromLibrary = (rowId, taskId) => {
    setEnquiryTasks(prev => prev.map(t => t.id === rowId ? { ...t, selectedTaskId: taskId, taskName: '', unit: '', qty: 1 } : t));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) { setSaveError('Please select a project.'); return; }
    if (enquiryTasks.every(t => !t.taskName)) { setSaveError('Add at least one task.'); return; }
    if (selectedContractorIds.length === 0) { setSaveError('Select at least one contractor.'); return; }

    setSaving(true);
    setSaveError('');
    setSavedEnquiry(null);

    try {
      const body = {
        projectId: selectedProjectId,
        projectName: selectedProject?.name || '',
        ...form,
        tasks: enquiryTasks.filter(t => t.taskName),
        contractors: contractors.filter(c => selectedContractorIds.includes(c.id))
      };

      const res = await fetch('/api/contracting/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      const data = await res.json();
      setSavedEnquiry(data);
      setSelectedContractorIds([]);
      setEnquiryTasks([{ id: Date.now(), taskName: '', unit: '', qty: 1 }]);
      setForm(EMPTY_FORM);
      setSelectedProjectId('');
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedProjectId('');
    setSelectedContractorIds([]);
    setEnquiryTasks([{ id: Date.now(), taskName: '', unit: '', qty: 1 }]);
    setForm(EMPTY_FORM);
    setSaveError('');
    setSavedEnquiry(null);
  };

  return (
    <div className="contracting-container">
      <div className="contracting-header">
        <div className="contracting-header-title">
          <MessageSquare size={18} /> Enquiry Generation
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Enquiry Generation
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>

        {savedEnquiry && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534' }}>
            <CheckCircle2 size={16} /> Enquiry <strong>{savedEnquiry.enquiryNo}</strong> created and sent to {savedEnquiry.contractors?.length || 0} contractor(s).
          </div>
        )}

        {saveError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b' }}>
            <AlertCircle size={16} /> {saveError}
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Section 1: Project Selection */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden' }}>
            <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
              ▸ Project Details
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>Project <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    className="contracting-input"
                    style={{ width: '100%' }}
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">{loading ? 'Loading...' : '- Select Project -'}</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.company})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>Company</label>
                  <input type="text" className="contracting-input" style={{ width: '100%' }} value={selectedProject?.company || ''} readOnly disabled />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>Status</label>
                  <input type="text" className="contracting-input" style={{ width: '100%' }} value={selectedProject?.status || ''} readOnly disabled />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Enquiry Details */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden' }}>
            <div style={{ background: '#eff6ff', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#1d4ed8', borderBottom: '1px solid #dbeafe' }}>
              ▸ Enquiry Details
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>Enquiry No.</label>
                  <input type="text" className="contracting-input" style={{ width: '100%' }} value="Auto Generated" readOnly disabled />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>Enquiry Date</label>
                  <input type="date" className="contracting-input" style={{ width: '100%' }} value={form.enquiryDate} onChange={e => setForm(f => ({ ...f, enquiryDate: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>Due Date</label>
                  <input type="date" className="contracting-input" style={{ width: '100%' }} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>Expiry Date</label>
                  <input type="date" className="contracting-input" style={{ width: '100%' }} value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>Payment Terms</label>
                  <input type="text" className="contracting-input" style={{ width: '100%' }} value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} placeholder="e.g. Within 30 days" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>Delivery Terms</label>
                  <input type="text" className="contracting-input" style={{ width: '100%' }} value={form.deliveryTerms} onChange={e => setForm(f => ({ ...f, deliveryTerms: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>Special Conditions</label>
                  <input type="text" className="contracting-input" style={{ width: '100%' }} value={form.specialCond} onChange={e => setForm(f => ({ ...f, specialCond: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Tasks Table */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden' }}>
            <div style={{ background: '#eff6ff', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#1d4ed8', borderBottom: '1px solid #dbeafe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>▸ Tasks / Work Items to Enquire ({enquiryTasks.length})</span>
              <button type="button" onClick={addTaskRow} style={{ background: '#17a2b8', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={14} /> Add Row
              </button>
            </div>
            <div style={{ padding: '0', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', width: '50px', color: '#64748b', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>From Task Library</th>
                    <th style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Task / Work Description</th>
                    <th style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', width: '100px', color: '#64748b', fontWeight: 600 }}>Unit</th>
                    <th style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', width: '80px', color: '#64748b', fontWeight: 600 }}>Qty</th>
                    <th style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', width: '50px', color: '#64748b', fontWeight: 600 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {enquiryTasks.map((row, idx) => {
                    const selectedTask = row.selectedTaskId ? tasks.find(t => t.id === row.selectedTaskId) : null;
                    const subItems = selectedTask ? [
                      ...(selectedTask.labours || []).map(l => ({ name: `${selectedTask.name} - ${l.name}`, unit: l.unit || 'Manday', qty: l.quantity || 1 })),
                      ...(selectedTask.equipments || []).map(e => ({ name: `${selectedTask.name} - ${e.name}`, unit: e.unit || 'Hour', qty: e.quantity || 1 }))
                    ] : [];
                    
                    return (
                    <tr key={row.id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        <select
                          className="contracting-input"
                          style={{ width: '100%', fontSize: '0.8rem' }}
                          onChange={e => fillFromLibrary(row.id, e.target.value)}
                          value={row.selectedTaskId || ''}
                        >
                          <option value="">Pick from library...</option>
                          {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        {selectedTask && subItems.length > 0 ? (
                          <select
                            className="contracting-input"
                            style={{ width: '100%', fontSize: '0.8rem' }}
                            value={row.taskName}
                            onChange={e => {
                              const val = e.target.value;
                              if (!val) {
                                setEnquiryTasks(prev => prev.map(t => t.id === row.id ? { ...t, taskName: '', unit: '', qty: 1 } : t));
                                return;
                              }
                              const picked = subItems.find(s => s.name === val);
                              if (picked) {
                                setEnquiryTasks(prev => prev.map(t => t.id === row.id ? { ...t, taskName: picked.name, unit: picked.unit, qty: picked.qty } : t));
                              }
                            }}
                          >
                            <option value="">- Select Labour/Equipment -</option>
                            {subItems.map((s, i) => (
                              <option key={i} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="contracting-input"
                            style={{ width: '100%' }}
                            placeholder="Task / work description"
                            value={row.taskName}
                            onChange={e => updateTaskRow(row.id, 'taskName', e.target.value)}
                          />
                        )}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        <input
                          type="text"
                          className="contracting-input"
                          style={{ width: '100%', textAlign: 'center' }}
                          placeholder="Job / m²"
                          value={row.unit}
                          onChange={e => updateTaskRow(row.id, 'unit', e.target.value)}
                        />
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        <input
                          type="number"
                          className="contracting-input"
                          style={{ width: '100%', textAlign: 'center' }}
                          value={row.qty}
                          onChange={e => updateTaskRow(row.id, 'qty', e.target.value)}
                        />
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        <button type="button" onClick={() => removeTaskRow(row.id)} style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Send to Contractors */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden' }}>
            <div style={{ background: '#eff6ff', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#1d4ed8', borderBottom: '1px solid #dbeafe' }}>
              ▸ Send Enquiry To ({selectedContractorIds.length} selected)
            </div>
            <div style={{ padding: '20px' }}>
              {loading ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading contractors...</div>
              ) : contractors.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No contractors available. Add them in Contractor List first.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px', maxHeight: '260px', overflowY: 'auto' }}>
                  {contractors.map(c => (
                    <label
                      key={c.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
                        borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem',
                        border: selectedContractorIds.includes(c.id) ? '1.5px solid #17a2b8' : '1px solid #e2e8f0',
                        background: selectedContractorIds.includes(c.id) ? '#f0f9ff' : '#fff',
                        transition: 'all 0.15s'
                      }}
                    >
                      <input
                        type="checkbox"
                        style={{ accentColor: '#17a2b8' }}
                        checked={selectedContractorIds.includes(c.id)}
                        onChange={() => toggleContractor(c.id)}
                      />
                      <span style={{ flex: 1 }}>
                        {c.companyName}
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>
                          {c.contactPerson || ''} {c.phone ? `• ${c.phone}` : ''}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn-cyan" style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }} onClick={handleReset}>
              <RefreshCw size={14} /> Reset
            </button>
            <button type="submit" className="btn-cyan" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Enquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
