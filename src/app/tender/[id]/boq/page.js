'use client';
import React, { useState, useEffect, use, useMemo } from 'react';
import { Plus, Trash2, X, PackagePlus, Users, Save, BookOpen } from 'lucide-react';

const DEFAULT_UNITS = ['Nos', 'Rmt', 'Mtr', 'Sqm', 'Cum', 'Kg', 'Ton', 'Lot', 'Bags', 'Manday', 'Hour', 'Point'];

function flattenMaterialGroups(groups, parentPath = '') {
  return (groups || []).flatMap(group => {
    const path = [parentPath, group.name].filter(Boolean).join(' / ');
    const ownItems = (group.materials || []).map(item => ({
      id: item.id,
      sourceGroupId: group.id,
      groupPath: path,
      name: item.name,
      quantity: Number(item.quantity) || 0,
      unit: item.unit || 'Nos',
      rate: Number(item.rate) || 0,
      specification: item.specification || '',
    }));
    return [...ownItems, ...flattenMaterialGroups(group.subgroups, path)];
  });
}

function getMaterialGroupComponents(group) {
  return flattenMaterialGroups([group]);
}

function getResourceComponents(resource) {
  if (Array.isArray(resource.components) && resource.components.length) return resource.components;
  return [{
    id: resource.id || resource.name,
    name: resource.name,
    quantity: resource.quantity ?? 0,
    unit: resource.unit || '',
    rate: resource.rate ?? 0,
    specification: resource.specification || '',
  }];
}

function getSelectedComponents(type, mode, selectedGroupIds, selectedItemIds, catalog) {
  const componentMap = new Map();
  if (mode === 'groups') {
    for (const groupId of selectedGroupIds) {
      const group = catalog.groups.find(item => item.id === groupId);
      if (!group) continue;
      const components = type === 'Material' ? getMaterialGroupComponents(group) : group.components || [];
      components.forEach(component => componentMap.set(component.id, component));
    }
  } else {
    const itemMap = new Map(catalog.items.map(item => [item.id, item]));
    selectedItemIds.forEach(itemId => {
      const item = itemMap.get(itemId);
      if (item) componentMap.set(item.id, item);
    });
  }
  return [...componentMap.values()];
}

export default function TenderBOQ({ params }) {
  const unwrappedParams = use(params);
  const tenderId = unwrappedParams.id;
  const [loading, setLoading] = useState(false);
  const [boqItems, setBoqItems] = useState([]);
  const [expandedItemIds, setExpandedItemIds] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState('');
  const [catalog, setCatalog] = useState({ groups: [], items: [] });
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [resourceSaving, setResourceSaving] = useState(false);
  const [resourceModal, setResourceModal] = useState(null);
  const [resourceMode, setResourceMode] = useState('groups');
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [resourceName, setResourceName] = useState('');
  const [resourceQuantity, setResourceQuantity] = useState('1');
  const [resourceUnit, setResourceUnit] = useState('Nos');
  const [resourceRate, setResourceRate] = useState('0');
  const [rateTouched, setRateTouched] = useState(false);
  const [resourceSpecification, setResourceSpecification] = useState('');
  const [componentEdits, setComponentEdits] = useState({});
  const [taskModalItemId, setTaskModalItemId] = useState(null);
  const [taskLibraryId, setTaskLibraryId] = useState('');
  const [taskLibraryGroups, setTaskLibraryGroups] = useState([]);
  const [taskLibraryLoading, setTaskLibraryLoading] = useState(false);
  const [taskLibraryError, setTaskLibraryError] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [availableUnits, setAvailableUnits] = useState(DEFAULT_UNITS);
  const [newItem, setNewItem] = useState({
    serialNo: '',
    description: '',
    unit: '',
    quantity: '',
    clientRate: '',
    estimatedRate: ''
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [tenderRes, libraryRes, unitsRes] = await Promise.all([
          fetch(`/api/tender/${tenderId}`),
          fetch('/api/libraries'),
          fetch('/api/engineering/unit-library'),
        ]);
        if (!tenderRes.ok) throw new Error('Failed to load tender BOQ.');
        const tenderData = await tenderRes.json();
        const loadedItems = (tenderData.boqItems || []).map(item => ({
          ...item,
          materials: (Array.isArray(item.materials) ? item.materials : []).map(resource => ({
            ...resource,
            components: getResourceComponents(resource),
          })),
          labours: (Array.isArray(item.labours) ? item.labours : []).map(resource => ({
            ...resource,
            components: getResourceComponents(resource),
          })),
        }));
        setBoqItems(loadedItems);
        setExpandedItemIds(loadedItems.map(item => item.id));
        if (libraryRes.ok) {
          const libraryData = await libraryRes.json();
          setLibraries(Array.isArray(libraryData) ? libraryData : []);
          if (Array.isArray(libraryData) && libraryData.length) {
            const electricalLibrary = libraryData.find(library => library.name?.toLowerCase().includes('electrical'));
            setSelectedLibraryId(electricalLibrary?.id || libraryData[0].id);
          }
        } else {
          throw new Error('Failed to load resource libraries.');
        }
        if (unitsRes.ok) {
          const unitsData = await unitsRes.json();
          const unitNames = (Array.isArray(unitsData) ? unitsData : [])
            .map(unit => typeof unit === 'string' ? unit : unit.name)
            .filter(Boolean);
          setAvailableUnits([...new Set([...unitNames, ...DEFAULT_UNITS])]);
        }
      } catch (error) {
        console.error('Failed to load tender BOQ data:', error);
        alert(error.message || 'Failed to load BOQ data.');
      }
    }
    loadData();
  }, [tenderId]);

  useEffect(() => {
    if (!selectedLibraryId) {
      setCatalog({ groups: [], items: [] });
      return;
    }
    let active = true;
    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError('');
      try {
        const [materialRes, labourRes] = await Promise.all([
          fetch(`/api/engineering/material-library?libraryId=${encodeURIComponent(selectedLibraryId)}&resourceType=Material`),
          fetch(`/api/engineering/material-library?libraryId=${encodeURIComponent(selectedLibraryId)}&resourceType=Labour&subgroupsOnly=true`),
        ]);
        if (!materialRes.ok || !labourRes.ok) throw new Error('Could not load materials and labour for this library.');
        const [materialGroups, labourGroups] = await Promise.all([materialRes.json(), labourRes.json()]);
        if (!active) return;
        const groups = resourceModal?.type === 'Labour'
          ? (Array.isArray(labourGroups) ? labourGroups : [])
          : flattenGroupPaths(Array.isArray(materialGroups) ? materialGroups : []);
        const items = resourceModal?.type === 'Labour'
          ? uniqueById((Array.isArray(labourGroups) ? labourGroups : []).flatMap(group => group.components || []))
          : flattenMaterialGroups(Array.isArray(materialGroups) ? materialGroups : []);
        setCatalog({ groups, items });
      } catch (error) {
        if (active) {
          console.error('Failed to load BOQ resource library:', error);
          setCatalogError(error.message || 'Failed to load the resource library.');
          setCatalog({ groups: [], items: [] });
        }
      } finally {
        if (active) setCatalogLoading(false);
      }
    }
    loadCatalog();
    return () => { active = false; };
  }, [selectedLibraryId, resourceModal?.type]);

  useEffect(() => {
    if (!taskModalItemId || !taskLibraryId) {
      setTaskLibraryGroups([]);
      setSelectedTaskId('');
      return;
    }
    let active = true;
    async function loadTaskLibrary() {
      setTaskLibraryLoading(true);
      setTaskLibraryError('');
      try {
        const response = await fetch(`/api/engineering/task-library?libraryId=${encodeURIComponent(taskLibraryId)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load Task Library tasks.');
        if (!active) return;
        const groups = Array.isArray(data) ? data : [];
        setTaskLibraryGroups(groups);
        setSelectedTaskId(groups.flatMap(group => group.tasks || [])[0]?.id || '');
      } catch (error) {
        if (active) {
          console.error('Failed to load BOQ Task Library:', error);
          setTaskLibraryError(error.message || 'Could not load Task Library tasks.');
          setTaskLibraryGroups([]);
        }
      } finally {
        if (active) setTaskLibraryLoading(false);
      }
    }
    loadTaskLibrary();
    return () => { active = false; };
  }, [taskModalItemId, taskLibraryId]);

  const selectedTask = useMemo(
    () => taskLibraryGroups.flatMap(group => group.tasks || []).find(task => task.id === selectedTaskId) || null,
    [taskLibraryGroups, selectedTaskId]
  );

  const selectedComponents = useMemo(
    () => getSelectedComponents(resourceModal?.type, resourceMode, selectedGroupIds, selectedItemIds, catalog),
    [resourceModal?.type, resourceMode, selectedGroupIds, selectedItemIds, catalog]
  );

  useEffect(() => {
    if (!rateTouched) {
      const rate = resourceMode === 'groups' && resourceModal?.type === 'Labour'
        ? selectedGroupIds.reduce((sum, id) => sum + Number(catalog.groups.find(group => group.id === id)?.combinedRate || 0), 0)
        : selectedComponents.reduce((sum, component) => sum + Number(component.rate || 0), 0);
      setResourceRate(String(rate));
      setComponentEdits(Object.fromEntries(selectedComponents.map(component => [
        component.id,
        { quantity: String(component.quantity ?? 0), unit: component.unit || (resourceModal?.type === 'Labour' ? 'Manday' : 'Nos') }
      ])));
      if (!resourceName.trim()) {
        setResourceName(selectedComponents.map(component => component.name).join(' + '));
      }
    }
  }, [catalog, resourceMode, resourceModal?.type, selectedComponents, selectedGroupIds, rateTouched, resourceName]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setNewItem(previous => ({ ...previous, [name]: value }));
  };

  const handleAddItem = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`/api/tender/${tenderId}/boq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add BOQ item.');
      setBoqItems(previous => [...previous, data]);
      setExpandedItemIds(previous => [...previous, data.id]);
      setNewItem({ serialNo: '', description: '', unit: '', quantity: '', clientRate: '', estimatedRate: '' });
    } catch (error) {
      console.error('Failed to add BOQ item:', error);
      alert(error.message || 'Failed to add BOQ item.');
    } finally {
      setLoading(false);
    }
  };

  const openResourceDialog = (item, type) => {
    setResourceModal({ itemId: item.id, type });
    setResourceMode('groups');
    setSelectedGroupIds([]);
    setSelectedItemIds([]);
    setResourceName('');
    setResourceQuantity('1');
    setResourceUnit(type === 'Labour' ? 'Manday' : 'Nos');
    setResourceRate('0');
    setRateTouched(false);
    setResourceSpecification('');
    setComponentEdits({});
  };

  const saveResource = async () => {
    if (!selectedComponents.length) {
      alert(`Select at least one ${resourceModal.type.toLowerCase()} group or item.`);
      return;
    }
    const currentItem = boqItems.find(item => item.id === resourceModal.itemId);
    const field = resourceModal.type === 'Material' ? 'materials' : 'labours';
    const bundle = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: resourceName.trim() || selectedComponents.map(component => component.name).join(' + '),
      mode: resourceMode,
      libraryId: selectedLibraryId,
      groupIds: selectedGroupIds,
      unit: resourceUnit,
      quantity: Number(resourceQuantity),
      rate: Number(resourceRate),
      specification: resourceSpecification.trim(),
      components: selectedComponents.map(component => {
        const edit = componentEdits[component.id] || {};
        return {
          id: component.id,
          sourceGroupId: component.sourceGroupId || null,
          groupPath: component.groupPath || '',
          name: component.name,
          quantity: Number(edit.quantity ?? component.quantity ?? 0),
          unit: edit.unit || component.unit || resourceUnit,
          rate: Number(component.rate || 0),
          specification: component.specification || '',
        };
      }),
    };
    const resources = [...(Array.isArray(currentItem?.[field]) ? currentItem[field] : []), bundle];
    setResourceSaving(true);
    try {
      const response = await fetch(`/api/tender/${tenderId}/boq`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: resourceModal.itemId, resourceType: resourceModal.type, resources }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save BOQ resources.');
      setBoqItems(previous => previous.map(item => item.id === data.id ? {
        ...item,
        [field]: Array.isArray(data[field]) ? data[field] : resources,
      } : item));
      setResourceModal(null);
    } catch (error) {
      console.error('Failed to save BOQ resources:', error);
      alert(error.message || 'Failed to save BOQ resources.');
    } finally {
      setResourceSaving(false);
    }
  };

  const removeResource = async (item, type, resourceId) => {
    const field = type === 'Material' ? 'materials' : 'labours';
    const resources = (Array.isArray(item[field]) ? item[field] : []).filter(resource => resource.id !== resourceId);
    setResourceSaving(true);
    try {
      const response = await fetch(`/api/tender/${tenderId}/boq`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, resourceType: type, resources }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to remove ${type.toLowerCase()}.`);
      setBoqItems(previous => previous.map(row => row.id === data.id ? { ...row, [field]: resources } : row));
    } catch (error) {
      console.error(`Failed to remove BOQ ${type.toLowerCase()}:`, error);
      alert(error.message || `Failed to remove ${type.toLowerCase()}.`);
    } finally {
      setResourceSaving(false);
    }
  };

  const updateResourceComponent = (itemId, type, resourceId, componentId, field, value) => {
    const resourceField = type === 'Material' ? 'materials' : 'labours';
    setBoqItems(previous => previous.map(item => item.id !== itemId ? item : {
      ...item,
      [resourceField]: (item[resourceField] || []).map(resource => resource.id !== resourceId ? resource : {
        ...resource,
        components: getResourceComponents(resource).map(component => component.id !== componentId ? component : {
          ...component,
          [field]: field === 'quantity' ? (value === '' ? '' : Number(value)) : value,
        }),
      }),
    }));
  };

  const saveResourceComponents = async (item, type, resource) => {
    const field = type === 'Material' ? 'materials' : 'labours';
    const resources = (item[field] || []).map(entry => ({
      ...entry,
      components: getResourceComponents(entry).map(component => ({
        ...component,
        quantity: String(component.quantity).trim() === '' ? 0 : Number(component.quantity),
        unit: String(component.unit || '').trim() || entry.unit || (type === 'Material' ? 'Nos' : 'Manday'),
      })),
    }));
    setResourceSaving(true);
    try {
      const response = await fetch(`/api/tender/${tenderId}/boq`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, resourceType: type, resources }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to save ${type.toLowerCase()} breakdown.`);
      setBoqItems(previous => previous.map(row => row.id === item.id ? {
        ...row,
        [field]: Array.isArray(data[field]) ? data[field] : resources,
      } : row));
    } catch (error) {
      console.error(`Failed to save BOQ ${type.toLowerCase()} component quantities and units:`, error);
      alert(error.message || `Failed to save ${type.toLowerCase()} breakdown.`);
    } finally {
      setResourceSaving(false);
    }
  };

  const importTaskResources = async () => {
    const item = boqItems.find(row => row.id === taskModalItemId);
    if (!item || !selectedTask) return;
    const materials = (selectedTask.materials || []).map(material => ({
      id: `task-${selectedTask.id}-${material.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: material.name,
      mode: 'task-library',
      taskLibraryTaskId: selectedTask.id,
      taskLibraryTaskName: selectedTask.name,
      perTaskUnit: true,
      unit: material.unit || 'Nos',
      quantity: Number(material.quantity) || 0,
      rate: Number(material.rate) || 0,
      specification: material.specification || '',
      components: [{
        id: material.id,
        name: material.name,
        quantity: Number(material.quantity) || 0,
        unit: material.unit || 'Nos',
        rate: Number(material.rate) || 0,
        specification: material.specification || '',
      }],
    }));
    const labours = (selectedTask.labours || []).map(labour => ({
      id: `task-${selectedTask.id}-${labour.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: labour.name,
      mode: 'task-library',
      taskLibraryTaskId: selectedTask.id,
      taskLibraryTaskName: selectedTask.name,
      perTaskUnit: true,
      unit: labour.unit || 'Manday',
      quantity: Number(labour.quantity) || 0,
      rate: Number(labour.rate) || 0,
      specification: labour.specification || '',
      components: (Array.isArray(labour.components) ? labour.components : []).map((component, index) => ({
        id: component.sourceId || `${labour.id}-component-${index}`,
        name: component.name || labour.name,
        groupPath: component.groupPath || '',
        quantity: Number(component.quantity) || 0,
        unit: component.unit || labour.unit || 'Manday',
        rate: Number(component.rate) || 0,
        specification: component.specification || '',
      })),
    }));
    if (!materials.length && !labours.length) {
      alert('This Task Library task has no attached materials or labour to import.');
      return;
    }

    setResourceSaving(true);
    try {
      const response = await fetch(`/api/tender/${tenderId}/boq`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          resourceType: 'TaskLibraryImport',
          materials: [...(Array.isArray(item.materials) ? item.materials : []), ...materials],
          labours: [...(Array.isArray(item.labours) ? item.labours : []), ...labours],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to import Task Library resources.');
      setBoqItems(previous => previous.map(row => row.id === item.id ? {
        ...row,
        materials: Array.isArray(data.materials) ? data.materials : [...(item.materials || []), ...materials],
        labours: Array.isArray(data.labours) ? data.labours : [...(item.labours || []), ...labours],
      } : row));
      setTaskModalItemId(null);
    } catch (error) {
      console.error('Failed to import Task Library resources into BOQ:', error);
      alert(error.message || 'Failed to import Task Library resources.');
    } finally {
      setResourceSaving(false);
    }
  };

  const toggleSelection = (id, current, setter) => setter(current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const formatCurrency = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const resourceAmount = (resource, boqQuantity) =>
    Number(resource.quantity || 0) * Number(resource.rate || 0) * (resource.perTaskUnit ? boqQuantity : 1);
  const totals = boqItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    acc.clientTotal += qty * (Number(item.clientRate) || 0);
    acc.estTotal += qty * (Number(item.estimatedRate) || 0);
    acc.resourceTotal += [...(item.materials || []), ...(item.labours || [])]
      .reduce((sum, resource) => sum + resourceAmount(resource, qty), 0);
    return acc;
  }, { clientTotal: 0, estTotal: 0, resourceTotal: 0 });

  const activeResourceComponents = selectedComponents;

  return (
    <div className="tnd-card">
      <div className="tnd-card-header">
        <h2 className="tnd-card-title">Bill of Quantities (BOQ)</h2>
      </div>

      <div className="tnd-table-wrapper tnd-mb-6">
        <table className="tnd-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Sr.</th>
              <th>Description</th>
              <th style={{ width: '80px' }}>Unit</th>
              <th style={{ width: '100px' }} className="tnd-text-right">Qty</th>
              <th style={{ width: '120px' }} className="tnd-text-right">Client Rate</th>
              <th style={{ width: '120px' }} className="tnd-text-right">Est. Rate</th>
              <th style={{ width: '140px' }} className="tnd-text-right">Client Amount</th>
              <th style={{ width: '140px' }} className="tnd-text-right">Est. Amount</th>
            </tr>
          </thead>
          <tbody>
            {boqItems.map((item, index) => {
              const qty = Number(item.quantity) || 0;
              const clientRate = Number(item.clientRate) || 0;
              const estimatedRate = Number(item.estimatedRate) || 0;
              const materials = Array.isArray(item.materials) ? item.materials : [];
              const labours = Array.isArray(item.labours) ? item.labours : [];
              const resourceTotal = [...materials, ...labours]
                .reduce((sum, resource) => sum + resourceAmount(resource, qty), 0);
              const expanded = expandedItemIds.includes(item.id);
              const materialCount = materials.reduce((count, resource) => count + getResourceComponents(resource).length, 0);
              const labourCount = labours.reduce((count, resource) => count + getResourceComponents(resource).length, 0);
              return (
                <React.Fragment key={item.id}>
                  <tr>
                    <td>{item.serialNo || index + 1}</td>
                    <td>{item.description}</td>
                    <td>{item.unit}</td>
                    <td className="tnd-text-right">{qty}</td>
                    <td className="tnd-text-right">{formatCurrency(clientRate)}</td>
                    <td className="tnd-text-right">{formatCurrency(estimatedRate)}</td>
                    <td className="tnd-text-right">{formatCurrency(qty * clientRate)}</td>
                    <td className="tnd-text-right tnd-font-semibold">{formatCurrency(qty * estimatedRate)}</td>
                  </tr>
                  <tr>
                    <td colSpan="8" style={{ backgroundColor: '#f8fafc', padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <strong>Task resources</strong>
                          <span style={{ marginLeft: 12, color: '#475569' }}>
                            {materialCount} material{materialCount === 1 ? '' : 's'} · {labourCount} labour item{labourCount === 1 ? '' : 's'} · Resource cost {formatCurrency(resourceTotal)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="tnd-btn" onClick={() => {
                            setTaskLibraryId(selectedLibraryId);
                            setTaskModalItemId(item.id);
                          }}>
                            <BookOpen size={15} /> Add from Task Library
                          </button>
                          <button type="button" className="tnd-btn" onClick={() => openResourceDialog(item, 'Material')}>
                            <PackagePlus size={15} /> Add Material
                          </button>
                          <button type="button" className="tnd-btn" onClick={() => openResourceDialog(item, 'Labour')}>
                            <Users size={15} /> Add Labour
                          </button>
                          <button type="button" className="tnd-btn" onClick={() => setExpandedItemIds(previous => (
                            expanded ? previous.filter(id => id !== item.id) : [...previous, item.id]
                          ))}>
                            {expanded ? 'Hide details' : 'View details'}
                          </button>
                        </div>
                      </div>
                      {expanded && (
                        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                          {[['Material', materials], ['Labour', labours]].map(([type, resources]) => (
                            <div key={type}>
                              <strong>{type}</strong>
                              {!resources.length && <span style={{ marginLeft: 10, color: '#64748b' }}>None added</span>}
                              {resources.map(resource => (
                                <div key={resource.id} style={{ marginTop: 8, padding: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <div>
                                      <strong>{resource.name}</strong>
                                      <span style={{ marginLeft: 10 }}>
                                        {resource.quantity} {resource.unit} × {formatCurrency(resource.rate)}
                                        {resource.perTaskUnit ? ` per BOQ unit × ${qty}` : ''}
                                        {' = '}{formatCurrency(resourceAmount(resource, qty))}
                                      </span>
                                      {resource.taskLibraryTaskName && <div style={{ color: '#64748b', marginTop: 3 }}>Task Library: {resource.taskLibraryTaskName}</div>}
                                      {resource.specification && <div style={{ color: '#64748b', marginTop: 3 }}>{resource.specification}</div>}
                                    </div>
                                    <button type="button" title={`Remove ${type.toLowerCase()}`} disabled={resourceSaving} className="tnd-btn" onClick={() => removeResource(item, type, resource.id)}>
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                  {getResourceComponents(resource).length > 0 && (
                                    <div style={{ marginTop: 10, padding: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <strong style={{ fontSize: 13 }}>Individual {type.toLowerCase()} quantity and unit</strong>
                                        <button
                                          type="button"
                                          className="tnd-btn"
                                          disabled={resourceSaving}
                                          onClick={() => saveResourceComponents(item, type, resource)}
                                        >
                                          <Save size={14} /> Save details
                                        </button>
                                      </div>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) 110px 120px 130px', gap: 8, alignItems: 'center', color: '#64748b', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                                        <span>ITEM</span><span>QUANTITY</span><span>UNIT</span><span className="tnd-text-right">RATE / UNIT</span>
                                      </div>
                                      {getResourceComponents(resource).map(component => (
                                        <div key={component.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) 110px 120px 130px', gap: 8, alignItems: 'center', marginTop: 6 }}>
                                          <span style={{ fontSize: 13, color: '#334155' }}>
                                            {component.name}
                                            {component.groupPath && <small style={{ display: 'block', color: '#64748b' }}>{component.groupPath}</small>}
                                          </span>
                                          <input
                                            aria-label={`${component.name} quantity`}
                                            type="number"
                                            min="0"
                                            step="any"
                                            className="tnd-input"
                                            value={component.quantity ?? 0}
                                            onChange={event => updateResourceComponent(item.id, type, resource.id, component.id, 'quantity', event.target.value)}
                                          />
                                          <input
                                            aria-label={`${component.name} unit`}
                                            className="tnd-input"
                                            value={component.unit || resource.unit || (type === 'Material' ? 'Nos' : 'Manday')}
                                            onChange={event => updateResourceComponent(item.id, type, resource.id, component.id, 'unit', event.target.value)}
                                          />
                                          <span className="tnd-text-right" style={{ fontSize: 13 }}>
                                            {formatCurrency(component.rate)} / {component.unit || resource.unit || (type === 'Material' ? 'Nos' : 'Manday')}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
            {boqItems.length === 0 && (
              <tr><td colSpan="8" className="tnd-text-center tnd-text-muted tnd-py-4">No BOQ items added yet.</td></tr>
            )}
          </tbody>
          {boqItems.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                <td colSpan="6" className="tnd-text-right">Total:</td>
                <td className="tnd-text-right">{formatCurrency(totals.clientTotal)}</td>
                <td className="tnd-text-right tnd-text-indigo-600">{formatCurrency(totals.estTotal)}</td>
              </tr>
              <tr style={{ backgroundColor: '#f0fdf4', fontWeight: 'bold' }}>
                <td colSpan="6" className="tnd-text-right">Materials + Labour Resource Cost:</td>
                <td colSpan="2" className="tnd-text-right">{formatCurrency(totals.resourceTotal)}</td>
              </tr>
              <tr style={{ backgroundColor: '#eff6ff', fontWeight: 'bold' }}>
                <td colSpan="6" className="tnd-text-right">Gross Margin:</td>
                <td colSpan="2" className="tnd-text-right tnd-text-emerald-600">
                  {formatCurrency(totals.clientTotal - totals.estTotal)}
                  <span className="tnd-text-sm tnd-ml-2">
                    ({totals.clientTotal > 0 ? ((totals.clientTotal - totals.estTotal) / totals.clientTotal * 100).toFixed(2) : 0}%)
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 className="tnd-font-semibold tnd-mb-4">Add BOQ Item</h3>
        <form onSubmit={handleAddItem} className="tnd-flex tnd-items-end" style={{ gap: '12px' }}>
          <div className="tnd-form-group" style={{ width: '80px' }}>
            <label className="tnd-label">Sr No.</label>
            <input type="text" name="serialNo" value={newItem.serialNo} onChange={handleChange} className="tnd-input" />
          </div>
          <div className="tnd-form-group tnd-flex-1">
            <label className="tnd-label">Description *</label>
            <input type="text" name="description" required value={newItem.description} onChange={handleChange} className="tnd-input" />
          </div>
          <div className="tnd-form-group" style={{ width: '80px' }}>
            <label className="tnd-label">Unit</label>
            <input type="text" name="unit" value={newItem.unit} onChange={handleChange} className="tnd-input" />
          </div>
          <div className="tnd-form-group" style={{ width: '100px' }}>
            <label className="tnd-label">Qty *</label>
            <input type="number" step="any" name="quantity" required value={newItem.quantity} onChange={handleChange} className="tnd-input" />
          </div>
          <div className="tnd-form-group" style={{ width: '120px' }}>
            <label className="tnd-label">Client Rate</label>
            <input type="number" step="any" name="clientRate" value={newItem.clientRate} onChange={handleChange} className="tnd-input" />
          </div>
          <div className="tnd-form-group" style={{ width: '120px' }}>
            <label className="tnd-label">Est. Rate *</label>
            <input type="number" step="any" name="estimatedRate" required value={newItem.estimatedRate} onChange={handleChange} className="tnd-input" />
          </div>
          <div className="tnd-form-group">
            <button type="submit" disabled={loading} className="tnd-btn tnd-btn-primary" style={{ padding: '8px 16px', height: '42px' }}>
              <Plus size={16} /> Add
            </button>
          </div>
        </form>
      </div>

      {resourceModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="boq-resource-title" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, .55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <div style={{ width: 'min(900px, 100%)', maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 id="boq-resource-title" style={{ margin: 0 }}>Add {resourceModal.type} to BOQ Task</h3>
              <button type="button" className="tnd-btn" aria-label="Close dialog" onClick={() => setResourceModal(null)}><X size={18} /></button>
            </div>
            <div className="tnd-form-group">
              <label className="tnd-label">Resource Library</label>
              <select className="tnd-input" value={selectedLibraryId} onChange={event => {
                setSelectedLibraryId(event.target.value);
                setSelectedGroupIds([]);
                setSelectedItemIds([]);
                setResourceName('');
              }}>
                {libraries.map(library => <option key={library.id} value={library.id}>{library.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, margin: '14px 0' }}>
              <button type="button" className={`tnd-btn ${resourceMode === 'groups' ? 'tnd-btn-primary' : ''}`} onClick={() => {
                setResourceMode('groups'); setSelectedGroupIds([]); setSelectedItemIds([]); setResourceName(''); setRateTouched(false);
              }}>Combined Group</button>
              <button type="button" className={`tnd-btn ${resourceMode === 'individual' ? 'tnd-btn-primary' : ''}`} onClick={() => {
                setResourceMode('individual'); setSelectedGroupIds([]); setSelectedItemIds([]); setResourceName(''); setRateTouched(false);
              }}>Individual {resourceModal.type}</button>
            </div>
            <div style={{ maxHeight: 230, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
              {catalogLoading && <div>Loading {resourceModal.type.toLowerCase()} library…</div>}
              {!catalogLoading && catalogError && <div role="alert" style={{ color: '#b91c1c' }}>{catalogError}</div>}
              {!catalogLoading && !catalogError && resourceMode === 'groups' && catalog.groups.map(group => (
                <label key={group.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 4px', borderBottom: '1px solid #f1f5f9' }}>
                  <input type="checkbox" checked={selectedGroupIds.includes(group.id)} onChange={() => {
                    toggleSelection(group.id, selectedGroupIds, setSelectedGroupIds);
                    setRateTouched(false);
                    setResourceName('');
                  }} />
                  <span style={{ flex: 1 }}>
                    <strong>{group.name}</strong>
                    {group.parent?.name && <span style={{ marginLeft: 6, color: '#64748b' }}>({group.parent.name})</span>}
                    <span style={{ marginLeft: 8, color: '#64748b' }}>
                      {resourceModal.type === 'Labour'
                        ? `${group.combinedUnit || 'Manday'} · ${formatCurrency(group.combinedRate)}`
                        : `${(group.components || getMaterialGroupComponents(group)).length} items`}
                    </span>
                  </span>
                </label>
              ))}
              {!catalogLoading && !catalogError && resourceMode === 'individual' && catalog.items.map(item => (
                <label key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 4px', borderBottom: '1px solid #f1f5f9' }}>
                  <input type="checkbox" checked={selectedItemIds.includes(item.id)} onChange={() => {
                    toggleSelection(item.id, selectedItemIds, setSelectedItemIds);
                    setRateTouched(false);
                    setResourceName('');
                  }} />
                  <span style={{ flex: 1 }}>
                    <strong>{item.name}</strong>
                    <span style={{ marginLeft: 8, color: '#64748b' }}>{item.groupPath} · {item.unit} · {formatCurrency(item.rate)}</span>
                    {item.specification && <span style={{ display: 'block', marginLeft: 24, color: '#64748b' }}>{item.specification}</span>}
                  </span>
                </label>
              ))}
              {!catalogLoading && !catalogError && catalog.groups.length === 0 && resourceMode === 'groups' && <div>No {resourceModal.type.toLowerCase()} groups found in this library.</div>}
              {!catalogLoading && !catalogError && catalog.items.length === 0 && resourceMode === 'individual' && <div>No individual {resourceModal.type.toLowerCase()} items found in this library.</div>}
            </div>
            {activeResourceComponents.length > 0 && (
              <>
                <h4 style={{ margin: '16px 0 8px' }}>Selected components</h4>
                <div style={{ maxHeight: 190, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
                  {activeResourceComponents.map(component => {
                    const edit = componentEdits[component.id] || {};
                    return (
                      <div key={component.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) 100px 110px 110px', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span>{component.name}<small style={{ display: 'block', color: '#64748b' }}>{component.groupPath}</small></span>
                        <input aria-label={`${component.name} quantity`} type="number" min="0" step="any" className="tnd-input" value={edit.quantity ?? component.quantity ?? 0} onChange={event => setComponentEdits(previous => ({ ...previous, [component.id]: { ...previous[component.id], quantity: event.target.value } }))} />
                        <input aria-label={`${component.name} unit`} className="tnd-input" list="boq-resource-units" value={edit.unit ?? component.unit ?? resourceUnit} onChange={event => setComponentEdits(previous => ({ ...previous, [component.id]: { ...previous[component.id], unit: event.target.value } }))} />
                        <span className="tnd-text-right">{formatCurrency(component.rate)}</span>
                      </div>
                    );
                  })}
                </div>
                <datalist id="boq-resource-units">{availableUnits.map(unit => <option key={unit} value={unit} />)}</datalist>
              </>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, marginTop: 14 }}>
              <div className="tnd-form-group">
                <label className="tnd-label">Task / Group Name</label>
                <input className="tnd-input" value={resourceName} onChange={event => setResourceName(event.target.value)} />
              </div>
              <div className="tnd-form-group">
                <label className="tnd-label">Quantity</label>
                <input className="tnd-input" type="number" min="0" step="any" value={resourceQuantity} onChange={event => setResourceQuantity(event.target.value)} />
              </div>
              <div className="tnd-form-group">
                <label className="tnd-label">Unit</label>
                <input className="tnd-input" list="boq-resource-units" value={resourceUnit} onChange={event => setResourceUnit(event.target.value)} />
              </div>
              <div className="tnd-form-group">
                <label className="tnd-label">Rate</label>
                <input className="tnd-input" type="number" min="0" step="any" value={resourceRate} onChange={event => { setResourceRate(event.target.value); setRateTouched(true); }} />
              </div>
            </div>
            <div className="tnd-form-group" style={{ marginTop: 8 }}>
              <label className="tnd-label">Specification</label>
              <input className="tnd-input" value={resourceSpecification} onChange={event => setResourceSpecification(event.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="tnd-btn" onClick={() => setResourceModal(null)}>Cancel</button>
              <button type="button" className="tnd-btn tnd-btn-primary" disabled={resourceSaving || catalogLoading || !activeResourceComponents.length} onClick={saveResource}>
                <Save size={16} /> {resourceSaving ? 'Saving…' : `Add ${resourceModal.type}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {taskModalItemId && (
        <div role="dialog" aria-modal="true" aria-labelledby="boq-task-title" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, .55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <div style={{ width: 'min(760px, 100%)', maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 id="boq-task-title" style={{ margin: 0 }}>Add Task Library Resources to BOQ</h3>
              <button type="button" className="tnd-btn" aria-label="Close dialog" onClick={() => setTaskModalItemId(null)}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="tnd-form-group">
                <label className="tnd-label">Task Library</label>
                <select className="tnd-input" value={taskLibraryId} onChange={event => setTaskLibraryId(event.target.value)}>
                  {libraries.map(library => <option key={library.id} value={library.id}>{library.name}</option>)}
                </select>
              </div>
              <div className="tnd-form-group">
                <label className="tnd-label">Task</label>
                <select className="tnd-input" value={selectedTaskId} onChange={event => setSelectedTaskId(event.target.value)} disabled={taskLibraryLoading || !taskLibraryGroups.length}>
                  {taskLibraryGroups.map(group => (
                    <optgroup key={group.id} label={group.name}>
                      {(group.tasks || []).map(task => <option key={task.id} value={task.id}>{task.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
            {taskLibraryLoading && <div style={{ color: '#475569', padding: '12px 0' }}>Loading Task Library…</div>}
            {!taskLibraryLoading && taskLibraryError && <div role="alert" style={{ color: '#b91c1c', padding: '12px 0' }}>{taskLibraryError}</div>}
            {!taskLibraryLoading && !taskLibraryError && !taskLibraryGroups.some(group => (group.tasks || []).length) && (
              <div style={{ color: '#64748b', padding: '12px 0' }}>No tasks found in this library.</div>
            )}
            {selectedTask && (
              <div style={{ marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: 12, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <strong>{selectedTask.name}</strong>
                  <span style={{ marginLeft: 8, color: '#64748b' }}>{selectedTask.unit || 'Task'}</span>
                  {selectedTask.description && <div style={{ color: '#64748b', marginTop: 4 }}>{selectedTask.description}</div>}
                </div>
                {[['Materials', selectedTask.materials || []], ['Labour', selectedTask.labours || []]].map(([label, resources]) => (
                  <div key={label} style={{ padding: 12, borderBottom: label === 'Materials' ? '1px solid #e2e8f0' : 0 }}>
                    <strong>{label} ({resources.length})</strong>
                    {!resources.length && <span style={{ marginLeft: 8, color: '#64748b' }}>None attached</span>}
                    {resources.map((resource, index) => (
                      <div key={resource.id || `${label}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8, color: '#334155' }}>
                        <span>{resource.name} · {Number(resource.quantity) || 0} {resource.unit || ''}</span>
                        <span>{formatCurrency(resource.rate)} / {resource.unit || 'unit'}</span>
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{ padding: 12, background: '#f0fdf4', fontWeight: 600, textAlign: 'right' }}>
                  Cost per BOQ unit: {formatCurrency([
                    ...(selectedTask.materials || []),
                    ...(selectedTask.labours || []),
                  ].reduce((sum, resource) => sum + (Number(resource.quantity) || 0) * (Number(resource.rate) || 0), 0))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="tnd-btn" onClick={() => setTaskModalItemId(null)}>Cancel</button>
              <button
                type="button"
                className="tnd-btn tnd-btn-primary"
                disabled={resourceSaving || taskLibraryLoading || !selectedTask || !(selectedTask.materials || []).length && !(selectedTask.labours || []).length}
                onClick={importTaskResources}
              >
                <BookOpen size={16} /> {resourceSaving ? 'Adding…' : 'Add Task Resources'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function uniqueById(items) {
  return [...new Map(items.map(item => [item.id, item])).values()];
}

function flattenGroupPaths(groups, parent = null, path = '') {
  return (groups || []).flatMap(group => {
    const currentPath = [path, group.name].filter(Boolean).join(' / ');
    const components = getMaterialGroupComponents(group).map(item => ({ ...item, groupPath: item.groupPath || currentPath }));
    return [{
      ...group,
      parent: group.parent || (parent ? { name: parent.name } : null),
      components,
    }, ...flattenGroupPaths(group.subgroups, group, currentPath)];
  });
}
