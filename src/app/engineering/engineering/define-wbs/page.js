'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, ChevronRight, ChevronDown as ExpandIcon, ChevronRight as CollapseIcon, 
  Home, Folder, Layers, Edit, Trash2, Save, X, Check, AlertCircle, Loader2,
  FileText, Activity, Box, Sparkles, Package, Users
} from 'lucide-react';
import '../../engineering-ui.css';

// Standard RERA Stages for construction projects
const RERA_STAGES = [
  'Excavation',
  'Foundation / Plinth',
  'Structure / RCC Slab',
  'Brickwork & Masonry',
  'Internal Plastering',
  'External Plastering',
  'Flooring & Tiling',
  'Doors & Windows',
  'Sanitary & Plumbing Fittings',
  'Electrical Fittings',
  'External Finishing / Painting',
  'Waterproofing & Terrace Work',
  'Handover / Completion'
];

export default function DefineWBS() {
  // Projects state
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);

  // WBS Groups & Tasks state
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [loadingWbs, setLoadingWbs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Tree expansion state
  const [expandedGroups, setExpandedGroups] = useState({});

  // Modals state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', reraStage: 'Structure / RCC Slab', rate: '', budgetAmount: '' });
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [savingGroup, setSavingGroup] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    name: '',
    volOfWorkMaterial: '',
    materialRate: '',
    volOfWorkLabour: '',
    labourRate: '',
    description: '',
    reraStage: '',
    targetGroupId: ''
  });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [savingTask, setSavingTask] = useState(false);

  // Task Library Integration state
  const [libraryTasks, setLibraryTasks] = useState([]);
  const [loadingLibraryTasks, setLoadingLibraryTasks] = useState(false);
  const [selectedLibraryTaskId, setSelectedLibraryTaskId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedLabourId, setSelectedLabourId] = useState('');

  // Selected library task and attached material/labour
  const selectedLibraryTask = useMemo(() => {
    if (!selectedLibraryTaskId) return null;
    return libraryTasks.find(t => t.id === selectedLibraryTaskId) || null;
  }, [libraryTasks, selectedLibraryTaskId]);

  const selectedMaterial = useMemo(() => {
    if (!selectedMaterialId || !selectedLibraryTask?.materials) return null;
    return selectedLibraryTask.materials.find(m => m.id === selectedMaterialId) || null;
  }, [selectedLibraryTask, selectedMaterialId]);

  const selectedLabour = useMemo(() => {
    if (!selectedLabourId || !selectedLibraryTask?.labours) return null;
    return selectedLibraryTask.labours.find(l => l.id === selectedLabourId) || null;
  }, [selectedLibraryTask, selectedLabourId]);

  const getLibraryLabourRate = (labour) => {
    if (!labour) return null;
    const rate = labour.rate ?? labour.labourRate;
    return rate === undefined || rate === null || rate === '' ? null : rate;
  };

  // Feedback notifications
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Task Library items
  const fetchLibraryTasks = async () => {
    try {
      setLoadingLibraryTasks(true);
      const res = await fetch('/api/engineering/task-library?_t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const groupsData = await res.json();
        const tasksList = [];
        if (Array.isArray(groupsData)) {
          groupsData.forEach(g => {
            (g.tasks || []).forEach(t => {
              tasksList.push({
                ...t,
                libraryGroupId: g.id,
                libraryGroupName: g.name,
                libraryName: g.library?.name || 'Task Library'
              });
            });
          });
        }
        setLibraryTasks(tasksList);
      }
    } catch (err) {
      console.error('Error fetching library tasks:', err);
    } finally {
      setLoadingLibraryTasks(false);
    }
  };

  // 1. Fetch Projects & Library Tasks on Mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const res = await fetch('/api/projects?_t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
          if (data && data.length > 0) {
            setSelectedProjectId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
        showNotification('Failed to load projects list', 'error');
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
    fetchLibraryTasks();
  }, []);

  // 2. Fetch WBS when selected project changes
  const fetchWbs = async (projId) => {
    if (!projId) {
      setGroups([]);
      return;
    }
    try {
      setLoadingWbs(true);
      const res = await fetch(`/api/engineering/wbs?projectId=${projId}&_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
        // Expand all groups by default
        const exp = {};
        data.forEach(g => { exp[g.id] = true; });
        setExpandedGroups(exp);

        // Auto-select first group if none selected or previous selection no longer exists
        if (data.length > 0) {
          if (!selectedGroupId || !data.some(g => g.id === selectedGroupId)) {
            setSelectedGroupId(data[0].id);
          }
        } else {
          setSelectedGroupId(null);
        }
      }
    } catch (err) {
      console.error('Error fetching WBS data:', err);
      showNotification('Failed to load WBS groups and tasks', 'error');
    } finally {
      setLoadingWbs(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchWbs(selectedProjectId);
    }
  }, [selectedProjectId]);

  const toggleGroupExpand = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedGroup = groups.find(g => g.id === selectedGroupId) || groups[0] || null;

  // --- Group Handlers ---
  const handleOpenAddGroup = () => {
    setEditingGroupId(null);
    setGroupForm({ name: '', reraStage: RERA_STAGES[2], rate: '', budgetAmount: '' }); // Default to 'Structure / RCC Slab'
    setShowGroupModal(true);
  };

  const handleOpenEditGroup = (group, e) => {
    if (e) e.stopPropagation();
    setEditingGroupId(group.id);
    setGroupForm({ name: group.name, reraStage: group.reraStage || RERA_STAGES[0], rate: group.rate || '', budgetAmount: group.budgetAmount || group.rate || '' });
    setShowGroupModal(true);
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    if (!groupForm.name.trim()) {
      showNotification('Group name is required', 'error');
      return;
    }

    try {
      setSavingGroup(true);
      const method = editingGroupId ? 'PUT' : 'POST';
      const payload = editingGroupId 
        ? { id: editingGroupId, type: 'group', name: groupForm.name.trim(), reraStage: groupForm.reraStage, rate: groupForm.rate, budgetAmount: groupForm.budgetAmount }
        : { type: 'group', projectId: selectedProjectId, name: groupForm.name.trim(), reraStage: groupForm.reraStage, rate: groupForm.rate, budgetAmount: groupForm.budgetAmount };

      const res = await fetch('/api/engineering/wbs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) {
        showNotification(result.error || 'Failed to save group', 'error');
        return;
      }

      showNotification(`Group "${groupForm.name}" ${editingGroupId ? 'updated' : 'created'} successfully!`);
      setShowGroupModal(false);
      await fetchWbs(selectedProjectId);
      if (!editingGroupId && result.id) {
        setSelectedGroupId(result.id);
      }
    } catch (err) {
      console.error(err);
      showNotification('An error occurred while saving the group', 'error');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId, groupName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete group "${groupName}" and all its tasks?`)) {
      return;
    }
    try {
      const res = await fetch('/api/engineering/wbs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: groupId, type: 'group' })
      });
      if (res.ok) {
        showNotification(`Group "${groupName}" deleted successfully`);
        await fetchWbs(selectedProjectId);
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification(err.error || 'Failed to delete group', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Network error while deleting group', 'error');
    }
  };

  // --- Task Handlers ---
  const handleOpenAddTask = (targetGroup = null) => {
    const parent = targetGroup || selectedGroup;
    if (!parent) {
      showNotification('Please create or select a group first before adding tasks', 'error');
      return;
    }
    setEditingTaskId(null);
    setSelectedLibraryTaskId('');
    setSelectedMaterialId('');
    setSelectedLabourId('');
    setTaskForm({
      name: '',
      volOfWorkMaterial: '',
      materialRate: '',
      volOfWorkLabour: '',
      labourRate: '',
      description: '',
      reraStage: parent.reraStage || RERA_STAGES[0],
      targetGroupId: parent.id
    });
    setShowTaskModal(true);
  };

  const handleOpenEditTask = (task) => {
    setEditingTaskId(task.id);
    // Find matching library task if name matches
    const matched = libraryTasks.find(lt => lt.name?.toLowerCase().trim() === task.name?.toLowerCase().trim());
    setSelectedLibraryTaskId(matched ? matched.id : '');
    const savedMaterial = task.materials?.[0];
    const matchedMaterial = matched?.materials?.find(material => material.name === savedMaterial?.name);
    setSelectedMaterialId(matchedMaterial?.id || '');
    setSelectedLabourId('');
    setTaskForm({
      name: task.name,
      volOfWorkMaterial: task.volOfWorkMaterial ?? '',
      materialRate: task.materialRate ?? '',
      volOfWorkLabour: task.volOfWorkLabour ?? '',
      labourRate: task.labourRate ?? '',
      description: task.description || '',
      reraStage: task.reraStage || '',
      targetGroupId: task.groupId
    });
    setShowTaskModal(true);
  };

  const handleSelectLibraryTask = (taskId) => {
    setSelectedLibraryTaskId(taskId);
    if (!taskId) {
      setSelectedMaterialId('');
      setSelectedLabourId('');
      return;
    }
    const libTask = libraryTasks.find(t => t.id === taskId);
    if (!libTask) return;

    let newMaterialVol = taskForm.volOfWorkMaterial;
    let newMaterialRate = taskForm.materialRate;
    let newMaterialId = '';
    if (libTask.materials && libTask.materials.length > 0) {
      newMaterialId = libTask.materials[0].id;
      newMaterialVol = libTask.materials[0].quantity;
      if (libTask.materials[0].rate !== undefined && libTask.materials[0].rate !== null) {
        newMaterialRate = libTask.materials[0].rate;
      }
    }

    let newLabourVol = taskForm.volOfWorkLabour;
    let newLabourRate = taskForm.labourRate;
    let newLabourId = '';
    if (libTask.labours && libTask.labours.length > 0) {
      newLabourId = libTask.labours[0].id;
      newLabourVol = libTask.labours[0].quantity;
      const libraryLabourRate = getLibraryLabourRate(libTask.labours[0]);
      if (libraryLabourRate !== null) {
        newLabourRate = libraryLabourRate;
      }
    }

    setSelectedMaterialId(newMaterialId);
    setSelectedLabourId(newLabourId);

    setTaskForm(prev => ({
      ...prev,
      name: libTask.name,
      volOfWorkMaterial: newMaterialVol !== '' && newMaterialVol !== null ? newMaterialVol : prev.volOfWorkMaterial,
      materialRate: newMaterialRate !== '' && newMaterialRate !== null ? newMaterialRate : prev.materialRate,
      volOfWorkLabour: newLabourVol !== '' && newLabourVol !== null ? newLabourVol : prev.volOfWorkLabour,
      labourRate: newLabourRate !== '' && newLabourRate !== null ? newLabourRate : prev.labourRate,
      description: libTask.description ? libTask.description : prev.description
    }));
  };

  const handleSelectMaterialVol = (matId) => {
    setSelectedMaterialId(matId);
    if (!matId) return;
    if (editingTaskId) return;
    const currentLibTask = libraryTasks.find(t => t.id === selectedLibraryTaskId);
    const mat = currentLibTask?.materials?.find(m => m.id === matId);
    if (mat) {
      setTaskForm(prev => ({ 
        ...prev, 
        volOfWorkMaterial: mat.quantity !== undefined && mat.quantity !== null ? mat.quantity : prev.volOfWorkMaterial,
        materialRate: mat.rate !== undefined && mat.rate !== null ? mat.rate : prev.materialRate
      }));
    }
  };

  const handleSelectLabourVol = (labId) => {
    setSelectedLabourId(labId);
    if (!labId) return;
    if (editingTaskId) return;
    const currentLibTask = libraryTasks.find(t => t.id === selectedLibraryTaskId);
    const lab = currentLibTask?.labours?.find(l => l.id === labId);
    if (lab) {
      const libraryLabourRate = getLibraryLabourRate(lab);
      setTaskForm(prev => ({ 
        ...prev, 
        volOfWorkLabour: lab.quantity !== undefined && lab.quantity !== null ? lab.quantity : prev.volOfWorkLabour,
        labourRate: libraryLabourRate !== null ? libraryLabourRate : prev.labourRate
      }));
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskForm.name.trim()) {
      showNotification('Task name is required', 'error');
      return;
    }
    if (!taskForm.targetGroupId) {
      showNotification('Please select a group for this task', 'error');
      return;
    }

    try {
      setSavingTask(true);
      const method = editingTaskId ? 'PUT' : 'POST';
      const payload = editingTaskId
        ? {
            id: editingTaskId,
            type: 'task',
            groupId: taskForm.targetGroupId,
            name: taskForm.name.trim(),
            volOfWorkMaterial: parseFloat(taskForm.volOfWorkMaterial) || 0,
            materialRate: parseFloat(taskForm.materialRate) || 0,
            volOfWorkLabour: parseFloat(taskForm.volOfWorkLabour) || 0,
            labourRate: parseFloat(taskForm.labourRate) || 0,
            description: taskForm.description ? taskForm.description.trim() : null,
            reraStage: taskForm.reraStage || null,
            materials: selectedLibraryTask?.materials || []
          }
        : {
            type: 'task',
            projectId: selectedProjectId,
            groupId: taskForm.targetGroupId,
            name: taskForm.name.trim(),
            volOfWorkMaterial: parseFloat(taskForm.volOfWorkMaterial) || 0,
            materialRate: parseFloat(taskForm.materialRate) || 0,
            volOfWorkLabour: parseFloat(taskForm.volOfWorkLabour) || 0,
            labourRate: parseFloat(taskForm.labourRate) || 0,
            description: taskForm.description ? taskForm.description.trim() : null,
            reraStage: taskForm.reraStage || null,
            materials: selectedLibraryTask?.materials || []
          };

      const res = await fetch('/api/engineering/wbs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) {
        showNotification(result.error || 'Failed to save task', 'error');
        return;
      }

      showNotification(`Task "${taskForm.name}" ${editingTaskId ? 'updated' : 'added'} successfully!`);
      setShowTaskModal(false);
      await fetchWbs(selectedProjectId);
      setSelectedGroupId(taskForm.targetGroupId);
    } catch (err) {
      console.error(err);
      showNotification('An error occurred while saving task', 'error');
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async (taskId, taskName) => {
    if (!window.confirm(`Are you sure you want to delete task "${taskName}"?`)) {
      return;
    }
    try {
      const res = await fetch('/api/engineering/wbs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, type: 'task' })
      });
      if (res.ok) {
        showNotification(`Task "${taskName}" deleted successfully`);
        await fetchWbs(selectedProjectId);
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification(err.error || 'Failed to delete task', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Network error while deleting task', 'error');
    }
  };

  // Filter groups / tasks by search query
  const filteredGroups = groups.map(g => {
    const groupMatches = g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (g.reraStage && g.reraStage.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchingTasks = (g.tasks || []).filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.reraStage && t.reraStage.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (groupMatches || matchingTasks.length > 0) {
      return {
        ...g,
        tasks: searchQuery ? matchingTasks : (g.tasks || [])
      };
    }
    return null;
  }).filter(Boolean);

  // Calculate totals for bifurcation view
  const currentTasks = selectedGroup?.tasks || [];
  const totalMaterialVol = currentTasks.reduce((acc, t) => acc + (t.volOfWorkMaterial || 0), 0);
  const totalLabourVol = currentTasks.reduce((acc, t) => acc + (t.volOfWorkLabour || 0), 0);

  return (
    <div className="premium-page-container" style={{ padding: '0', display: 'flex', height: '100vh', overflow: 'hidden' }}>
      
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          background: notification.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white',
          fontSize: '0.875rem',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          {notification.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Left Pane - Project & WBS Tree View */}
      <div style={{ width: '420px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: 'white' }}>
        
        {/* Top Controls Box */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#be123c' }}></div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Define WBS</h2>
          </div>
          
          {/* Project Selector (Fetched Dynamically from Project List) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              Select Project ({projects.length})
            </label>
            {loadingProjects ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', color: '#64748b', fontSize: '0.85rem' }}>
                <Loader2 size={16} className="animate-spin" color="#be123c" /> Loading projects...
              </div>
            ) : (
              <select 
                className="premium-input" 
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.875rem', fontWeight: 500, borderColor: '#cbd5e1' }}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name} ({proj.company || 'Standard'})
                  </option>
                ))}
              </select>
            )}
          </div>
          
          {/* Action Buttons: Add Group & Add Task */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button 
              className="premium-btn-primary" 
              onClick={handleOpenAddGroup}
              style={{ flex: 1, background: '#be123c', padding: '8px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Plus size={15} /> Add Group
            </button>
            <button 
              className="premium-btn-primary" 
              onClick={() => handleOpenAddTask(selectedGroup)}
              disabled={groups.length === 0}
              style={{ 
                flex: 1, 
                background: groups.length === 0 ? '#94a3b8' : '#9f1239', 
                padding: '8px 12px', 
                fontSize: '0.82rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px',
                cursor: groups.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <Layers size={15} /> Add Task
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="search-wrapper" style={{ position: 'relative' }}>
            <input 
              type="text" 
              className="premium-input" 
              placeholder="Search groups & tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingRight: '32px', width: '100%', height: '36px', fontSize: '0.85rem' }} 
            />
            {searchQuery ? (
              <X 
                size={16} 
                color="#94a3b8" 
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                onClick={() => setSearchQuery('')}
              />
            ) : (
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            )}
          </div>
        </div>

        {/* Tree View Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loadingWbs ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '10px', color: '#64748b' }}>
              <Loader2 size={24} className="animate-spin" color="#be123c" />
              <span style={{ fontSize: '0.85rem' }}>Loading WBS hierarchy...</span>
            </div>
          ) : groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <Folder size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 500, margin: '0 0 6px' }}>No WBS Groups Defined</p>
              <p style={{ fontSize: '0.8rem', margin: 0 }}>Click "Add Group" above to create your first WBS group with RERA stage.</p>
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
              
              {/* Root Project Node */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 600, fontSize: '0.88rem', marginBottom: '8px' }}>
                <Folder size={16} color="#be123c" fill="#be123c" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedProject?.name || 'Project'}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', background: '#ffe4e6', color: '#881337', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>
                  {groups.length} Groups
                </span>
              </div>

              {/* Group Nodes */}
              <div style={{ marginLeft: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filteredGroups.map((group) => {
                  const isExpanded = expandedGroups[group.id] ?? true;
                  const isSelected = selectedGroupId === group.id;
                  const taskCount = group.tasks?.length || 0;

                  return (
                    <div key={group.id} style={{ marginTop: '4px' }}>
                      {/* Group Header Row */}
                      <div 
                        onClick={() => {
                          setSelectedGroupId(group.id);
                        }}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          padding: '6px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: isSelected ? '#ffe4e6' : 'transparent',
                          border: isSelected ? '1px solid #fecdd3' : '1px solid transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* Expand/Collapse Chevron */}
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupExpand(group.id);
                          }}
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          {taskCount > 0 ? (
                            isExpanded ? <ExpandIcon size={14} color="#64748b" /> : <CollapseIcon size={14} color="#64748b" />
                          ) : (
                            <span style={{ width: 14, display: 'inline-block' }} />
                          )}
                        </span>

                        <Folder size={15} color={isSelected ? "#be123c" : "#f59e0b"} fill={isSelected ? "#be123c" : "#f59e0b"} />
                        
                        <span style={{ 
                          fontWeight: 600, 
                          fontSize: '0.85rem', 
                          color: isSelected ? '#881337' : '#1e293b',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {group.name}
                        </span>

                        {/* RERA Stage Badge */}
                        {group.reraStage && (
                          <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 500 }}>
                            {group.reraStage}
                          </span>
                        )}

                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '0 4px' }}>
                          ({taskCount})
                        </span>

                        {/* Quick Group Actions */}
                        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                          <button
                            type="button"
                            title="Add Task to Group"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddTask(group);
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#be123c' }}
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            type="button"
                            title="Edit Group"
                            onClick={(e) => handleOpenEditGroup(group, e)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748b' }}
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            type="button"
                            title="Delete Group"
                            onClick={(e) => handleDeleteGroup(group.id, group.name, e)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#ef4444' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Child Tasks */}
                      {isExpanded && taskCount > 0 && (
                        <div style={{ marginLeft: '22px', borderLeft: '1px dashed #cbd5e1', paddingLeft: '8px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {group.tasks.map(task => (
                            <div 
                              key={task.id}
                              onClick={() => setSelectedGroupId(group.id)}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                padding: '4px 6px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                color: '#334155',
                                cursor: 'pointer'
                              }}
                            >
                              <Layers size={13} color="#be123c" />
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {task.name}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                M: {task.volOfWorkMaterial || 0} | L: {task.volOfWorkLabour || 0}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane - Task Bifurcation View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflowY: 'auto' }}>
        
        {/* Top Breadcrumb Bar */}
        <div style={{ 
          padding: '14px 24px', borderBottom: '1px solid #e2e8f0', background: 'white',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#334155' }}>
            <span style={{ fontWeight: 600, color: '#be123c' }}>{selectedProject?.name || 'Project'}</span>
            <ChevronRight size={14} color="#94a3b8" />
            <span style={{ fontWeight: 500 }}>WBS Bifurcation</span>
          </div>

          <div className="breadcrumb" style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            <Home size={13} /> Home <ChevronRight size={13} /> Engineering <ChevronRight size={13} /> Define WBS
          </div>
        </div>

        {/* Bifurcation Content */}
        <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header Card for Selected Group */}
          {selectedGroup ? (
            <div style={{ 
              background: 'white', 
              borderRadius: '10px', 
              border: '1px solid #e2e8f0', 
              padding: '20px 24px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <Folder size={20} color="#be123c" fill="#be123c" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    {selectedGroup.name}
                  </h3>
                  <span style={{ 
                    padding: '3px 10px', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    background: '#fff1f2', 
                    color: '#9f1239',
                    border: '1px solid #fecdd3'
                  }}>
                    RERA: {selectedGroup.reraStage || 'Standard'}
                  </span>
                  
                  {(selectedGroup.budgetAmount !== undefined || selectedGroup.rate !== undefined) && (
                    <span style={{ 
                      padding: '3px 10px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      background: '#fef2f2', 
                      color: '#991b1b',
                      border: '1px solid #fecaca'
                    }}>
                      Budget: ₹{selectedGroup.budgetAmount || selectedGroup.rate}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Total Tasks in Group: <strong>{currentTasks.length}</strong> | Material Vol: <strong>{totalMaterialVol.toLocaleString()}</strong> | Labour Vol: <strong>{totalLabourVol.toLocaleString()}</strong>
                </p>
              </div>

              {/* Add Task Button for Bifurcation */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="premium-btn-primary" 
                  onClick={() => handleOpenAddTask(selectedGroup)}
                  style={{ 
                    background: '#be123c', 
                    padding: '8px 18px', 
                    fontSize: '0.85rem', 
                    borderRadius: '6px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    fontWeight: 600,
                    boxShadow: '0 2px 4px rgba(14,165,233,0.2)'
                  }}
                >
                  <Plus size={16} /> Add Task to {selectedGroup.name}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ 
              background: 'white', 
              borderRadius: '10px', 
              border: '1px solid #e2e8f0', 
              padding: '24px', 
              textAlign: 'center',
              color: '#64748b'
            }}>
              <p style={{ margin: '0 0 8px', fontWeight: 500 }}>No group selected.</p>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Create or select a group from the left pane to view and add task bifurcations.</p>
            </div>
          )}

          {/* Task Bifurcation Table */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#be123c" />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                  Task Bifurcation Details
                </h4>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Showing {currentTasks.length} task(s)
              </span>
            </div>

            <table className="premium-data-table" style={{ width: '100%' }}>
              <thead>
                <tr style={{ background: '#be123c', color: 'white', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.85rem', width: '50px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.85rem', width: '20%' }}>Task Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.85rem', width: '12%' }}>RERA Stage</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.85rem', width: '16%', textAlign: 'right' }}>Mat Vol & Rate</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.85rem', width: '16%', textAlign: 'right' }}>Lab Vol & Rate</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.85rem', width: '14%', textAlign: 'right' }}>Task Budget (₹)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.85rem', width: '12%', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentTasks.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8' }}>
                      <Layers size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                      <p style={{ margin: '0 0 6px', fontWeight: 500, fontSize: '0.95rem' }}>No Tasks in this Group</p>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>Click "Add Task to {selectedGroup?.name || 'Group'}" to add tasks with material & labour work volumes.</p>
                    </td>
                  </tr>
                ) : (
                  currentTasks.map((task, idx) => (
                    <tr key={task.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                        {task.name}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>
                        <span style={{ background: '#f8fafc', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                          {task.reraStage || selectedGroup?.reraStage || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.88rem', fontWeight: 600, color: '#be123c' }}>
                        <div>{parseFloat(task.volOfWorkMaterial || 0).toLocaleString()} <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b'}}>Vol</span></div>
                        <div style={{fontSize: '0.75rem', marginTop: '2px', fontWeight: 'normal', color: '#475569'}}>@ ₹{parseFloat(task.materialRate || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.88rem', fontWeight: 600, color: '#10b981' }}>
                        <div>{parseFloat(task.volOfWorkLabour || 0).toLocaleString()} <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b'}}>Vol</span></div>
                        <div style={{fontSize: '0.75rem', marginTop: '2px', fontWeight: 'normal', color: '#475569'}}>@ ₹{parseFloat(task.labourRate || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                        ₹{parseFloat(task.totalAmount || (((parseFloat(task.volOfWorkMaterial) || 0) * (parseFloat(task.materialRate) || 0)) + ((parseFloat(task.volOfWorkLabour) || 0) * (parseFloat(task.labourRate) || 0)))).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                          <button
                            type="button"
                            title="Edit Task"
                            onClick={() => handleOpenEditTask(task)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#be123c' }}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            type="button"
                            title="Delete Task"
                            onClick={() => handleDeleteTask(task.id, task.name)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {currentTasks.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 700 }}>
                    <td colSpan="3" style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.85rem', color: '#475569' }}>
                      Group Work Volume Totals:
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.9rem', color: '#be123c' }}>
                      {totalMaterialVol.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.9rem', color: '#10b981' }}>
                      {totalLabourVol.toLocaleString()}
                    </td>
                    <td colSpan="2" style={{ padding: '12px 16px' }}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Footer Brand Line */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: 'auto' }}>
            <span>Powered by Kanix Infotech Pvt. Ltd.</span>
            <span style={{ color: '#be123c' }}>India's first Construction ERP Software. Ver: 33.00.00</span>
          </div>
        </div>
      </div>

      {/* --- ADD / EDIT GROUP MODAL --- */}
      {showGroupModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', width: '480px', maxWidth: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
                {editingGroupId ? 'Edit WBS Group' : 'Add New WBS Group'}
              </h3>
              <button 
                onClick={() => setShowGroupModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#94a3b8', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveGroup}>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Group Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    className="premium-input" 
                    placeholder="e.g. Substructure Works, RCC Structure, Finishing..."
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    RERA Stage
                  </label>
                  <select 
                    className="premium-input"
                    value={groupForm.reraStage}
                    onChange={(e) => setGroupForm({ ...groupForm, reraStage: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    {RERA_STAGES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Group Budget (₹)
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="premium-input" 
                    placeholder="Enter budget..."
                    value={groupForm.budgetAmount !== '' ? groupForm.budgetAmount : groupForm.rate}
                    onChange={(e) => setGroupForm({ ...groupForm, rate: e.target.value, budgetAmount: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-outline" onClick={() => setShowGroupModal(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="premium-btn-primary" 
                  disabled={savingGroup}
                  style={{ background: '#be123c', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {savingGroup ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Save Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT TASK MODAL (BIFURCATION) --- */}
      {showTaskModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', width: '560px', maxWidth: '92%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
                {editingTaskId ? 'Edit Task Bifurcation' : 'Add Task in Bifurcation'}
              </h3>
              <button 
                onClick={() => setShowTaskModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#94a3b8', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveTask}>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Target Group Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Group <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    required
                    className="premium-input"
                    value={taskForm.targetGroupId}
                    onChange={(e) => {
                      const grp = groups.find(g => g.id === e.target.value);
                      setTaskForm({ 
                        ...taskForm, 
                        targetGroupId: e.target.value,
                        reraStage: grp?.reraStage || taskForm.reraStage
                      });
                    }}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {/* Task Name with Task Library Dropdown */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', margin: 0 }}>
                      Task Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#be123c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={11} /> From Task Library
                    </span>
                  </div>

                  {/* Task Library Selector Dropdown */}
                  <div style={{ marginBottom: '8px' }}>
                    <select
                      className="premium-input"
                      value={selectedLibraryTaskId}
                      onChange={(e) => handleSelectLibraryTask(e.target.value)}
                      style={{ 
                        width: '100%', 
                        boxSizing: 'border-box', 
                        backgroundColor: selectedLibraryTaskId ? '#f0f9ff' : '#ffffff',
                        borderColor: selectedLibraryTaskId ? '#7dd3fc' : '#cbd5e1',
                        fontWeight: selectedLibraryTaskId ? 600 : 400,
                        color: selectedLibraryTaskId ? '#881337' : '#475569'
                      }}
                    >
                      <option value="">-- Select Task from Task Library --</option>
                      {Object.entries(
                        libraryTasks.reduce((acc, t) => {
                          const grpKey = `${t.libraryName} • ${t.libraryGroupName}`;
                          if (!acc[grpKey]) acc[grpKey] = [];
                          acc[grpKey].push(t);
                          return acc;
                        }, {})
                      ).map(([grpName, tList]) => (
                        <optgroup key={grpName} label={grpName}>
                          {tList.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.unit || 'Nos'} | {t.materials?.length || 0} materials, {t.labours?.length || 0} labours)
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Task Name Text Input */}
                  <input 
                    type="text" 
                    required
                    className="premium-input" 
                    placeholder="e.g. Column Casting, PCC 1:4:8, Brick Masonry..."
                    value={taskForm.name}
                    onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                  {selectedLibraryTask && (
                    <div style={{ fontSize: '0.72rem', color: '#881337', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={11} />
                      <span>Loaded from {selectedLibraryTask.libraryGroupName} (Standard Qty: {selectedLibraryTask.quantity} {selectedLibraryTask.unit})</span>
                    </div>
                  )}
                </div>

                {/* Material Vol & Labour Vol (Side-by-Side) with Selectors */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Material Vol Column */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', margin: 0 }}>
                        Vol of Work Material
                      </label>
                      {selectedLibraryTask?.materials?.length > 0 && (
                        <span style={{ fontSize: '0.7rem', color: '#be123c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Package size={11} /> {selectedLibraryTask.materials.length} available
                        </span>
                      )}
                    </div>

                    {/* Select Material Vol Dropdown from Library */}
                    {selectedLibraryTask && selectedLibraryTask.materials && selectedLibraryTask.materials.length > 0 && (
                      <div style={{ marginBottom: '6px' }}>
                        <select
                          className="premium-input"
                          value={selectedMaterialId}
                          onChange={(e) => handleSelectMaterialVol(e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            fontSize: '0.78rem',
                            padding: '6px 26px 6px 8px',
                            backgroundColor: selectedMaterialId ? '#f0fdf4' : '#f8fafc',
                            borderColor: selectedMaterialId ? '#86efac' : '#cbd5e1',
                            color: selectedMaterialId ? '#15803d' : '#475569',
                            fontWeight: selectedMaterialId ? 600 : 400
                          }}
                        >
                          <option value="">Select Material Vol...</option>
                          {selectedLibraryTask.materials.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} (Qty: {m.quantity} {m.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <input 
                      type="number" 
                      step="any"
                      className="premium-input" 
                      placeholder="0.00"
                      value={taskForm.volOfWorkMaterial}
                      onChange={(e) => setTaskForm({ ...taskForm, volOfWorkMaterial: e.target.value })}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', margin: 0, display: 'block', marginBottom: '6px' }}>
                        Material Rate (₹)
                      </label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="premium-input" 
                        placeholder="0.00"
                        value={taskForm.materialRate}
                        onChange={(e) => setTaskForm({ ...taskForm, materialRate: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    {selectedMaterial && (
                      <div style={{ fontSize: '0.7rem', color: '#166534', marginTop: '3px' }}>
                        Applied: <strong>{selectedMaterial.name}</strong> ({selectedMaterial.quantity} {selectedMaterial.unit})
                        {selectedMaterial.specification && ` - ${selectedMaterial.specification}`}
                      </div>
                    )}
                  </div>

                  {/* Labour Vol Column */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', margin: 0 }}>
                        Vol of Work Labour
                      </label>
                      {selectedLibraryTask?.labours?.length > 0 && (
                        <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Users size={11} /> {selectedLibraryTask.labours.length} available
                        </span>
                      )}
                    </div>

                    {/* Select Labour Vol Dropdown from Library */}
                    {selectedLibraryTask && selectedLibraryTask.labours && selectedLibraryTask.labours.length > 0 && (
                      <div style={{ marginBottom: '6px' }}>
                        <select
                          className="premium-input"
                          value={selectedLabourId}
                          onChange={(e) => handleSelectLabourVol(e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            fontSize: '0.78rem',
                            padding: '6px 26px 6px 8px',
                            backgroundColor: selectedLabourId ? '#fefce8' : '#f8fafc',
                            borderColor: selectedLabourId ? '#fde047' : '#cbd5e1',
                            color: selectedLabourId ? '#a16207' : '#475569',
                            fontWeight: selectedLabourId ? 600 : 400
                          }}
                        >
                          <option value="">Select Labour Vol...</option>
                          {selectedLibraryTask.labours.map(l => (
                            <option key={l.id} value={l.id}>
                              {l.name} (Qty: {l.quantity} {l.unit} | Rate: ₹{Number(getLibraryLabourRate(l) || 0).toLocaleString('en-IN')})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <input 
                      type="number" 
                      step="any"
                      className="premium-input" 
                      placeholder="0.00"
                      value={taskForm.volOfWorkLabour}
                      onChange={(e) => setTaskForm({ ...taskForm, volOfWorkLabour: e.target.value })}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', margin: 0, display: 'block', marginBottom: '6px' }}>
                        Labour Rate (₹)
                      </label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="premium-input" 
                        placeholder="0.00"
                        value={taskForm.labourRate}
                        onChange={(e) => setTaskForm({ ...taskForm, labourRate: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    {selectedLabour && (
                      <div style={{ fontSize: '0.7rem', color: '#854d0e', marginTop: '3px' }}>
                        Applied: <strong>{selectedLabour.name}</strong> ({selectedLabour.quantity} {selectedLabour.unit})
                        {selectedLabour.specification && ` - ${selectedLabour.specification}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* RERA Stage */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    RERA Stage
                  </label>
                  <select 
                    className="premium-input"
                    value={taskForm.reraStage}
                    onChange={(e) => setTaskForm({ ...taskForm, reraStage: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    {RERA_STAGES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Task Description */}
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Description (Optional)
                  </label>
                  <textarea 
                    className="premium-input" 
                    placeholder="Enter task description or specifications..."
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    style={{ width: '100%', minHeight: '60px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginTop: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Estimated Total Task Budget</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#be123c' }}>
                      ₹{(((parseFloat(taskForm.volOfWorkMaterial) || 0) * (parseFloat(taskForm.materialRate) || 0)) + ((parseFloat(taskForm.volOfWorkLabour) || 0) * (parseFloat(taskForm.labourRate) || 0))).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-outline" onClick={() => setShowTaskModal(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="premium-btn-primary" 
                  disabled={savingTask}
                  style={{ background: '#be123c', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {savingTask ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Save Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
