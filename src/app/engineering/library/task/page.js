'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, ChevronRight, ChevronDown, Home, Folder, FolderOpen, 
  Trash2, Edit3, Package, Users, FileText, Check, X, Loader2, 
  Layers, ArrowLeft, RefreshCw, AlertCircle, Info, Sparkles, Hash
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function TaskLibrary() {
  // State for Libraries
  const [libraries, setLibraries] = useState([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingLibraries, setLoadingLibraries] = useState(true);

  // State for Unit Library suggestions
  const [availableUnits, setAvailableUnits] = useState([]);
  // State for Master Library Resources (Materials, Equipments, Labours)
  const [masterResources, setMasterResources] = useState({ material: [], equipment: [], labour: [] });

  // Fetch Master Resources to populate dropdowns
  const fetchMasterResources = async (libId, projectId) => {
    if (!libId) return;
    try {
      const fetchType = async (type) => {
        const scope = projectId
          ? `projectId=${encodeURIComponent(projectId)}`
          : `libraryId=${encodeURIComponent(libId)}`;
        const res = await fetch(`/api/engineering/material-library?${scope}&resourceType=${encodeURIComponent(type)}`, { cache: 'no-store' });
        if (res.ok) {
          const groups = await res.json();
          // Flatten items from groups and subgroups
          const items = [];
          const extractItems = (groupList) => {
            for (const g of groupList) {
              if (g.materials) items.push(...g.materials);
              if (g.subgroups) extractItems(g.subgroups);
            }
          };
          extractItems(groups);
          return items;
        }
        return [];
      };

      const [materials, equipments, labours] = await Promise.all([
        fetchType('Material'),
        fetchType('Equipment'),
        fetchType('Labour')
      ]);

      setMasterResources({
        material: materials,
        equipment: equipments,
        labour: labours
      });
    } catch (err) {
      console.error('Error fetching master resources:', err);
    }
  };

  // State for Groups and Hierarchy
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected entities for detail view
  // selectedGroupId: string | null
  // selectedTaskId: string | null
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Active tab in task view: 'materials' | 'labours'
  const [activeTab, setActiveTab] = useState('materials');

  // Expanded group IDs in tree
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());

  // Modals state
  const [groupModal, setGroupModal] = useState({ open: false, mode: 'create', data: null });
  const [taskModal, setTaskModal] = useState({ open: false, mode: 'create', groupId: '', data: null });
  const [materialModal, setMaterialModal] = useState({ open: false, mode: 'create', taskId: '', data: null });
  const [labourModal, setLabourModal] = useState({ open: false, mode: 'create', taskId: '', data: null });
  const [equipmentModal, setEquipmentModal] = useState({ open: false, mode: 'create', taskId: '', data: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: '', id: '', title: '', message: '' });

  // Saving indicator
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch available libraries & units on mount
  useEffect(() => {
    fetchLibraries();
    fetchUnits();
    fetch('/api/projects').then(res => res.ok ? res.json() : []).then(data => setProjects(Array.isArray(data) ? data : [])).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    const project = projects.find(item => item.id === selectedProjectId);
    const linkedLibrary = libraries.find(item => item.name?.trim().toLowerCase() === project?.library?.trim().toLowerCase());
    if (linkedLibrary && linkedLibrary.id !== selectedLibraryId) setSelectedLibraryId(linkedLibrary.id);
  }, [selectedProjectId, projects, libraries, selectedLibraryId]);

  // 2. Fetch groups whenever selectedLibraryId changes
  useEffect(() => {
    if (selectedLibraryId) {
      fetchGroups(selectedLibraryId);
      fetchMasterResources(selectedLibraryId, selectedProjectId);
    } else {
      setGroups([]);
      setSelectedGroupId(null);
      setSelectedTaskId(null);
      setMasterResources({ material: [], equipment: [], labour: [] });
    }
  }, [selectedLibraryId, selectedProjectId]);

  const fetchLibraries = async () => {
    try {
      setLoadingLibraries(true);
      const res = await fetch('/api/libraries');
      if (res.ok) {
        const data = await res.json();
        setLibraries(data || []);
        if (Array.isArray(data) && data.length > 0) {
          // Default to "electrical work library" if available, else first library
          const electricalLib = data.find(l => l.name?.toLowerCase().includes('electrical'));
          if (electricalLib) {
            setSelectedLibraryId(electricalLib.id);
          } else {
            setSelectedLibraryId(data[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load libraries:', err);
      showToast('Failed to load libraries', 'error');
    } finally {
      setLoadingLibraries(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/engineering/unit-library');
      if (res.ok) {
        const data = await res.json();
        const unitNames = (Array.isArray(data) ? data : [])
          .map(u => typeof u === 'string' ? u : u.name)
          .filter(Boolean);
        // Combine with standard construction units
        const combined = Array.from(new Set([
          ...unitNames,
          'Rmt', 'Mtr', 'Nos', 'Sqm', 'Cum', 'Kg', 'Ton', 'Lot', 'Bags', 'Manday', 'Hour', 'Point'
        ]));
        setAvailableUnits(combined);
      }
    } catch (e) {
      // Fallback defaults
      setAvailableUnits(['Rmt', 'Mtr', 'Nos', 'Sqm', 'Cum', 'Kg', 'Ton', 'Lot', 'Bags', 'Manday', 'Hour', 'Point']);
    }
  };

  const fetchGroups = async (libId) => {
    try {
      setLoadingGroups(true);
      const res = await fetch(`/api/engineering/task-library?libraryId=${libId}${selectedProjectId ? `&projectId=${selectedProjectId}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        const loadedGroups = Array.isArray(data) ? data : [];
        setGroups(loadedGroups);

        // Auto-expand all groups by default
        const allIds = new Set(loadedGroups.map(g => g.id));
        setExpandedGroupIds(allIds);

        // If a task is currently selected, refresh its data reference
        if (selectedTaskId) {
          let foundTask = false;
          for (const g of loadedGroups) {
            const t = (g.tasks || []).find(item => item.id === selectedTaskId);
            if (t) {
              foundTask = true;
              break;
            }
          }
          if (!foundTask) {
            setSelectedTaskId(null);
          }
        }
      } else {
        console.error('Failed to fetch task library groups');
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Find currently selected Group & Task from groups state
  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groups.find(g => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    for (const g of groups) {
      const task = (g.tasks || []).find(t => t.id === selectedTaskId);
      if (task) return { ...task, groupName: g.name, parentGroupId: g.id };
    }
    return null;
  }, [groups, selectedTaskId]);

  // Filter groups and tasks based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase().trim();
    return groups
      .map(group => {
        const matchesGroup = group.name.toLowerCase().includes(q) || (group.description && group.description.toLowerCase().includes(q));
        const matchedTasks = (group.tasks || []).filter(task => 
          task.name.toLowerCase().includes(q) || 
          (task.description && task.description.toLowerCase().includes(q)) ||
          (task.unit && task.unit.toLowerCase().includes(q)) ||
          (task.materials || []).some(m => m.name.toLowerCase().includes(q)) ||
          (task.labours || []).some(l => l.name.toLowerCase().includes(q))
        );
        if (matchesGroup || matchedTasks.length > 0) {
          return {
            ...group,
            tasks: matchesGroup ? group.tasks : matchedTasks
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [groups, searchQuery]);

  const toggleGroupExpand = (groupId, e) => {
    if (e) e.stopPropagation();
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleSelectGroup = (groupId) => {
    setSelectedGroupId(groupId);
    setSelectedTaskId(null);
  };

  const handleSelectTask = (groupId, taskId) => {
    setSelectedGroupId(groupId);
    setSelectedTaskId(taskId);
  };

  // ==================== GROUP CRUD ====================
  const handleSaveGroup = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name')?.toString().trim();
    const description = formData.get('description')?.toString().trim() || null;

    if (!name) {
      showToast('Group name is required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (groupModal.mode === 'create') {
        const res = await fetch('/api/engineering/task-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            libraryId: selectedLibraryId,
            name,
            description
          })
        });
        if (res.ok) {
          const newGroup = await res.json();
          showToast(`Group "${name}" created successfully`);
          setGroupModal({ open: false, mode: 'create', data: null });
          await fetchGroups(selectedLibraryId);
          setSelectedGroupId(newGroup.id);
          setSelectedTaskId(null);
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to create group', 'error');
        }
      } else {
        // Edit group
        const res = await fetch('/api/engineering/task-library', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: groupModal.data.id,
            type: 'group',
            name,
            description
          })
        });
        if (res.ok) {
          showToast(`Group updated successfully`);
          setGroupModal({ open: false, mode: 'create', data: null });
          await fetchGroups(selectedLibraryId);
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update group', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while saving group', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== TASK CRUD ====================
  const handleSaveTask = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name')?.toString().trim();
    const unit = formData.get('unit')?.toString().trim() || null;
    const quantity = parseFloat(formData.get('quantity')) || 1;
    const description = formData.get('description')?.toString().trim() || null;
    const targetGroupId = formData.get('groupId')?.toString() || taskModal.groupId;

    if (!name) {
      showToast('Task name is required', 'error');
      return;
    }
    if (!targetGroupId) {
      showToast('Parent group is required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (taskModal.mode === 'create') {
        const res = await fetch('/api/engineering/task-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'task',
            libraryId: selectedLibraryId,
            groupId: targetGroupId,
            projectId: selectedProjectId || null,
            name,
            unit,
            quantity,
            description
          })
        });
        if (res.ok) {
          const newTask = await res.json();
          showToast(`Task "${name}" added successfully`);
          setTaskModal({ open: false, mode: 'create', groupId: '', data: null });
          await fetchGroups(selectedLibraryId);
          setSelectedGroupId(targetGroupId);
          setSelectedTaskId(newTask.id);
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to create task', 'error');
        }
      } else {
        // Edit task
        const res = await fetch('/api/engineering/task-library', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: taskModal.data.id,
            type: 'task',
            groupId: targetGroupId,
            projectId: selectedProjectId || null,
            name,
            unit,
            quantity,
            description
          })
        });
        if (res.ok) {
          showToast(`Task updated successfully`);
          setTaskModal({ open: false, mode: 'create', groupId: '', data: null });
          await fetchGroups(selectedLibraryId);
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update task', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while saving task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== MATERIAL CRUD ====================
  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name')?.toString().trim();
    const unit = formData.get('unit')?.toString().trim() || null;
    const quantity = parseFloat(formData.get('quantity')) || 0;
    const specification = formData.get('specification')?.toString().trim() || null;

    if (!name) {
      showToast('Material name is required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (materialModal.mode === 'create') {
        const res = await fetch('/api/engineering/task-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'material',
            taskId: materialModal.taskId,
            name,
            unit,
            quantity,
            specification
          })
        });
        if (res.ok) {
          showToast(`Material "${name}" attached successfully`);
          setMaterialModal({ open: false, mode: 'create', taskId: '', data: null });
          await fetchGroups(selectedLibraryId);
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to add material', 'error');
        }
      } else {
        // Edit Material
        const res = await fetch('/api/engineering/task-library', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: materialModal.data.id,
            type: 'material',
            name,
            unit,
            quantity,
            specification
          })
        });
        if (res.ok) {
          showToast('Material updated successfully');
          setMaterialModal({ open: false, mode: 'create', taskId: '', data: null });
          await fetchGroups(selectedLibraryId);
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update material', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while saving material', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== LABOUR CRUD ====================
  const handleSaveLabour = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name')?.toString().trim();
    const unit = formData.get('unit')?.toString().trim() || 'Manday';
    const quantity = parseFloat(formData.get('quantity')) || 0;
    const rate = parseFloat(formData.get('rate')) || 0;
    const specification = formData.get('specification')?.toString().trim() || null;

    if (!name) {
      showToast('Labour role/designation is required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (labourModal.mode === 'create') {
        const res = await fetch('/api/engineering/task-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'labour',
            taskId: labourModal.taskId,
            name,
            unit,
            quantity,
            rate,
            specification
          })
        });
        if (res.ok) {
          showToast(`Labour "${name}" attached successfully`);
          setLabourModal({ open: false, mode: 'create', taskId: '', data: null });
          await fetchGroups(selectedLibraryId);
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to add labour', 'error');
        }
      } else {
        // Edit Labour
        const res = await fetch('/api/engineering/task-library', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: labourModal.data.id,
            type: 'labour',
            name,
            unit,
            quantity,
            rate,
            specification
          })
        });
        if (res.ok) {
          showToast('Labour updated successfully');
          setLabourModal({ open: false, mode: 'create', taskId: '', data: null });
          await fetchGroups(selectedLibraryId);
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update labour', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while saving labour', 'error');
    } finally {
      setSubmitting(false);
    }
  };
  const handleSaveEquipment = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name')?.toString().trim();
    const unit = formData.get('unit')?.toString().trim() || 'Hour';
    const quantity = parseFloat(formData.get('quantity')) || 0;
    const specification = formData.get('specification')?.toString().trim() || null;

    if (!name) {
      showToast('Equipment name is required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (equipmentModal.mode === 'create') {
        const res = await fetch('/api/engineering/task-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'equipment',
            taskId: equipmentModal.taskId,
            name,
            unit,
            quantity,
            specification
          })
        });
        if (res.ok) {
          showToast(`Equipment "${name}" attached successfully`);
          setEquipmentModal({ open: false, mode: 'create', taskId: '', data: null });
          await fetchGroups(selectedLibraryId);
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to add equipment', 'error');
        }
      } else {
        // Edit Equipment
        const res = await fetch('/api/engineering/task-library', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: equipmentModal.data.id,
            type: 'equipment',
            name,
            unit,
            quantity,
            specification
          })
        });
        if (res.ok) {
          showToast('Equipment updated successfully');
          setEquipmentModal({ open: false, mode: 'create', taskId: '', data: null });
          await fetchGroups(selectedLibraryId);
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update equipment', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while saving equipment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== DELETE HANDLER ====================
  const executeDelete = async () => {
    const { type, id, title } = deleteConfirm;
    if (!id || !type) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/engineering/task-library', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type })
      });
      if (res.ok) {
        showToast(`${title} deleted successfully`);
        setDeleteConfirm({ open: false, type: '', id: '', title: '', message: '' });
        
        if (type === 'group' && selectedGroupId === id) {
          setSelectedGroupId(null);
          setSelectedTaskId(null);
        } else if (type === 'task' && selectedTaskId === id) {
          setSelectedTaskId(null);
        }
        await fetchGroups(selectedLibraryId);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete item', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error during deletion', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedLibraryObj = libraries.find(l => l.id === selectedLibraryId);

  return (
    <div className="company-container" style={{ padding: '0', display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8fafc' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: toastMessage.type === 'error' ? '#ef4444' : '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.875rem',
          fontWeight: 500,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} color="#38bdf8" />}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* ==================== LEFT PANE: TREE VIEW & CONTROLS ==================== */}
      <div style={{ 
        width: '400px', 
        borderRight: '1px solid #e2e8f0', 
        display: 'flex', 
        flexDirection: 'column', 
        background: '#ffffff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.02)',
        zIndex: 10
      }}>
        {/* Header Section */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '8px', 
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
              }}>
                <Layers size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  Task Library
                </h2>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>WBS & Construction Master</span>
              </div>
            </div>
            
            <button 
              onClick={() => selectedLibraryId && fetchGroups(selectedLibraryId)} 
              title="Refresh Task Library"
              style={{
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RefreshCw size={14} className={loadingGroups ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Library Dropdown Selection */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Parent Library (from Library Manager)
            </label>
            <select 
              className="modern-input modern-select" 
              value={selectedLibraryId}
              onChange={(e) => setSelectedLibraryId(e.target.value)}
              disabled={loadingLibraries}
              style={{ 
                fontWeight: 600, 
                color: '#0f172a', 
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1'
              }}
            >
              {loadingLibraries && <option>Loading libraries...</option>}
              {libraries.map(lib => (
                <option key={lib.id} value={lib.id}>
                  {lib.name}
                </option>
              ))}
              {!loadingLibraries && libraries.length === 0 && (
                <option value="">No libraries found</option>
              )}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Engineering Project
            </label>
            <select
              className="modern-input modern-select"
              value={selectedProjectId}
              onChange={(e) => {
                const projectId = e.target.value;
                setSelectedProjectId(projectId);
                if (projectId) {
                  const project = projects.find(item => item.id === projectId);
                  const linkedLibrary = libraries.find(item => item.name?.trim().toLowerCase() === project?.library?.trim().toLowerCase());
                  if (linkedLibrary && linkedLibrary.id !== selectedLibraryId) setSelectedLibraryId(linkedLibrary.id);
                }
              }}
              style={{ fontWeight: 600, color: '#0f172a', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}
            >
              <option value="">All / Reusable Tasks</option>
              {projects.map(project => <option key={project.id} value={project.id}>{project.projectId || project.id} - {project.name}</option>)}
            </select>
          </div>

          {/* Search Input */}
          <div className="search-wrapper" style={{ position: 'relative', marginBottom: '14px' }}>
            <input 
              type="text" 
              className="modern-input" 
              placeholder="Search groups or tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingRight: '36px', fontSize: '0.82rem', height: '36px' }} 
            />
            {searchQuery ? (
              <X 
                size={14} 
                color="#94a3b8" 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }} 
              />
            ) : (
              <Search 
                size={14} 
                color="#94a3b8" 
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} 
              />
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn-primary" 
              onClick={() => setGroupModal({ open: true, mode: 'create', data: null })}
              disabled={!selectedLibraryId}
              style={{ 
                flex: 1,
                padding: '7px 10px', 
                fontSize: '0.78rem',
                justifyContent: 'center',
                opacity: !selectedLibraryId ? 0.6 : 1
              }}
            >
              <Plus size={14} /> Add Group
            </button>
            <button 
              className="btn-primary" 
              onClick={() => {
                if (groups.length === 0) {
                  showToast('Please create a group first before adding tasks', 'error');
                  return;
                }
                const defaultGroupId = selectedGroupId || groups[0]?.id || '';
                setTaskModal({ open: true, mode: 'create', groupId: defaultGroupId, data: null });
              }}
              disabled={!selectedLibraryId || groups.length === 0}
              style={{ 
                flex: 1,
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', 
                padding: '7px 10px', 
                fontSize: '0.78rem',
                justifyContent: 'center',
                opacity: !selectedLibraryId || groups.length === 0 ? 0.6 : 1
              }}
            >
              <Plus size={14} /> Add Task
            </button>
          </div>
        </div>

        {/* Tree List Section */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loadingGroups ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', color: '#64748b' }}>
              <Loader2 size={24} className="animate-spin" style={{ marginBottom: '8px', color: '#0ea5e9' }} />
              <span style={{ fontSize: '0.85rem' }}>Loading task library...</span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8' }}>
              <Folder size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                {searchQuery ? 'No matching items' : 'No groups created yet'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '16px' }}>
                {searchQuery ? 'Try another search term' : 'Click "Add Group" to organize your tasks into categories'}
              </div>
              {!searchQuery && (
                <button 
                  className="btn-primary"
                  onClick={() => setGroupModal({ open: true, mode: 'create', data: null })}
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                >
                  <Plus size={12} /> Create First Group
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Parent Library Node */}
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                padding: '8px 10px', borderRadius: '6px', 
                background: '#f1f5f9', color: '#0f172a', fontWeight: 600, fontSize: '0.82rem',
                border: '1px solid #e2e8f0', marginBottom: '4px'
              }}>
                <FolderOpen size={16} color="#0284c7" />
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedLibraryObj?.name || 'Selected Library'}
                </span>
                <span style={{ 
                  fontSize: '0.7rem', background: '#e2e8f0', color: '#475569', 
                  padding: '2px 6px', borderRadius: '10px' 
                }}>
                  {filteredGroups.length} Groups
                </span>
              </div>

              {/* Group Nodes */}
              {filteredGroups.map(group => {
                const isExpanded = expandedGroupIds.has(group.id);
                const isGroupSelected = selectedGroupId === group.id && !selectedTaskId;
                const taskCount = group.tasks?.length || 0;

                return (
                  <div key={group.id} style={{ marginBottom: '2px' }}>
                    {/* Group Row */}
                    <div 
                      onClick={() => handleSelectGroup(group.id)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isGroupSelected ? '#e0f2fe' : 'transparent',
                        border: isGroupSelected ? '1px solid #7dd3fc' : '1px solid transparent',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isGroupSelected) e.currentTarget.style.background = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (!isGroupSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Expand / Collapse Icon */}
                      <div 
                        onClick={(e) => toggleGroupExpand(group.id, e)}
                        style={{ padding: '2px', cursor: 'pointer', color: '#64748b' }}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>

                      {/* Folder Icon */}
                      <Folder size={15} color="#f59e0b" fill="#f59e0b" />

                      {/* Group Name */}
                      <span style={{ 
                        flex: 1, 
                        fontSize: '0.83rem', 
                        fontWeight: isGroupSelected ? 600 : 500,
                        color: isGroupSelected ? '#0369a1' : '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {group.name}
                      </span>

                      {/* Task Count Badge */}
                      <span style={{ 
                        fontSize: '0.68rem', 
                        background: isGroupSelected ? '#bae6fd' : '#f1f5f9', 
                        color: isGroupSelected ? '#0284c7' : '#64748b', 
                        padding: '1px 6px', 
                        borderRadius: '10px',
                        fontWeight: 600
                      }}>
                        {taskCount}
                      </span>

                      {/* Quick Add Task Button */}
                      <button 
                        title="Add Task under this group"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskModal({ open: true, mode: 'create', groupId: group.id, data: null });
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#0284c7'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Child Tasks List */}
                    {isExpanded && (
                      <div style={{ 
                        marginLeft: '18px', 
                        paddingLeft: '10px', 
                        borderLeft: '1px dashed #cbd5e1',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        marginTop: '2px',
                        marginBottom: '4px'
                      }}>
                        {(!group.tasks || group.tasks.length === 0) ? (
                          <div style={{ 
                            fontSize: '0.74rem', 
                            color: '#94a3b8', 
                            padding: '6px 8px',
                            fontStyle: 'italic',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <span>No tasks added</span>
                            <button 
                              onClick={() => setTaskModal({ open: true, mode: 'create', groupId: group.id, data: null })}
                              style={{ 
                                background: 'none', border: 'none', color: '#0ea5e9', 
                                cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 
                              }}
                            >
                              + Add Task
                            </button>
                          </div>
                        ) : (
                          group.tasks.map(task => {
                            const isTaskSelected = selectedTaskId === task.id;
                            const matCount = task.materials?.length || 0;
                            const labCount = task.labours?.length || 0;

                            return (
                              <div
                                key={task.id}
                                onClick={() => handleSelectTask(group.id, task.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  background: isTaskSelected ? '#0284c7' : 'transparent',
                                  color: isTaskSelected ? '#ffffff' : '#334155',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isTaskSelected) e.currentTarget.style.background = '#f1f5f9';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isTaskSelected) e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <FileText size={13} color={isTaskSelected ? '#ffffff' : '#0ea5e9'} />
                                <span style={{
                                  flex: 1,
                                  fontSize: '0.78rem',
                                  fontWeight: isTaskSelected ? 600 : 400,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {task.name}
                                </span>

                                {/* Mini Badges for Materials and Labours */}
                                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                                  {matCount > 0 && (
                                    <span 
                                      title={`${matCount} Materials attached`}
                                      style={{
                                        fontSize: '0.65rem',
                                        background: isTaskSelected ? 'rgba(255,255,255,0.2)' : '#e0f2fe',
                                        color: isTaskSelected ? '#ffffff' : '#0369a1',
                                        padding: '1px 4px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px'
                                      }}
                                    >
                                      <Package size={9} /> {matCount}
                                    </span>
                                  )}
                                  {labCount > 0 && (
                                    <span 
                                      title={`${labCount} Labours attached`}
                                      style={{
                                        fontSize: '0.65rem',
                                        background: isTaskSelected ? 'rgba(255,255,255,0.2)' : '#fef3c7',
                                        color: isTaskSelected ? '#ffffff' : '#b45309',
                                        padding: '1px 4px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px'
                                      }}
                                    >
                                      <Users size={9} /> {labCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================== RIGHT PANE: DETAIL WORKSPACE ==================== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>
        
        {/* Top Breadcrumb Bar */}
        <div style={{ 
          padding: '14px 24px', 
          borderBottom: '1px solid #e2e8f0', 
          background: '#ffffff',
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div className="breadcrumb" style={{ margin: 0, fontSize: '0.82rem' }}>
            <Home size={14} /> 
            <span>Home</span> 
            <ChevronRight size={13} color="#94a3b8" /> 
            <span>Library</span> 
            <ChevronRight size={13} color="#94a3b8" /> 
            <span style={{ color: '#0ea5e9', fontWeight: 600 }}>Task Library</span>
            {selectedGroup && (
              <>
                <ChevronRight size={13} color="#94a3b8" /> 
                <span style={{ color: '#1e293b', fontWeight: 500 }}>{selectedGroup.name}</span>
              </>
            )}
            {selectedTask && (
              <>
                <ChevronRight size={13} color="#94a3b8" /> 
                <span style={{ color: '#0369a1', fontWeight: 600 }}>{selectedTask.name}</span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontSize: '0.75rem', 
              background: '#e0f2fe', 
              color: '#0369a1', 
              padding: '4px 10px', 
              borderRadius: '20px', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Sparkles size={12} /> {selectedLibraryObj?.name || 'Electrical Work Library'}
            </span>
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          
          {/* CASE 1: TASK SELECTED -> SHOW TASK DETAILS, MATERIALS, AND LABOURS */}
          {selectedTask ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
              
              {/* Task Header Card */}
              <div className="modern-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <button 
                      onClick={() => handleSelectGroup(selectedTask.parentGroupId)}
                      title="Back to Group View"
                      style={{
                        background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px',
                        padding: '8px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center'
                      }}
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ 
                          fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', 
                          padding: '2px 8px', borderRadius: '6px', fontWeight: 600 
                        }}>
                          Group: {selectedTask.groupName}
                        </span>
                        <span style={{ 
                          fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', 
                          padding: '2px 8px', borderRadius: '6px', fontWeight: 600 
                        }}>
                          Unit: {selectedTask.unit || 'Nos'}
                        </span>
                        <span style={{ 
                          fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', 
                          padding: '2px 8px', borderRadius: '6px', fontWeight: 600 
                        }}>
                          Qty: {selectedTask.quantity}
                        </span>
                      </div>
                      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                        {selectedTask.name}
                      </h1>
                    </div>
                  </div>

                  {/* Task Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setTaskModal({ open: true, mode: 'edit', groupId: selectedTask.parentGroupId, data: selectedTask })}
                      style={{
                        border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155',
                        padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                      }}
                    >
                      <Edit3 size={14} /> Edit Task
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm({ 
                        open: true, 
                        type: 'task', 
                        id: selectedTask.id, 
                        title: `Task: ${selectedTask.name}`,
                        message: 'Are you sure you want to delete this task? All attached materials and labours will also be removed.'
                      })}
                      style={{
                        border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444',
                        padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>

                {/* Task Description / Specification Box */}
                <div style={{ 
                  background: '#f8fafc', 
                  borderRadius: '8px', 
                  padding: '12px 16px', 
                  border: '1px solid #e2e8f0',
                  fontSize: '0.85rem',
                  color: '#475569',
                  lineHeight: '1.5'
                }}>
                  <strong style={{ color: '#1e293b' }}>Description / Specification: </strong>
                  {selectedTask.description ? selectedTask.description : <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No description provided. Click "Edit Task" to add specifications.</span>}
                </div>
              </div>

              {/* Tabs Section for Materials and Labours */}
              <div className="modern-card" style={{ padding: '0', overflow: 'hidden' }}>
                
                {/* Tabs Bar */}
                <div style={{ 
                  display: 'flex', 
                  borderBottom: '1px solid #e2e8f0', 
                  background: '#f8fafc',
                  padding: '0 16px'
                }}>
                  <button 
                    onClick={() => setActiveTab('materials')}
                    style={{
                      padding: '14px 20px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'materials' ? '3px solid #0ea5e9' : '3px solid transparent',
                      color: activeTab === 'materials' ? '#0ea5e9' : '#64748b',
                      fontWeight: activeTab === 'materials' ? 700 : 500,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Package size={16} />
                    <span>Materials</span>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      background: activeTab === 'materials' ? '#0ea5e9' : '#e2e8f0', 
                      color: activeTab === 'materials' ? '#ffffff' : '#64748b',
                      padding: '2px 7px', 
                      borderRadius: '10px',
                      fontWeight: 700 
                    }}>
                      {selectedTask.materials?.length || 0}
                    </span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('labours')}
                    style={{
                      padding: '14px 20px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'labours' ? '3px solid #0ea5e9' : '3px solid transparent',
                      color: activeTab === 'labours' ? '#0ea5e9' : '#64748b',
                      fontWeight: activeTab === 'labours' ? 700 : 500,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Users size={16} />
                    <span>Labours</span>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      background: activeTab === 'labours' ? '#0ea5e9' : '#e2e8f0', 
                      color: activeTab === 'labours' ? '#ffffff' : '#64748b',
                      padding: '2px 7px', 
                      borderRadius: '10px',
                      fontWeight: 700 
                    }}>
                      {selectedTask.labours?.length || 0}
                    </span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('equipments')}
                    style={{
                      padding: '14px 20px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'equipments' ? '3px solid #0ea5e9' : '3px solid transparent',
                      color: activeTab === 'equipments' ? '#0ea5e9' : '#64748b',
                      fontWeight: activeTab === 'equipments' ? 700 : 500,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Layers size={16} />
                    <span>Equipment</span>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      background: activeTab === 'equipments' ? '#0ea5e9' : '#e2e8f0', 
                      color: activeTab === 'equipments' ? '#ffffff' : '#64748b',
                      padding: '2px 7px', 
                      borderRadius: '10px',
                      fontWeight: 700 
                    }}>
                      {selectedTask.equipments?.length || 0}
                    </span>
                  </button>
                </div>

                {/* Tab Content 1: Materials */}
                {activeTab === 'materials' && (
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                          Attached Materials
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                          Bill of Materials required per unit of "{selectedTask.name}"
                        </p>
                      </div>
                      <button 
                        className="btn-primary"
                        onClick={() => setMaterialModal({ open: true, mode: 'create', taskId: selectedTask.id, data: null })}
                        style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                      >
                        <Plus size={14} /> Add Material
                      </button>
                    </div>

                    {(!selectedTask.materials || selectedTask.materials.length === 0) ? (
                      <div style={{ 
                        border: '2px dashed #e2e8f0', borderRadius: '10px', 
                        padding: '40px 20px', textAlign: 'center', color: '#94a3b8' 
                      }}>
                        <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                        <h4 style={{ margin: '0 0 6px', color: '#475569', fontSize: '0.95rem' }}>No materials attached yet</h4>
                        <p style={{ margin: '0 0 16px', fontSize: '0.78rem' }}>
                          Specify the raw materials, equipment, and consumables needed for this task.
                        </p>
                        <button 
                          className="btn-primary"
                          onClick={() => setMaterialModal({ open: true, mode: 'create', taskId: selectedTask.id, data: null })}
                          style={{ padding: '7px 14px', fontSize: '0.78rem' }}
                        >
                          <Plus size={14} /> Add First Material
                        </button>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                              <th style={{ padding: '10px 14px', width: '50px' }}>#</th>
                              <th style={{ padding: '10px 14px' }}>Material Name</th>
                              <th style={{ padding: '10px 14px', width: '110px' }}>Unit</th>
                              <th style={{ padding: '10px 14px', width: '120px' }}>Quantity</th>
                              <th style={{ padding: '10px 14px' }}>Specification / Grade</th>
                              <th style={{ padding: '10px 14px', width: '100px', textAlign: 'center' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTask.materials.map((mat, idx) => (
                              <tr key={mat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>
                                  {mat.name}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{ 
                                    background: '#f1f5f9', color: '#475569', 
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                                  }}>
                                    {mat.unit || '-'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                                  {mat.quantity}
                                </td>
                                <td style={{ padding: '10px 14px', color: '#64748b' }}>
                                  {mat.specification || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>None</span>}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                    <button 
                                      title="Edit Material"
                                      onClick={() => setMaterialModal({ open: true, mode: 'edit', taskId: selectedTask.id, data: mat })}
                                      style={{
                                        background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px'
                                      }}
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button 
                                      title="Delete Material"
                                      onClick={() => setDeleteConfirm({
                                        open: true,
                                        type: 'material',
                                        id: mat.id,
                                        title: `Material: ${mat.name}`,
                                        message: 'Are you sure you want to remove this material from the task?'
                                      })}
                                      style={{
                                        background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px'
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content 2: Labours */}
                {activeTab === 'labours' && (
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                          Attached Labours
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                          Workforce & labour effort required per unit of "{selectedTask.name}"
                        </p>
                      </div>
                      <button 
                        className="btn-primary"
                        onClick={() => setLabourModal({ open: true, mode: 'create', taskId: selectedTask.id, data: null })}
                        style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                      >
                        <Plus size={14} /> Add Labour
                      </button>
                    </div>

                    {(!selectedTask.labours || selectedTask.labours.length === 0) ? (
                      <div style={{ 
                        border: '2px dashed #e2e8f0', borderRadius: '10px', 
                        padding: '40px 20px', textAlign: 'center', color: '#94a3b8' 
                      }}>
                        <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                        <h4 style={{ margin: '0 0 6px', color: '#475569', fontSize: '0.95rem' }}>No labours attached yet</h4>
                        <p style={{ margin: '0 0 16px', fontSize: '0.78rem' }}>
                          Add skilled technicians, supervisors, or helpers required to complete this task.
                        </p>
                        <button 
                          className="btn-primary"
                          onClick={() => setLabourModal({ open: true, mode: 'create', taskId: selectedTask.id, data: null })}
                          style={{ padding: '7px 14px', fontSize: '0.78rem' }}
                        >
                          <Plus size={14} /> Add First Labour
                        </button>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                              <th style={{ padding: '10px 14px', width: '50px' }}>#</th>
                              <th style={{ padding: '10px 14px' }}>Role / Labour Designation</th>
                              <th style={{ padding: '10px 14px', width: '110px' }}>Unit</th>
                              <th style={{ padding: '10px 14px', width: '120px' }}>Quantity</th>
                              <th style={{ padding: '10px 14px', width: '120px' }}>Rate</th>
                              <th style={{ padding: '10px 14px', width: '130px' }}>Total</th>
                              <th style={{ padding: '10px 14px' }}>Skill Requirement / Specification</th>
                              <th style={{ padding: '10px 14px', width: '100px', textAlign: 'center' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTask.labours.map((lab, idx) => (
                              <tr key={lab.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>
                                  {lab.name}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{ 
                                    background: '#fef3c7', color: '#b45309', 
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                                  }}>
                                    {lab.unit || 'Manday'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                                  {lab.quantity}
                                </td>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                                  ₹{Number(lab.rate || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#b45309' }}>
                                  ₹{(Number(lab.quantity || 0) * Number(lab.rate || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '10px 14px', color: '#64748b' }}>
                                  {lab.specification || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>None</span>}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                    <button 
                                      title="Edit Labour"
                                      onClick={() => setLabourModal({ open: true, mode: 'edit', taskId: selectedTask.id, data: lab })}
                                      style={{
                                        background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px'
                                      }}
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button 
                                      title="Delete Labour"
                                      onClick={() => setDeleteConfirm({
                                        open: true,
                                        type: 'labour',
                                        id: lab.id,
                                        title: `Labour: ${lab.name}`,
                                        message: 'Are you sure you want to remove this labour item from the task?'
                                      })}
                                      style={{
                                        background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px'
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content 3: Equipments */}
                {activeTab === 'equipments' && (
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                          Attached Equipment
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                          Equipment &amp; machinery required per unit of "{selectedTask.name}"
                        </p>
                      </div>
                      <button 
                        className="btn-primary"
                        onClick={() => setEquipmentModal({ open: true, mode: 'create', taskId: selectedTask.id, data: null })}
                        style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                      >
                        <Plus size={14} /> Add Equipment
                      </button>
                    </div>

                    {(!selectedTask.equipments || selectedTask.equipments.length === 0) ? (
                      <div style={{ 
                        border: '2px dashed #e2e8f0', borderRadius: '10px', 
                        padding: '40px 20px', textAlign: 'center', color: '#94a3b8' 
                      }}>
                        <Layers size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                        <h4 style={{ margin: '0 0 6px', color: '#475569', fontSize: '0.95rem' }}>No equipment attached yet</h4>
                        <p style={{ margin: '0 0 16px', fontSize: '0.78rem' }}>
                          Add machines, tools, or plant items required for this task.
                        </p>
                        <button 
                          className="btn-primary"
                          onClick={() => setEquipmentModal({ open: true, mode: 'create', taskId: selectedTask.id, data: null })}
                          style={{ padding: '7px 14px', fontSize: '0.78rem' }}
                        >
                          <Plus size={14} /> Add First Equipment
                        </button>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                              <th style={{ padding: '10px 14px', width: '50px' }}>#</th>
                              <th style={{ padding: '10px 14px' }}>Equipment Name</th>
                              <th style={{ padding: '10px 14px', width: '110px' }}>Unit</th>
                              <th style={{ padding: '10px 14px', width: '120px' }}>Quantity</th>
                              <th style={{ padding: '10px 14px' }}>Specification / Capacity</th>
                              <th style={{ padding: '10px 14px', width: '100px', textAlign: 'center' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTask.equipments.map((eq, idx) => (
                              <tr key={eq.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>
                                  {eq.name}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{ 
                                    background: '#f0fdf4', color: '#166534', 
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                                  }}>
                                    {eq.unit || 'Hour'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                                  {eq.quantity}
                                </td>
                                <td style={{ padding: '10px 14px', color: '#64748b' }}>
                                  {eq.specification || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>None</span>}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                    <button 
                                      title="Edit Equipment"
                                      onClick={() => setEquipmentModal({ open: true, mode: 'edit', taskId: selectedTask.id, data: eq })}
                                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button 
                                      title="Delete Equipment"
                                      onClick={() => setDeleteConfirm({
                                        open: true,
                                        type: 'equipment',
                                        id: eq.id,
                                        title: `Equipment: ${eq.name}`,
                                        message: 'Are you sure you want to remove this equipment from the task?'
                                      })}
                                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : selectedGroup ? (
            /* CASE 2: GROUP SELECTED -> SHOW GROUP SUMMARY & LIST OF ALL CHILD TASKS */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
              
              {/* Group Header Card */}
              <div className="modern-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ 
                        fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', 
                        padding: '2px 8px', borderRadius: '6px', fontWeight: 600 
                      }}>
                        Group Overview
                      </span>
                      <span style={{ 
                        fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', 
                        padding: '2px 8px', borderRadius: '6px', fontWeight: 600 
                      }}>
                        {selectedGroup.tasks?.length || 0} Tasks
                      </span>
                    </div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                      {selectedGroup.name}
                    </h1>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn-primary"
                      onClick={() => setTaskModal({ open: true, mode: 'create', groupId: selectedGroup.id, data: null })}
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      <Plus size={14} /> Add Task
                    </button>
                    <button 
                      onClick={() => setGroupModal({ open: true, mode: 'edit', data: selectedGroup })}
                      style={{
                        border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155',
                        padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                      }}
                    >
                      <Edit3 size={14} /> Edit Group
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm({
                        open: true,
                        type: 'group',
                        id: selectedGroup.id,
                        title: `Group: ${selectedGroup.name}`,
                        message: 'Are you sure you want to delete this group? All tasks, materials, and labours within this group will also be permanently deleted.'
                      })}
                      style={{
                        border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444',
                        padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div style={{ 
                  background: '#f8fafc', borderRadius: '8px', padding: '12px 16px', 
                  border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569'
                }}>
                  <strong style={{ color: '#1e293b' }}>Description: </strong>
                  {selectedGroup.description || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No description provided for this group.</span>}
                </div>
              </div>

              {/* Tasks List Card */}
              <div className="modern-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    Tasks in this Group
                  </h3>
                  <button 
                    className="btn-primary"
                    onClick={() => setTaskModal({ open: true, mode: 'create', groupId: selectedGroup.id, data: null })}
                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  >
                    <Plus size={14} /> Add Task
                  </button>
                </div>

                {(!selectedGroup.tasks || selectedGroup.tasks.length === 0) ? (
                  <div style={{ 
                    border: '2px dashed #e2e8f0', borderRadius: '10px', 
                    padding: '40px 20px', textAlign: 'center', color: '#94a3b8' 
                  }}>
                    <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <h4 style={{ margin: '0 0 6px', color: '#475569', fontSize: '0.95rem' }}>No tasks in this group</h4>
                    <p style={{ margin: '0 0 16px', fontSize: '0.78rem' }}>
                      Add tasks specifying unit, quantity, and work specifications.
                    </p>
                    <button 
                      className="btn-primary"
                      onClick={() => setTaskModal({ open: true, mode: 'create', groupId: selectedGroup.id, data: null })}
                      style={{ padding: '7px 14px', fontSize: '0.78rem' }}
                    >
                      <Plus size={14} /> Add First Task
                    </button>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                          <th style={{ padding: '10px 14px', width: '50px' }}>#</th>
                          <th style={{ padding: '10px 14px' }}>Task Name</th>
                          <th style={{ padding: '10px 14px', width: '90px' }}>Unit</th>
                          <th style={{ padding: '10px 14px', width: '90px' }}>Quantity</th>
                          <th style={{ padding: '10px 14px' }}>Description / Spec</th>
                          <th style={{ padding: '10px 14px', width: '110px' }}>Materials</th>
                          <th style={{ padding: '10px 14px', width: '110px' }}>Labours</th>
                          <th style={{ padding: '10px 14px', width: '130px', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedGroup.tasks.map((task, idx) => (
                          <tr 
                            key={task.id} 
                            style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                            onClick={() => handleSelectTask(selectedGroup.id, task.id)}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td style={{ padding: '12px 14px', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0284c7' }}>
                              {task.name}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ 
                                background: '#f1f5f9', color: '#475569', 
                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                              }}>
                                {task.unit || '-'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                              {task.quantity}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#64748b', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {task.description || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>None</span>}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ 
                                background: '#e0f2fe', color: '#0369a1', 
                                padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600,
                                display: 'inline-flex', alignItems: 'center', gap: '4px'
                              }}>
                                <Package size={11} /> {task.materials?.length || 0} items
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ 
                                background: '#fef3c7', color: '#b45309', 
                                padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600,
                                display: 'inline-flex', alignItems: 'center', gap: '4px'
                              }}>
                                <Users size={11} /> {task.labours?.length || 0} roles
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button 
                                  title="View Details"
                                  onClick={() => handleSelectTask(selectedGroup.id, task.id)}
                                  style={{
                                    border: '1px solid #cbd5e1', background: '#ffffff', color: '#0284c7',
                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Open
                                </button>
                                <button 
                                  title="Edit Task"
                                  onClick={() => setTaskModal({ open: true, mode: 'edit', groupId: selectedGroup.id, data: task })}
                                  style={{
                                    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px'
                                  }}
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button 
                                  title="Delete Task"
                                  onClick={() => setDeleteConfirm({
                                    open: true,
                                    type: 'task',
                                    id: task.id,
                                    title: `Task: ${task.name}`,
                                    message: 'Are you sure you want to delete this task? All attached materials and labours will also be removed.'
                                  })}
                                  style={{
                                    background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px'
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* CASE 3: NO SELECTION -> WELCOME / OVERVIEW STATE */
            <div style={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              textAlign: 'center',
              padding: '40px',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              <div style={{ 
                width: '72px', height: '72px', borderRadius: '20px', 
                background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0284c7', marginBottom: '20px'
              }}>
                <FolderOpen size={36} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
                Electrical Work Task Library
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: '1.6', margin: '0 0 24px' }}>
                Select a group or task from the library tree on the left to manage work breakdown items, 
                or create new groups to categorize your electrical installations, materials, and labour specifications.
              </p>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn-primary"
                  onClick={() => setGroupModal({ open: true, mode: 'create', data: null })}
                  disabled={!selectedLibraryId}
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  <Plus size={16} /> Create New Group
                </button>
                {groups.length > 0 && (
                  <button 
                    onClick={() => {
                      const firstGroupId = groups[0].id;
                      setTaskModal({ open: true, mode: 'create', groupId: firstGroupId, data: null });
                    }}
                    style={{
                      border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155',
                      padding: '8px 16px', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                    }}
                  >
                    <Plus size={16} /> Add Task to First Group
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ==================== MODAL: ADD / EDIT GROUP ==================== */}
      {groupModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: 'white', borderRadius: '18px', width: '100%', maxWidth: '560px',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.22)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '22px 28px 18px', borderBottom: '1px solid #e2e8f0', background: '#fbfdff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Folder size={19} fill="#f59e0b" /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 750, color: '#0f172a' }}>
                    {groupModal.mode === 'create' ? 'Add Task Group' : 'Edit Task Group'}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Organize project work into reusable groups</p>
                </div>
              </div>
              <button 
                onClick={() => setGroupModal({ open: false, mode: 'create', data: null })}
                style={{ width: '34px', height: '34px', border: '1px solid #dbe4ee', borderRadius: '9px', background: '#fff', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} style={{ padding: '26px 28px 24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label className="modern-label">Parent Library</label>
                <input 
                  type="text" 
                  className="modern-input" 
                  value={selectedLibraryObj?.name || 'Electrical Work Library'} 
                  disabled 
                  style={{ background: '#f1f5f9', color: '#64748b' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="modern-label">Group Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  className="modern-input" 
                  placeholder="e.g. Wiring & Conduiting, Switchgears, Lighting" 
                  defaultValue={groupModal.data?.name || ''} 
                  required 
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="modern-label">Description / Scope</label>
                <textarea 
                  name="description" 
                  className="modern-input" 
                  placeholder="Brief description of work items under this category..."
                  rows={3} 
                  defaultValue={groupModal.data?.description || ''}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '18px', borderTop: '1px solid #edf2f7' }}>
                <button 
                  type="button" 
                  onClick={() => setGroupModal({ open: false, mode: 'create', data: null })}
                  disabled={submitting}
                  style={{
                    padding: '10px 18px', borderRadius: '9px', border: '1px solid #cbd5e1',
                    background: '#ffffff', color: '#475569', fontWeight: 650, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={submitting}
                  style={{ padding: '10px 22px', fontSize: '0.85rem', borderRadius: '9px', display: 'inline-flex', alignItems: 'center', gap: '7px', boxShadow: '0 5px 12px rgba(2, 132, 199, 0.22)' }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {groupModal.mode === 'create' ? 'Create Group' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT TASK ==================== */}
      {taskModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: 'white', borderRadius: '18px', width: '100%', maxWidth: '620px',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.22)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '22px 28px 18px', borderBottom: '1px solid #e2e8f0', background: '#fbfdff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={19} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 750, color: '#0f172a' }}>
                    {taskModal.mode === 'create' ? 'Add New Task' : 'Edit Task'}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    {selectedProjectId ? 'Project-specific task' : 'Reusable library task'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setTaskModal({ open: false, mode: 'create', groupId: '', data: null })}
                style={{ width: '34px', height: '34px', border: '1px solid #dbe4ee', borderRadius: '9px', background: '#fff', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTask} style={{ padding: '26px 28px 24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label className="modern-label">Task Group *</label>
                <select 
                  name="groupId" 
                  className="modern-input modern-select"
                  defaultValue={taskModal.data?.groupId || taskModal.groupId || groups[0]?.id}
                  required
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="modern-label">Task Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  className="modern-input" 
                  placeholder="e.g. Laying 25mm PVC Conduit in slab" 
                  defaultValue={taskModal.data?.name || ''} 
                  required 
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.65fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label className="modern-label">Unit of Measurement *</label>
                  <select
                    name="unit"
                    className="modern-input modern-select"
                    defaultValue={taskModal.data?.unit || 'Nos'}
                    required
                  >
                    <option value="">-- Select Unit --</option>
                    {availableUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </div>

                <div>
                  <label className="modern-label">Standard Quantity</label>
                  <input 
                    type="number" 
                    step="any"
                    name="quantity" 
                    className="modern-input" 
                    placeholder="1.00" 
                    defaultValue={taskModal.data?.quantity ?? 1} 
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="modern-label">Task Description / Specifications</label>
                <textarea 
                  name="description" 
                  className="modern-input" 
                  placeholder="Provide technical specifications, scope of work, execution method..."
                  rows={3} 
                  defaultValue={taskModal.data?.description || ''}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '18px', borderTop: '1px solid #edf2f7' }}>
                <button 
                  type="button" 
                  onClick={() => setTaskModal({ open: false, mode: 'create', groupId: '', data: null })}
                  disabled={submitting}
                  style={{
                    padding: '10px 18px', borderRadius: '9px', border: '1px solid #cbd5e1',
                    background: '#ffffff', color: '#475569', fontWeight: 650, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={submitting}
                  style={{ padding: '10px 22px', fontSize: '0.85rem', borderRadius: '9px', display: 'inline-flex', alignItems: 'center', gap: '7px', boxShadow: '0 5px 12px rgba(2, 132, 199, 0.22)' }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {taskModal.mode === 'create' ? 'Create Task' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT MATERIAL ==================== */}
      {materialModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: 'white', borderRadius: '14px', width: '100%', maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  {materialModal.mode === 'create' ? 'Add Material to Task' : 'Edit Material'}
                </h3>
              </div>
              <button 
                onClick={() => setMaterialModal({ open: false, mode: 'create', taskId: '', data: null })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label className="modern-label">Material Name *</label>
                <select 
                  name="name" 
                  className="modern-input modern-select" 
                  defaultValue={materialModal.data?.name || ''} 
                  required 
                  autoFocus
                  onChange={(e) => {
                    const item = masterResources.material.find(m => m.name === e.target.value);
                    if (item && e.target.form) {
                      if (e.target.form.unit) e.target.form.unit.value = item.unit || 'Nos';
                      if (e.target.form.rate) e.target.form.rate.value = item.rate || 0;
                      if (e.target.form.specification) e.target.form.specification.value = item.specification || '';
                    }
                  }}
                >
                  <option value="" disabled>-- Select Material from Library --</option>
                  {masterResources.material.map((m, i) => (
                    <option key={i} value={m.name}>{m.name}</option>
                  ))}
                  {materialModal.mode === 'edit' && materialModal.data?.name && !masterResources.material.some(m => m.name === materialModal.data.name) && (
                    <option value={materialModal.data.name}>{materialModal.data.name}</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="modern-label">Unit *</label>
                  <input 
                    type="text" 
                    name="unit" 
                    list="mat-units-list"
                    className="modern-input" 
                    placeholder="e.g. Mtr" 
                    defaultValue={materialModal.data?.unit || 'Mtr'} 
                    required
                  />
                  <datalist id="mat-units-list">
                    {availableUnits.map((u, i) => (
                      <option key={i} value={u} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="modern-label">Quantity *</label>
                  <input 
                    type="number" 
                    step="any"
                    name="quantity" 
                    className="modern-input" 
                    placeholder="1.00" 
                    defaultValue={materialModal.data?.quantity ?? 1} 
                    required
                  />
                </div>
                
                <div>
                  <label className="modern-label">Rate</label>
                  <input 
                    type="number" 
                    step="any"
                    name="rate" 
                    className="modern-input" 
                    placeholder="0.00" 
                    defaultValue={materialModal.data?.rate ?? 0} 
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="modern-label">Specification / Make / Grade</label>
                <textarea 
                  name="specification" 
                  className="modern-input" 
                  placeholder="e.g. ISI marked 2mm wall thickness, Havells / Finolex or approved equal"
                  rows={3} 
                  defaultValue={materialModal.data?.specification || ''}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setMaterialModal({ open: false, mode: 'create', taskId: '', data: null })}
                  disabled={submitting}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={submitting}
                  style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {materialModal.mode === 'create' ? 'Add Material' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT LABOUR ==================== */}
      {labourModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: 'white', borderRadius: '14px', width: '100%', maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#b45309" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  {labourModal.mode === 'create' ? 'Add Labour to Task' : 'Edit Labour'}
                </h3>
              </div>
              <button 
                onClick={() => setLabourModal({ open: false, mode: 'create', taskId: '', data: null })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLabour} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label className="modern-label">Labour Role / Designation *</label>
                <select 
                  name="name" 
                  className="modern-input modern-select" 
                  defaultValue={labourModal.data?.name || ''} 
                  required 
                  autoFocus
                  onChange={(e) => {
                    const item = masterResources.labour.find(m => m.name === e.target.value);
                    const form = e.currentTarget.form;
                    if (item && form) {
                      const unitInput = form.elements.namedItem('unit');
                      const rateInput = form.elements.namedItem('rate');
                      const specificationInput = form.elements.namedItem('specification');
                      if (unitInput) unitInput.value = item.unit || 'Manday';
                      if (rateInput) rateInput.value = item.rate ?? item.labourRate ?? item.price ?? 0;
                      if (specificationInput) specificationInput.value = item.specification || '';
                    }
                  }}
                >
                  <option value="" disabled>-- Select Labour from Library --</option>
                  {masterResources.labour.map((m, i) => (
                    <option key={i} value={m.name}>{m.name}</option>
                  ))}
                  {labourModal.mode === 'edit' && labourModal.data?.name && !masterResources.labour.some(m => m.name === labourModal.data.name) && (
                    <option value={labourModal.data.name}>{labourModal.data.name}</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="modern-label">Unit *</label>
                  <select 
                    name="unit" 
                    className="modern-input modern-select"
                    defaultValue={labourModal.data?.unit || ''}
                    required
                  >
                    <option value="" disabled>-- Select Unit --</option>
                    {availableUnits.map((u, i) => (
                      <option key={i} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="modern-label">Quantity *</label>
                  <input 
                    type="number" 
                    step="any"
                    name="quantity" 
                    className="modern-input" 
                    placeholder="0.05" 
                    defaultValue={labourModal.data?.quantity ?? 0.05} 
                    required
                  />
                </div>
                
                <div>
                  <label className="modern-label">Rate</label>
                  <input 
                    type="number" 
                    step="any"
                    name="rate" 
                    className="modern-input" 
                    placeholder="0.00" 
                    defaultValue={labourModal.data?.rate ?? 0} 
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="modern-label">Skill Requirement / Specification</label>
                <textarea 
                  name="specification" 
                  className="modern-input" 
                  placeholder="e.g. Certified in slab conduit placement and electrical safety norms"
                  rows={3} 
                  defaultValue={labourModal.data?.specification || ''}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setLabourModal({ open: false, mode: 'create', taskId: '', data: null })}
                  disabled={submitting}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={submitting}
                  style={{ padding: '8px 20px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)' }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {labourModal.mode === 'create' ? 'Add Labour' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT EQUIPMENT ==================== */}
      {equipmentModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: 'white', borderRadius: '14px', width: '100%', maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#166534" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  {equipmentModal.mode === 'create' ? 'Add Equipment to Task' : 'Edit Equipment'}
                </h3>
              </div>
              <button 
                onClick={() => setEquipmentModal({ open: false, mode: 'create', taskId: '', data: null })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label className="modern-label">Equipment Name *</label>
                <select 
                  name="name" 
                  className="modern-input modern-select" 
                  defaultValue={equipmentModal.data?.name || ''} 
                  required 
                  autoFocus
                  onChange={(e) => {
                    const item = masterResources.equipment.find(m => m.name === e.target.value);
                    if (item && e.target.form) {
                      if (e.target.form.unit) e.target.form.unit.value = item.unit || 'Hour';
                      if (e.target.form.rate) e.target.form.rate.value = item.rate || 0;
                      if (e.target.form.specification) e.target.form.specification.value = item.specification || '';
                    }
                  }}
                >
                  <option value="" disabled>-- Select Equipment from Library --</option>
                  {masterResources.equipment.map((m, i) => (
                    <option key={i} value={m.name}>{m.name}</option>
                  ))}
                  {equipmentModal.mode === 'edit' && equipmentModal.data?.name && !masterResources.equipment.some(m => m.name === equipmentModal.data.name) && (
                    <option value={equipmentModal.data.name}>{equipmentModal.data.name}</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="modern-label">Unit *</label>
                  <select 
                    name="unit" 
                    className="modern-input modern-select"
                    defaultValue={equipmentModal.data?.unit || 'Hour'}
                    required
                  >
                    <option value="Hour">Hour</option>
                    <option value="Day">Day</option>
                    <option value="Month">Month</option>
                    <option value="Km">Km</option>
                  </select>
                </div>

                <div>
                  <label className="modern-label">Quantity *</label>
                  <input 
                    type="number" 
                    step="any"
                    name="quantity" 
                    className="modern-input" 
                    placeholder="1" 
                    defaultValue={equipmentModal.data?.quantity ?? 1} 
                    required
                  />
                </div>

                <div>
                  <label className="modern-label">Rate</label>
                  <input 
                    type="number" 
                    step="any"
                    name="rate" 
                    className="modern-input" 
                    placeholder="0.00" 
                    defaultValue={equipmentModal.data?.rate ?? 0} 
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="modern-label">Specification / Capacity</label>
                <textarea 
                  name="specification" 
                  className="modern-input" 
                  placeholder="e.g. 10 Tonnes capacity, 50 KVA generator"
                  rows={3} 
                  defaultValue={equipmentModal.data?.specification || ''}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setEquipmentModal({ open: false, mode: 'create', taskId: '', data: null })}
                  disabled={submitting}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={submitting}
                  style={{ padding: '8px 20px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)' }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {equipmentModal.mode === 'create' ? 'Add Equipment' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ==================== MODAL: DELETE CONFIRMATION ==================== */}
      {deleteConfirm.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '14px', width: '100%', maxWidth: '440px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '24px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px', background: '#fee2e2',
                color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Trash2 size={24} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                Delete Confirmation
              </h3>
              <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5' }}>
                {deleteConfirm.message}
              </p>
              <div style={{ 
                background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', 
                border: '1px solid #e2e8f0', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', marginBottom: '20px' 
              }}>
                {deleteConfirm.title}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  onClick={() => setDeleteConfirm({ open: false, type: '', id: '', title: '', message: '' })}
                  disabled={submitting}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDelete}
                  disabled={submitting}
                  style={{
                    padding: '8px 20px', borderRadius: '8px', border: 'none',
                    background: '#ef4444', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
