'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Save, Trash2, Users } from 'lucide-react';

const controlStyle = {
  width: '100%', padding: '11px 13px', borderRadius: '8px', border: '1px solid #cbd5e1',
  background: '#fff', color: '#1e293b', fontSize: '0.94rem', boxSizing: 'border-box'
};
const labelStyle = { display: 'block', color: '#334155', fontSize: '0.88rem', fontWeight: 600, marginBottom: '7px' };
const emptyFilters = () => ({
  projectId: '', taskId: '', resourceId: '', fromDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10),
  toDate: new Date().toISOString().slice(0, 10), resourceType: 'Labour'
});

export default function LabourRequestForm() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [resources, setResources] = useState([]);
  const [libraryTasks, setLibraryTasks] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [rows, setRows] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingResources, setLoadingResources] = useState(false);
  const [searched, setSearched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load assigned projects.');
        setProjects(Array.isArray(data) ? data : []);
      })
      .catch(error => setMessage(error.message || 'Unable to load assigned projects.'))
      .finally(() => setLoadingProjects(false));
    fetch('/api/engineering/unit-library', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : [])
      .then(data => setAvailableUnits([...new Set((Array.isArray(data) ? data : []).map(unit => typeof unit === 'string' ? unit : unit.name).filter(Boolean))]))
      .catch(() => setAvailableUnits([]));
  }, []);

  const loadResources = useCallback(async (projectId) => {
    if (!projectId) { setResources([]); setLibraryTasks([]); setRows([]); setSearched(false); return; }
    setLoadingResources(true);
    setMessage('');
    try {
      const response = await fetch(`/api/engineering/task-library?projectId=${encodeURIComponent(projectId)}`, { cache: 'no-store' });
      const groups = await response.json();
      if (!response.ok) throw new Error(groups.error || 'Unable to load tasks and resources for this project.');
      const flattened = [];
      const tasks = (Array.isArray(groups) ? groups : []).flatMap(group => group.tasks || []);
      setLibraryTasks(tasks.map(task => ({ id: task.id, name: task.name })));
      tasks.forEach(task => {
        const source = filters.resourceType === 'Equipment' ? task.equipments : task.labours;
        (source || []).forEach(resource => flattened.push({
          key: `${task.id}::${resource.id}`,
          id: resource.id,
          name: resource.name,
          taskId: task.id,
          taskName: task.name,
          unit: resource.unit || (filters.resourceType === 'Equipment' ? 'Hour' : 'Manday'),
          quantity: resource.quantity || 1,
          rate: resource.rate || 0,
        }));
      });
      setResources(flattened);
      setRows([]);
      setSearched(false);
    } catch (error) {
      setResources([]);
      setLibraryTasks([]);
      setMessage(error.message || 'Unable to load tasks and resources for this project.');
    } finally {
      setLoadingResources(false);
    }
  }, [filters.resourceType]);

  useEffect(() => { void loadResources(filters.projectId); }, [filters.projectId, filters.resourceType, loadResources]);

  const resourceOptions = useMemo(() => {
    const filtered = resources.filter(resource => !filters.taskId || resource.taskId === filters.taskId);
    const map = new Map();
    filtered.forEach(resource => { if (!map.has(resource.name)) map.set(resource.name, resource); });
    return [...map.values()];
  }, [resources, filters.taskId]);

  const search = () => {
    const filtered = resources.filter(resource =>
      (!filters.taskId || resource.taskId === filters.taskId) &&
      (!filters.resourceId || resource.id === filters.resourceId)
    );
    setRows(filtered.map(resource => ({
      ...resource, qty: resource.quantity || 1, leadTime: String(Math.max(1, Math.round((new Date(filters.toDate) - new Date(filters.fromDate)) / 86400000) || 1))
    })));
    setSearched(true);
  };

  const addRow = () => setRows(previous => [...previous, {
    key: `manual-${Date.now()}-${previous.length}`, id: '', name: '', taskId: '', taskName: '', unit: filters.resourceType === 'Equipment' ? 'Hour' : 'Manday', qty: 1, rate: 0, leadTime: ''
  }]);
  const updateRow = (index, field, value) => setRows(previous => previous.map((row, rowIndex) => {
    if (rowIndex !== index) return row;
    if (field === 'resourceKey') {
      const resource = resources.find(item => item.key === value);
      return resource ? { ...row, ...resource, qty: resource.quantity || 1 } : { ...row, key: `manual-${Date.now()}-${index}`, id: '', name: '', taskId: '', taskName: '' };
    }
    return { ...row, [field]: value };
  }));

  const reset = () => {
    setFilters(emptyFilters());
    setResources([]);
    setLibraryTasks([]);
    setRows([]);
    setSearched(false);
    setMessage('');
  };

  const submit = async () => {
    if (!filters.projectId || rows.length === 0) { setMessage('Select a project and search for resources or add a row.'); return; }
    const validRows = rows.filter(row => row.name.trim() && Number(row.qty) > 0);
    if (!validRows.length) { setMessage(`Select or enter a ${filters.resourceType.toLowerCase()} and quantity for at least one row.`); return; }
    setSubmitting(true);
    setMessage('');
    try {
      for (const row of validRows) {
        const response = await fetch('/api/contracting/labour/requisitions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: filters.projectId,
            category: filters.resourceType,
            designation: row.name,
            quantity: Number(row.qty),
            unit: row.unit,
            rate: Number(row.rate) || 0,
            duration: Number(row.leadTime) || 1,
            purpose: row.taskName || '',
            requiredDate: filters.toDate,
          })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to submit requisition.');
      }
      setMessage(`${validRows.length} requisition${validRows.length === 1 ? '' : 's'} submitted successfully.`);
      setRows([]);
      setSearched(false);
    } catch (error) {
      setMessage(error.message || 'Failed to submit requisition.');
    } finally {
      setSubmitting(false);
    }
  };

  const input = (label, value, onChange, options = {}) => (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      {options.select ? <select value={value} onChange={event => onChange(event.target.value)} style={controlStyle}>
        {options.select.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select> : <input type={options.type || 'text'} min={options.min} step={options.step} placeholder={options.placeholder || ''} value={value} onChange={event => onChange(event.target.value)} style={controlStyle} />}
    </label>
  );

  return (
    <main style={{ minHeight: 'calc(100vh - 100px)', padding: '32px 20px', background: 'linear-gradient(135deg, #e9f7fc 0%, #f4f7ff 100%)' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <button type="button" onClick={() => router.push('/employee/dashboard')} style={{ border: 0, background: 'transparent', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', cursor: 'pointer', padding: '0 0 18px' }}><ArrowLeft size={18} /> Back to Employee App</button>
        <section style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 8px 28px rgba(30, 64, 100, 0.10)', overflow: 'hidden' }}>
          <header style={{ padding: '24px 28px', borderBottom: '1px solid #e7edf4', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ width: '46px', height: '46px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: '#e7f2ff', color: '#2563eb' }}><Users size={22} /></span>
            <div><h1 style={{ margin: 0, color: '#172b4d', fontSize: '1.35rem' }}>Labour Requisition</h1><p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.9rem' }}>Choose a project to load its task library labour and equipment.</p></div>
          </header>
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#f1f5f9', color: '#334155', fontWeight: 700 }}>Filters</div>
              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {input('Project *', filters.projectId, value => setFilters(previous => ({ ...previous, projectId: value, taskId: '', resourceId: '' })), { select: [{ value: '', label: loadingProjects ? 'Loading projects…' : '-- Select Project --' }, ...projects.map(project => ({ value: project.id, label: project.name }))] })}
                {input('Resource Type', filters.resourceType, value => setFilters(previous => ({ ...previous, resourceType: value, taskId: '', resourceId: '' })), { select: [{ value: 'Labour', label: 'Labour' }, { value: 'Equipment', label: 'Equipment' }] })}
                {input('Task', filters.taskId, value => setFilters(previous => ({ ...previous, taskId: value, resourceId: '' })), { select: [{ value: '', label: libraryTasks.length ? '-- All Tasks --' : loadingResources ? 'Loading tasks…' : 'No tasks found' }, ...libraryTasks.map(task => ({ value: task.id, label: task.name }))] })}
                {input(filters.resourceType, filters.resourceId, value => setFilters(previous => ({ ...previous, resourceId: value })), { select: [{ value: '', label: resourceOptions.length ? `-- All ${filters.resourceType} --` : `No ${filters.resourceType.toLowerCase()} found` }, ...resourceOptions.map(resource => ({ value: resource.id, label: resource.name }))] })}
                {input('From Date', filters.fromDate, value => setFilters(previous => ({ ...previous, fromDate: value })), { type: 'date' })}
                {input('To Date', filters.toDate, value => setFilters(previous => ({ ...previous, toDate: value })), { type: 'date' })}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={reset} style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#475569', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Reset</button>
                  <button type="button" onClick={search} disabled={!filters.projectId || loadingResources} style={{ border: 0, background: '#087cff', color: '#fff', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, opacity: !filters.projectId || loadingResources ? 0.55 : 1 }}>{loadingResources ? 'Loading…' : 'Search'}</button>
                </div>
              </div>
            </section>

            {searched && <section style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <strong style={{ color: '#334155' }}>{filters.resourceType} Requisition Details</strong>
                <button type="button" onClick={addRow} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 0, borderRadius: '7px', background: '#0891b2', color: '#fff', padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}><Plus size={15} /> Add Row</button>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {rows.length === 0 && <div style={{ color: '#64748b' }}>No {filters.resourceType.toLowerCase()} found for this project and filter. Use Add Row to enter one manually.</div>}
                {rows.map((row, index) => <div key={row.key || index} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <strong style={{ color: '#64748b' }}>Row {index + 1}</strong>
                  <label style={{ display: 'block' }}><span style={labelStyle}>{filters.resourceType}</span><select value={row.id ? row.key : ''} onChange={event => updateRow(index, 'resourceKey', event.target.value)} style={controlStyle}><option value="">-- Select or use Add Row to type manually --</option>{resources.map(resource => <option key={resource.key} value={resource.key}>{resource.name} — {resource.taskName}</option>)}</select>{!row.id && <input value={row.name} onChange={event => updateRow(index, 'name', event.target.value)} placeholder={`Enter ${filters.resourceType.toLowerCase()} name`} style={{ ...controlStyle, marginTop: '10px' }} />}</label>
                  <label style={{ display: 'block' }}><span style={labelStyle}>Task</span><input value={row.taskName} onChange={event => updateRow(index, 'taskName', event.target.value)} placeholder="Task or work activity" style={controlStyle} /></label>
                  {input('Quantity', row.qty, value => updateRow(index, 'qty', value), { type: 'number', min: 0, step: 'any' })}
                  {input('Unit', row.unit, value => updateRow(index, 'unit', value), { select: [...new Set([row.unit, ...availableUnits].filter(Boolean))].map(unit => ({ value: unit, label: unit })) })}
                  {input('Rate (₹)', row.rate, value => updateRow(index, 'rate', value), { type: 'number', min: 0, step: 'any' })}
                  <div style={{ color: '#0284c7', fontWeight: 700 }}>Amount: ₹{((Number(row.qty) || 0) * (Number(row.rate) || 0)).toFixed(2)}</div>
                  {input('Lead Time (Days)', row.leadTime, value => updateRow(index, 'leadTime', value), { type: 'number', min: 0, placeholder: 'e.g. 7' })}
                  <button type="button" onClick={() => setRows(previous => previous.filter((_, rowIndex) => rowIndex !== index))} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '5px', border: '1px solid #fecaca', background: '#fff1f2', color: '#dc2626', padding: '7px 10px', borderRadius: '7px', cursor: 'pointer' }}><Trash2 size={14} /> Remove row</button>
                </div>)}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" onClick={submit} disabled={submitting || rows.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', border: 0, borderRadius: '8px', background: '#16a34a', color: '#fff', padding: '11px 17px', fontWeight: 700, cursor: 'pointer', opacity: submitting || rows.length === 0 ? 0.6 : 1 }}><Save size={16} />{submitting ? 'Submitting…' : 'Submit Requisition'}</button></div>
              </div>
            </section>}
            {message && <div role="status" style={{ padding: '12px 14px', borderRadius: '8px', background: /successfully/.test(message) ? '#f0fdf4' : '#fef2f2', color: /successfully/.test(message) ? '#166534' : '#b91c1c', border: `1px solid ${/successfully/.test(message) ? '#bbf7d0' : '#fecaca'}` }}>{message}</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
