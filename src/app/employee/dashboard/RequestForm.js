'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, FileText } from 'lucide-react';

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
  background: '#fff', color: '#1e293b', fontSize: '0.95rem', boxSizing: 'border-box'
};

export default function EmployeeRequestForm({ type }) {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialItems, setMaterialItems] = useState([]);
  const [labourItems, setLabourItems] = useState([]);
  const [wbsTasks, setWbsTasks] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [loadingWbsTasks, setLoadingWbsTasks] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    projectId: '', date: new Date().toISOString().slice(0, 10), shift: 'Day', weather: 'Clear',
    preparedBy: '', workDescription: '', activitiesExecuted: '', skilledLabour: '', unskilledLabour: '',
    equipmentUsed: '', materialConsumed: '', safetyIncidents: 'None', remarks: '',
    department: '', site: '', priority: 'Normal', purpose: '',
    category: 'Labour', designation: '', quantity: '', labourUnit: 'Day', rate: '', requiredDate: ''
  });

  const titles = { dpr: 'Daily Progress Report', material: 'Material Requisition', labour: 'Labour Requisition' };
  const title = titles[type];

  useEffect(() => {
    const savedEmployee = localStorage.getItem('employeeData');
    if (savedEmployee) {
      const parsed = JSON.parse(savedEmployee);
      setEmployee(parsed);
      setForm(previous => ({ ...previous, preparedBy: parsed.name || '', department: parsed.department || '' }));
    }
    fetch('/api/projects', { cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load your assigned projects.');
        setProjects(Array.isArray(data) ? data : []);
      })
      .catch(fetchError => setError(fetchError.message || 'Could not load your assigned projects.'))
      .finally(() => setLoadingProjects(false));
  }, [type]);

  useEffect(() => {
    if (type !== 'material') return;
    if (!form.projectId) { setMaterials([]); return; }
    fetch(`/api/engineering/material-library?resourceType=Material&projectId=${encodeURIComponent(form.projectId)}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : [])
      .then(groups => {
        const flattened = [];
        const visit = nodes => (nodes || []).forEach(node => {
          (node.materials || []).forEach(material => flattened.push(material));
          visit(node.subgroups);
        });
        visit(Array.isArray(groups) ? groups : []);
        setMaterials(flattened);
      })
      .catch(() => setMaterials([]));
  }, [type, form.projectId]);

  useEffect(() => {
    if (type === 'dpr' || !form.projectId) {
      setWbsTasks([]);
      setSelectedTaskIds([]);
      setMaterialItems([]);
      setLabourItems([]);
      return;
    }
    let cancelled = false;
    setLoadingWbsTasks(true);
    setWbsTasks([]);
    setSelectedTaskIds([]);
    setMaterialItems([]);
    setLabourItems([]);
    fetch(`/api/employee/requisition-tasks?projectId=${encodeURIComponent(form.projectId)}`, { cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load WBS tasks.');
        if (!cancelled) setWbsTasks(Array.isArray(data) ? data : []);
      })
      .catch(fetchError => { if (!cancelled) setError(fetchError.message || 'Unable to load WBS tasks.'); })
      .finally(() => { if (!cancelled) setLoadingWbsTasks(false); });
    return () => { cancelled = true; };
  }, [type, form.projectId]);

  const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const field = (label, key, placeholder, options = {}) => (
    <label key={key} style={{ display: 'block', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>
      <span style={{ display: 'block', marginBottom: '8px' }}>{label}{options.required ? ' *' : ''}</span>
      {options.multiline ? (
        <textarea required={options.required} value={form[key]} onChange={event => update(key, event.target.value)} placeholder={placeholder} rows={options.rows || 4} style={{ ...inputStyle, minHeight: '105px', resize: 'vertical' }} />
      ) : options.select ? (
        <select required={options.required} value={form[key]} onChange={event => update(key, event.target.value)} style={inputStyle}>
          {options.select.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : (
        <input required={options.required} type={options.type || 'text'} min={options.min} step={options.step} value={form[key]} onChange={event => update(key, event.target.value)} placeholder={placeholder} style={inputStyle} />
      )}
    </label>
  );

  const projectField = (
    <label style={{ display: 'block', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>
      <span style={{ display: 'block', marginBottom: '8px' }}>Project *</span>
      <select required value={form.projectId} onChange={event => {
        const project = projects.find(entry => entry.id === event.target.value);
        setMaterialItems([]);
        setLabourItems([]);
        setForm(previous => ({ ...previous, projectId: event.target.value, site: project?.location || project?.address || project?.state || '' }));
      }} style={inputStyle}>
        <option value="">{loadingProjects ? 'Loading assigned projects…' : '-- Select your project --'}</option>
        {projects.map(project => <option key={project.id} value={project.id}>{project.projectId || project.id} - {project.name}</option>)}
      </select>
      {!loadingProjects && projects.length === 0 && <span style={{ display: 'block', marginTop: '6px', color: '#b45309', fontWeight: 400 }}>No projects are assigned to your account.</span>}
    </label>
  );

  const toggleWbsTask = (task, checked) => {
    setSelectedTaskIds(previous => checked
      ? [...new Set([...previous, task.id])]
      : previous.filter(id => id !== task.id));

    if (type === 'material') {
      if (!checked) {
        setMaterialItems(previous => previous.filter(item => item.wbsTaskId !== task.id));
        return;
      }
      const taskMaterials = (task.materials || []).flatMap((material, materialIndex) => {
        const components = Array.isArray(material.components) && material.components.length
          ? material.components
          : [material];
        return components.map((component, componentIndex) => ({
          selectedMaterialId: component.sourceId || component.id || material.id || '',
          item: component.name || component.materialName || material.name || material.materialName || '',
          specification: component.specification || '',
          unit: component.unit || material.unit || 'Nos',
          quantity: String(component.quantity ?? material.quantity ?? ''),
          wbsTaskId: task.id,
          taskName: task.name,
          rowId: `${task.id}-${material.id || materialIndex}-${component.sourceId || component.id || componentIndex}`,
        }));
      });
      setMaterialItems(previous => [...previous.filter(item => item.wbsTaskId !== task.id), ...taskMaterials]);
      return;
    }

    if (!checked) {
      setLabourItems(previous => previous.filter(item => item.wbsTaskId !== task.id));
      return;
    }
    const taskLabours = task.labours?.length
      ? task.labours.flatMap(labour => Array.isArray(labour.components) && labour.components.length ? labour.components : [labour])
      : Number(task.volOfWorkLabour) > 0
        ? [{ id: `wbs-${task.id}`, name: task.name, quantity: task.volOfWorkLabour, unit: 'Day', rate: task.labourRate || 0 }]
        : [];
    setLabourItems(previous => [
      ...previous.filter(item => item.wbsTaskId !== task.id),
      ...taskLabours.map((labour, index) => ({
        rowId: `${task.id}-${labour.sourceId || labour.id || index}`,
        wbsTaskId: task.id,
        taskName: task.name,
        designation: labour.name,
        quantity: String(labour.quantity ?? 1),
        unit: labour.unit || 'Day',
        rate: String(labour.rate || 0),
      })),
    ]);
  };

  const wbsTaskField = type !== 'dpr' && (
    <section style={{ border: '1px solid #dbeafe', borderRadius: 10, padding: 18, background: '#f8fbff' }}>
      <h2 style={{ margin: '0 0 6px', color: '#172b4d', fontSize: '1.05rem' }}>Select WBS Tasks *</h2>
      <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: '0.85rem' }}>Select one or more tasks. Their {type === 'material' ? 'materials' : 'labour resources'} will be added below.</p>
      {loadingWbsTasks ? <div style={{ color: '#64748b' }}>Loading WBS tasks…</div> : wbsTasks.length ? (
        <div style={{ maxHeight: 240, overflowY: 'auto', display: 'grid', gap: 8 }}>
          {wbsTasks.map(task => {
            const resourceCount = type === 'material'
              ? (task.materials || []).reduce((count, material) => count + (material.components?.length || 1), 0)
              : (task.labours || []).reduce((count, labour) => count + (labour.components?.length || 1), 0);
            return <label key={task.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedTaskIds.includes(task.id)} onChange={event => toggleWbsTask(task, event.target.checked)} style={{ marginTop: 3 }} />
              <span><strong style={{ color: '#1e293b' }}>{task.name}</strong><small style={{ display: 'block', color: '#64748b', marginTop: 3 }}>{task.groupName} · {resourceCount || (type === 'labour' && Number(task.volOfWorkLabour) > 0 ? 'WBS labour quantity' : 'No linked resources')}</small></span>
            </label>;
          })}
        </div>
      ) : <div style={{ color: '#b45309' }}>No WBS tasks found for this project.</div>}
    </section>
  );

  const fields = type === 'dpr' ? [
    projectField,
    field('Report Date', 'date', '', { type: 'date', required: true }),
    field('Shift', 'shift', '', { select: [{ value: 'Day', label: 'Day' }, { value: 'Night', label: 'Night' }] }),
    field('Prepared By', 'preparedBy', 'Enter your name', { required: true }),
    field('Weather', 'weather', 'Select weather', { select: ['Clear', 'Cloudy', 'Rainy', 'Windy'].map(value => ({ value, label: value })) }),
    field('Work Description', 'workDescription', 'Describe the work planned or in progress…', { multiline: true }),
    field('Activities Executed', 'activitiesExecuted', 'List work completed today…', { multiline: true }),
    field('Skilled Labour', 'skilledLabour', 'Number of skilled workers', { type: 'number', min: 0 }),
    field('Unskilled Labour', 'unskilledLabour', 'Number of unskilled workers', { type: 'number', min: 0 }),
    field('Equipment Used', 'equipmentUsed', 'List equipment used…', { multiline: true }),
    field('Material Consumed', 'materialConsumed', 'List materials used…', { multiline: true }),
    field('Safety Incidents', 'safetyIncidents', 'Describe incidents, or enter None', { multiline: true }),
    field('Remarks', 'remarks', 'Add any additional notes…', { multiline: true }),
  ] : type === 'material' ? [
    projectField,
    field('Site / Location', 'site', 'Project site / location'),
    field('Department', 'department', 'Department'),
    <label key="requested-by" style={{ display: 'block', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}><span style={{ display: 'block', marginBottom: '8px' }}>Requested By</span><input value={employee?.name || ''} readOnly placeholder="Employee name" style={{ ...inputStyle, background: '#f8fafc' }} /><span style={{ display: 'block', marginTop: '6px', color: '#64748b', fontWeight: 400 }}>This request will be submitted under your employee account.</span></label>,
    field('Overall Required Date', 'requiredDate', '', { type: 'date' }),
    field('Priority', 'priority', '', { select: ['Normal', 'Urgent', 'Critical'].map(value => ({ value, label: value })) }),
    field('Purpose of Procurement', 'purpose', 'Describe why these materials are required…', { multiline: true }),
    field('Remarks', 'remarks', 'Add any additional notes…', { multiline: true }),
  ] : [
    projectField,
    <label key="requested-by" style={{ display: 'block', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}><span style={{ display: 'block', marginBottom: '8px' }}>Requested By</span><input value={employee?.name || ''} readOnly placeholder="Employee name" style={{ ...inputStyle, background: '#f8fafc' }} /><span style={{ display: 'block', marginTop: '6px', color: '#64748b', fontWeight: 400 }}>This request will be submitted under your employee account.</span></label>,
    field('Required By Date', 'requiredDate', '', { type: 'date', required: true }),
    field('Purpose / Work Details', 'purpose', 'Describe the labour required…', { multiline: true }),
  ];

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      let endpoint;
      let payload;
      if (type === 'dpr') {
        endpoint = '/api/engineering/dpr';
        payload = { ...form, preparedById: employee?.id, preparedByName: form.preparedBy, status: 'Draft' };
      } else if (type === 'material') {
        const selectedProject = projects.find(project => project.id === form.projectId);
        const validItems = materialItems.filter(item => item.item.trim() && Number(item.quantity) > 0);
        if (!selectedProject) throw new Error('Select a permitted project.');
        if (!selectedTaskIds.length) throw new Error('Select at least one WBS task.');
        if (!validItems.length) throw new Error('Add at least one material with a quantity greater than zero.');
        endpoint = '/api/purchase/pr';
        const taskNames = wbsTasks.filter(task => selectedTaskIds.includes(task.id)).map(task => task.name);
        payload = {
          department: form.department, project: selectedProject.name, site: form.site,
          requiredDate: form.requiredDate || undefined, priority: form.priority,
          purpose: [form.purpose, `WBS Tasks: ${taskNames.join(', ')}`].filter(Boolean).join('\n'),
          remarks: form.remarks, requestedById: employee?.id,
          items: validItems.map(item => ({
            ...item,
            specification: [item.specification, item.taskName ? `WBS Task: ${item.taskName}` : ''].filter(Boolean).join('\n'),
          }))
        };
      } else {
        const validLabour = labourItems.filter(item => item.designation.trim() && Number(item.quantity) > 0);
        if (!form.projectId) throw new Error('Select a permitted project.');
        if (!selectedTaskIds.length) throw new Error('Select at least one WBS task.');
        if (!validLabour.length) throw new Error('The selected WBS tasks have no labour resources to request.');
        const response = await fetch('/api/contracting/labour/requisitions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: form.projectId,
            requiredDate: form.requiredDate,
            items: validLabour.map(item => ({
              category: 'Labour',
              designation: item.designation,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.rate,
              wbsTaskId: item.wbsTaskId,
              purpose: form.purpose || '',
            })),
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not submit labour requisitions.');
        router.push('/employee/dashboard');
        return;
      }
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Could not submit ${title.toLowerCase()}.`);
      router.push('/employee/dashboard');
    } catch (submitError) {
      setError(submitError.message || `Could not submit ${title.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ minHeight: 'calc(100vh - 100px)', padding: '32px 20px', background: 'linear-gradient(135deg, #e9f7fc 0%, #f4f7ff 100%)' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <button type="button" onClick={() => router.push('/employee/dashboard')} style={{ border: 0, background: 'transparent', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', cursor: 'pointer', padding: '0 0 18px' }}><ArrowLeft size={18} /> Back to Employee App</button>
        <section style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 8px 28px rgba(30, 64, 100, 0.10)', overflow: 'hidden' }}>
          <header style={{ padding: '24px 28px', background: '#fff', borderBottom: '1px solid #e7edf4', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ width: '46px', height: '46px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: '#e7f2ff', color: '#2563eb' }}><FileText size={22} /></span>
            <div><h1 style={{ margin: 0, color: '#172b4d', fontSize: '1.35rem' }}>{title}</h1><p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.9rem' }}>Complete the form below and submit it for your project.</p></div>
          </header>
          <form onSubmit={handleSubmit} style={{ padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {fields}
            {wbsTaskField}
            {type === 'labour' && <section style={{ borderTop: '1px solid #e7edf4', paddingTop: 20, display: 'grid', gap: 12 }}>
              <h2 style={{ margin: 0, color: '#172b4d', fontSize: '1.05rem' }}>Labour from Selected Tasks</h2>
              {labourItems.length ? labourItems.map((item, index) => <div key={item.rowId} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 2fr) 1fr 1fr 1fr', gap: 10, padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                <label style={{ color: '#475569', fontSize: 12 }}>Labour / Task<input readOnly value={`${item.designation} · ${item.taskName}`} style={{ ...inputStyle, marginTop: 5, padding: 9, fontSize: 13 }} /></label>
                <label style={{ color: '#475569', fontSize: 12 }}>Quantity<input type="number" min="1" step="1" value={item.quantity} onChange={event => setLabourItems(previous => previous.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: event.target.value } : row))} style={{ ...inputStyle, marginTop: 5, padding: 9, fontSize: 13 }} /></label>
                <label style={{ color: '#475569', fontSize: 12 }}>Unit<input readOnly value={item.unit} style={{ ...inputStyle, marginTop: 5, padding: 9, fontSize: 13 }} /></label>
                <label style={{ color: '#475569', fontSize: 12 }}>Rate<input type="number" min="0" step="any" value={item.rate} onChange={event => setLabourItems(previous => previous.map((row, rowIndex) => rowIndex === index ? { ...row, rate: event.target.value } : row))} style={{ ...inputStyle, marginTop: 5, padding: 9, fontSize: 13 }} /></label>
              </div>) : <div style={{ color: '#64748b', fontSize: 13 }}>Select WBS tasks with linked labour resources.</div>}
            </section>}
            {type === 'material' && <section style={{ borderTop: '1px solid #e7edf4', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ margin: 0, color: '#172b4d', fontSize: '1.05rem' }}>Item Details</h2>
                <button type="button" onClick={() => setMaterialItems(previous => [...previous, { selectedMaterialId: '', item: '', specification: '', unit: 'Nos', quantity: '', taskName: '' }])} style={{ border: '1px solid #bfdbfe', borderRadius: '8px', color: '#2563eb', background: '#eff6ff', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>+ Add Item</button>
              </div>
              {materialItems.map((item, index) => {
                const chooseMaterial = materialId => {
                  const material = materials.find(entry => entry.id === materialId);
                  setMaterialItems(previous => previous.map((row, rowIndex) => rowIndex === index ? { ...row, selectedMaterialId: materialId, item: material?.name || '', specification: material?.specification || '', unit: material?.unit || row.unit } : row));
                };
                const updateItem = (key, value) => setMaterialItems(previous => previous.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
                return <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}><span style={{ display: 'block', marginBottom: '8px' }}>From Material Library (optional)</span><select value={item.selectedMaterialId} onChange={event => chooseMaterial(event.target.value)} style={inputStyle}><option value="">Choose a material or enter it below</option>{materials.map(material => <option key={material.id} value={material.id}>{material.name}</option>)}</select></label>
                  <label style={{ display: 'block', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}><span style={{ display: 'block', marginBottom: '8px' }}>Item Name *</span><input required value={item.item} onChange={event => updateItem('item', event.target.value)} placeholder="e.g. Transformer" style={inputStyle} /></label>
                  <label style={{ display: 'block', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}><span style={{ display: 'block', marginBottom: '8px' }}>Specification</span><input value={item.specification} onChange={event => updateItem('specification', event.target.value)} placeholder="Size, rating, or other specification" style={inputStyle} /></label>
                  <label style={{ display: 'block', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}><span style={{ display: 'block', marginBottom: '8px' }}>Unit</span><input value={item.unit} onChange={event => updateItem('unit', event.target.value)} placeholder="e.g. Nos" style={inputStyle} /></label>
                  <label style={{ display: 'block', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}><span style={{ display: 'block', marginBottom: '8px' }}>Quantity *</span><input required type="number" min="0.01" step="any" value={item.quantity} onChange={event => updateItem('quantity', event.target.value)} placeholder="Enter quantity" style={inputStyle} /></label>
                  {materialItems.length > 1 && <button type="button" onClick={() => setMaterialItems(previous => previous.filter((_, rowIndex) => rowIndex !== index))} style={{ alignSelf: 'flex-start', border: '1px solid #fecaca', borderRadius: '7px', color: '#b91c1c', background: '#fff', padding: '7px 10px', cursor: 'pointer' }}>Remove item</button>}
                </div>;
              })}
            </section>}
            {error && <div role="alert" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px' }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
              <button type="submit" disabled={saving || loadingProjects || projects.length === 0} style={{ border: 0, borderRadius: '8px', background: saving || loadingProjects || projects.length === 0 ? '#94a3b8' : '#087cff', color: '#fff', padding: '12px 20px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: saving || loadingProjects || projects.length === 0 ? 'not-allowed' : 'pointer' }}><Save size={17} />{saving ? 'Submitting…' : 'Submit Request'}</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
