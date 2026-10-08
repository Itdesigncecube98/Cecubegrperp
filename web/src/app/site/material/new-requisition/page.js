'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { ArrowLeft, PackageSearch, Save } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

function flattenMaterials(groups, output = []) {
  (groups || []).forEach(group => {
    (group.materials || []).forEach(material => output.push(material));
    flattenMaterials(group.subgroups, output);
  });
  return output;
}

function flattenLibraryTasks(groups, output = []) {
  (groups || []).forEach(group => {
    (group.tasks || []).forEach(task => output.push({ ...task, source: 'library' }));
  });
  return output;
}

function RequisitionFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const copyFrom = searchParams.get('copyFrom');
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [units, setUnits] = useState([]);
  const [items, setItems] = useState([{ materialName: '', unit: 'Nos', quantityReq: '', poRate: '' }]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '', taskId: '', activityId: '', taskName: '', materialName: '', unit: 'Nos',
    quantityReq: '', poRate: '', reqNo: '', reqDate: new Date().toISOString().split('T')[0], status: 'Pending'
  });

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [projectResponse, unitResponse] = await Promise.all([
          fetch('/api/engineering/projects'),
          fetch('/api/engineering/unit-library')
        ]);
        if (projectResponse.ok) setProjects(await projectResponse.json());
        if (unitResponse.ok) {
          const data = await unitResponse.json();
          setUnits(Array.isArray(data) ? data.map(unit => unit.name).filter(Boolean) : []);
        }
      } catch (error) {
        console.error('Failed to load requisition master data', error);
      }
    }
    loadMasterData();
  }, []);

  useEffect(() => {
    if (!formData.projectId) { setMaterials([]); return; }
    fetch(`/api/engineering/material-library?resourceType=Material&projectId=${encodeURIComponent(formData.projectId)}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : [])
      .then(groups => setMaterials(flattenMaterials(Array.isArray(groups) ? groups : [])))
      .catch(() => setMaterials([]));
  }, [formData.projectId]);

  useEffect(() => {
    if (!formData.projectId) {
      return;
    }
    void (async () => {
      try {
        const [activityResponse, libraryResponse] = await Promise.all([
          fetch(`/api/engineering/activities?projectId=${formData.projectId}`),
          fetch(`/api/engineering/task-library?projectId=${formData.projectId}`)
        ]);
        const activities = activityResponse.ok ? await activityResponse.json() : [];
        const libraryGroups = libraryResponse.ok ? await libraryResponse.json() : [];
        const activityTasks = (Array.isArray(activities) ? activities : []).map(task => ({ ...task, source: 'activity' }));
        setTasks([...flattenLibraryTasks(libraryGroups), ...activityTasks]);
      } catch {
        setTasks([]);
      }
    })();
  }, [formData.projectId]);

  useEffect(() => {
    const sourceId = editId || copyFrom;
    if (!sourceId) return;
    fetch(`/api/engineering/requisitions?id=${sourceId}`)
      .then(response => response.ok ? response.json() : [])
      .then(data => {
        const req = Array.isArray(data) ? data[0] : null;
        if (req) setFormData({
          projectId: req.projectId || '', taskId: '', activityId: req.activityId || '', taskName: req.taskName || req.activity?.name || '',
          materialName: req.materialName || req.itemDescription || '', unit: req.unit || 'Nos', quantityReq: req.quantityReq ?? '',
          poRate: req.poRate ?? '', reqNo: copyFrom ? '' : req.reqNo || '', reqDate: copyFrom ? new Date().toISOString().split('T')[0] : req.reqDate ? new Date(req.reqDate).toISOString().split('T')[0] : '', status: copyFrom ? 'Pending' : req.status || 'Pending'
        });
        if (req) setItems([{ materialName: req.materialName || req.itemDescription || '', unit: req.unit || 'Nos', quantityReq: req.quantityReq ?? '', poRate: req.poRate ?? '' }]);
      })
      .catch(error => console.error('Failed to load requisition', error));
  }, [editId, copyFrom]);

  const updateForm = (field, value) => setFormData(previous => ({ ...previous, [field]: value }));

  const handleTaskChange = (value) => {
    const task = tasks.find(item => item.id === value);
    setFormData(previous => ({
      ...previous,
      taskId: value,
      activityId: task?.source === 'activity' ? value : '',
      taskName: task?.name || ''
    }));
  };

  const updateItem = (index, field, value) => {
    setItems(previous => previous.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const handleMaterialChange = (index, value) => {
    const material = materials.find(item => item.name === value);
    updateItem(index, 'materialName', value);
    if (material?.unit) updateItem(index, 'unit', material.unit);
  };

  const addItem = () => setItems(previous => [...previous, { materialName: '', unit: 'Nos', quantityReq: '', poRate: '' }]);
  const removeItem = (index) => setItems(previous => previous.length > 1 ? previous.filter((_, itemIndex) => itemIndex !== index) : previous);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const firstItem = items[0] || {};
      const response = await fetch('/api/engineering/requisitions', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, ...firstItem, id: editId || undefined, items })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save requisition');
      }
      router.push('/site/material');
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}><PackageSearch size={22} style={{ verticalAlign: 'middle', marginRight: '8px' }} />{editId ? 'Edit Material Requisition' : copyFrom ? 'Send Material Request Again' : 'Raise Material Requisition'}</h1>
        <button type="button" onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}><ArrowLeft size={16} /> Back</button>
      </div>

      <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
          <div><label style={labelStyle}>Project *</label><select required value={formData.projectId} onChange={event => setFormData(previous => ({ ...previous, projectId: event.target.value, taskId: '', activityId: '', taskName: '' }))} style={inputStyle}><option value="">-- Select Engineering Project --</option>{projects.map(project => <option key={project.id} value={project.id}>{project.projectId} - {project.name}</option>)}</select></div>
          <div><label style={labelStyle}>Task Name</label><select value={formData.taskId} onChange={event => handleTaskChange(event.target.value)} style={inputStyle}><option value="">-- Select Task --</option>{tasks.filter(task => task.source === 'library').length > 0 && <optgroup label="Project Task Library">{tasks.filter(task => task.source === 'library').map(task => <option key={`library-${task.id}`} value={task.id}>{task.name}</option>)}</optgroup>}{tasks.filter(task => task.source === 'activity').length > 0 && <optgroup label="Project Activities">{tasks.filter(task => task.source === 'activity').map(task => <option key={`activity-${task.id}`} value={task.id}>{task.name}</option>)}</optgroup>}</select></div>
          <div><label style={labelStyle}>Req ID</label><input value={formData.reqNo} onChange={event => updateForm('reqNo', event.target.value)} placeholder="Auto-generated if blank" style={inputStyle} /></div>
          <div><label style={labelStyle}>Req Date *</label><input required type="date" value={formData.reqDate} onChange={event => updateForm('reqDate', event.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Status</label><select value={formData.status} onChange={event => updateForm('status', event.target.value)} style={inputStyle}><option>Pending</option><option>Approved</option><option>Issued</option><option>Partially Issued</option><option>Rejected</option></select></div>
        </div>
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div><h2 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>Material Requirements</h2><p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.78rem' }}>Add multiple materials for this task.</p></div>
            <button type="button" onClick={addItem} style={{ border: '1px solid #7c3aed', color: '#6d28d9', background: '#f5f3ff', borderRadius: '7px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>+ Add Material</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map((item, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div><label style={labelStyle}>Material *</label><select required value={item.materialName} onChange={event => handleMaterialChange(index, event.target.value)} style={inputStyle}><option value="">-- Select Material --</option>{materials.map(material => <option key={material.id} value={material.name}>{material.name}</option>)}</select></div>
                <div><label style={labelStyle}>Unit *</label><select required value={item.unit} onChange={event => updateItem(index, 'unit', event.target.value)} style={inputStyle}><option value="">-- Unit --</option>{[...new Set(['Nos', ...units])].map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></div>
                <div><label style={labelStyle}>Quantity *</label><input required min="0" step="any" type="number" value={item.quantityReq} onChange={event => updateItem(index, 'quantityReq', event.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>PO Rate</label><input min="0" step="any" type="number" value={item.poRate} onChange={event => updateItem(index, 'poRate', event.target.value)} style={inputStyle} /></div>
                <button type="button" onClick={() => removeItem(index)} disabled={items.length === 1} style={{ height: '38px', border: '1px solid #fecaca', color: '#dc2626', background: '#fff1f2', borderRadius: '6px', cursor: items.length === 1 ? 'not-allowed' : 'pointer', opacity: items.length === 1 ? 0.45 : 1 }}>×</button>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}><button disabled={saving} type="submit" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#7c3aed', color: '#fff', padding: '9px 18px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}><Save size={16} />{saving ? 'Saving...' : editId ? 'Update Requisition' : copyFrom ? 'Send Request' : 'Raise Requisition'}</button></div>
      </form>
    </div>
  );
}

export default function NewRequisition() {
  return <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>}><RequisitionFormContent /></Suspense>;
}
