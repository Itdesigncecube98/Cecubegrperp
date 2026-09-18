'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Lock, Unlock, Shield, ShieldAlert, ShieldCheck, Home, ChevronRight, 
  Layers, Search, Filter, Download, RefreshCw, CheckCircle2, AlertTriangle, 
  Settings, History, Check, X, FileText, Sparkles, SlidersHorizontal, 
  AlertCircle, Eye, ChevronDown, CheckSquare, Square
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

// 8 Task Permissions requested by user:
// 1. editTaskEstimate: Do not allow to edit task estimate
// 2. addTask: Do not allow to add task
// 3. raiseRequisition: Do not allow to raise requisition
// 4. materialIssue: Do not allow material issue
// 5. extraIssue: Do not allow extra issue
// 6. nonEstimatedIssue: Do not allow non estimated issue
// 7. workCompletionEntry: Do not allow work completion entry
// 8. workOrderGeneration: Do not allow work order generation

const PERMISSION_DEFS = [
  {
    key: 'editTaskEstimate',
    label: 'Edit Estimate',
    fullName: 'Edit Task Estimate',
    shortHeader: 'Edit Est.',
    desc: 'Do not allow editing task quantities, unit rates, or baseline budget amounts',
    category: 'Budget'
  },
  {
    key: 'addTask',
    label: 'Add Task',
    fullName: 'Add Child Task',
    shortHeader: 'Add Task',
    desc: 'Do not allow creating new sub-tasks, WBS children, or activities under this item',
    category: 'Planning'
  },
  {
    key: 'raiseRequisition',
    label: 'Raise Requisition',
    fullName: 'Raise Material Requisition',
    shortHeader: 'Requisition',
    desc: 'Do not allow raising store or purchase requisitions for this task materials',
    category: 'Procurement'
  },
  {
    key: 'materialIssue',
    label: 'Material Issue',
    fullName: 'Store Material Issue',
    shortHeader: 'Mat. Issue',
    desc: 'Do not allow store from issuing standard budgeted materials to this activity',
    category: 'Store'
  },
  {
    key: 'extraIssue',
    label: 'Extra Issue',
    fullName: 'Extra Material Issue',
    shortHeader: 'Extra Issue',
    desc: 'Do not allow issuing materials beyond the approved estimated quantity limits',
    category: 'Store'
  },
  {
    key: 'nonEstimatedIssue',
    label: 'Non-Est Issue',
    fullName: 'Non-Estimated Material Issue',
    shortHeader: 'Non-Est Issue',
    desc: 'Do not allow issuing unlisted or unbudgeted materials without engineering variance order',
    category: 'Store'
  },
  {
    key: 'workCompletionEntry',
    label: 'Work Completion',
    fullName: 'Work Completion Entry',
    shortHeader: 'Completion',
    desc: 'Do not allow logging physical measurement sheets or work completion records',
    category: 'Execution'
  },
  {
    key: 'workOrderGeneration',
    label: 'Work Order',
    fullName: 'Work Order Generation',
    shortHeader: 'Work Order',
    desc: 'Do not allow generating subcontractor work orders or contractor service agreements',
    category: 'Execution'
  }
];

export default function TaskLockPage() {
  // Projects
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Tasks & Locks
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [lockStatusFilter, setLockStatusFilter] = useState('ALL'); // ALL, FULLY_LOCKED, PARTIALLY_LOCKED, UNLOCKED

  // Selection for bulk actions
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedTaskForConfig, setSelectedTaskForConfig] = useState(null);
  const [configForm, setConfigForm] = useState({
    permissions: {},
    lockDate: new Date().toISOString().split('T')[0],
    lockRemarks: '',
    lockedBy: 'Aditya Yadav'
  });

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkPermissions, setBulkPermissions] = useState({
    editTaskEstimate: false,
    addTask: false,
    raiseRequisition: false,
    materialIssue: false,
    extraIssue: false,
    nonEstimatedIssue: false,
    workCompletionEntry: false,
    workOrderGeneration: false
  });
  const [bulkRemarks, setBulkRemarks] = useState('Bulk permission update');

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch Projects
  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true);
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setProjects(list);
          if (list.length > 0 && !selectedProjectId) {
            setSelectedProjectId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load projects', err);
        showToast('Failed to load projects', 'error');
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  // 2. Fetch Task Lock Matrix
  useEffect(() => {
    if (!selectedProjectId) return;
    async function loadTaskLocks() {
      setLoadingTasks(true);
      try {
        const res = await fetch(`/api/engineering/tools/task-lock?projectId=${selectedProjectId}`);
        if (res.ok) {
          const data = await res.json();
          setTasks(Array.isArray(data.tasks) ? data.tasks : []);
          setSelectedTaskIds(new Set());
        }
      } catch (err) {
        console.error('Failed to load task lock data', err);
        showToast('Failed to load task locks', 'error');
      } finally {
        setLoadingTasks(false);
      }
    }
    loadTaskLocks();
  }, [selectedProjectId]);

  const handleSyncTaskLibrary = async () => {
    if (!selectedProjectId) return;
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/engineering/tools/task-lock?projectId=${selectedProjectId}&sync=true`);
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        setSelectedTaskIds(new Set());
        showToast('Synced all tasks directly from Task Library!');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to sync from Task Library', 'error');
    } finally {
      setLoadingTasks(false);
    }
  };

  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Distinct groups
  const availableGroups = useMemo(() => {
    const set = new Set();
    tasks.forEach(t => {
      if (t.group) set.add(t.group);
    });
    return Array.from(set);
  }, [tasks]);

  // Lock status calculation
  const getTaskLockSummary = (task) => {
    const p = task.permissions || {};
    const total = PERMISSION_DEFS.length;
    let lockedCount = 0;
    PERMISSION_DEFS.forEach(def => {
      if (p[def.key]) lockedCount++;
    });
    return {
      lockedCount,
      total,
      isFullyLocked: lockedCount === total,
      isUnlocked: lockedCount === 0,
      isPartiallyLocked: lockedCount > 0 && lockedCount < total
    };
  };

  // KPIs
  const stats = useMemo(() => {
    let fullyLocked = 0;
    let partiallyLocked = 0;
    let unlocked = 0;
    let requisitionLocked = 0;
    let materialIssueLocked = 0;
    let estimateLocked = 0;
    let workCompletionLocked = 0;

    tasks.forEach(t => {
      const summary = getTaskLockSummary(t);
      if (summary.isFullyLocked) fullyLocked++;
      else if (summary.isUnlocked) unlocked++;
      else partiallyLocked++;

      const p = t.permissions || {};
      if (p.raiseRequisition) requisitionLocked++;
      if (p.materialIssue || p.extraIssue || p.nonEstimatedIssue) materialIssueLocked++;
      if (p.editTaskEstimate) estimateLocked++;
      if (p.workCompletionEntry) workCompletionLocked++;
    });

    return {
      total: tasks.length,
      fullyLocked,
      partiallyLocked,
      unlocked,
      requisitionLocked,
      materialIssueLocked,
      estimateLocked,
      workCompletionLocked
    };
  }, [tasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (groupFilter !== 'ALL' && t.group !== groupFilter) return false;
      const summary = getTaskLockSummary(t);
      if (lockStatusFilter === 'FULLY_LOCKED' && !summary.isFullyLocked) return false;
      if (lockStatusFilter === 'PARTIALLY_LOCKED' && !summary.isPartiallyLocked) return false;
      if (lockStatusFilter === 'UNLOCKED' && !summary.isUnlocked) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.taskName?.toLowerCase().includes(q) ||
        t.group?.toLowerCase().includes(q) ||
        t.subgroup?.toLowerCase().includes(q) ||
        t.subgroup2?.toLowerCase().includes(q) ||
        t.wbsCode?.toLowerCase().includes(q) ||
        t.lockRemarks?.toLowerCase().includes(q)
      );
    });
  }, [tasks, groupFilter, lockStatusFilter, searchQuery]);

  // Bulk selection toggles
  const handleToggleSelectAll = () => {
    if (selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleToggleSelectRow = (id) => {
    const next = new Set(selectedTaskIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTaskIds(next);
  };

  // 1-Click Toggle for a specific permission on a row
  const handleToggleSinglePermission = async (task, permKey) => {
    const currentVal = !!task.permissions?.[permKey];
    const newVal = !currentVal;

    // Optimistic UI update
    setTasks(prev => prev.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          permissions: {
            ...t.permissions,
            [permKey]: newVal
          }
        };
      }
      return t;
    }));

    try {
      const res = await fetch('/api/engineering/tools/task-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          action: 'TOGGLE_PERMISSION',
          taskId: task.id,
          permissionKey: permKey,
          isLocked: newVal,
          updatedBy: 'Aditya Yadav'
        })
      });

      if (res.ok) {
        const def = PERMISSION_DEFS.find(d => d.key === permKey);
        showToast(`${def?.label || permKey} is now ${newVal ? 'LOCKED (Blocked)' : 'UNLOCKED (Allowed)'}`);
      } else {
        showToast('Failed to save permission change', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving permission', 'error');
    }
  };

  // 1-Click Column Toggle (Lock or Unlock that permission for all tasks or selected tasks)
  const handleToggleColumn = async (permKey, setLocked) => {
    const targetIds = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : tasks.map(t => t.id);
    const targetSet = new Set(targetIds);

    // Optimistic UI update
    setTasks(prev => prev.map(t => {
      if (targetSet.has(t.id)) {
        return {
          ...t,
          permissions: {
            ...t.permissions,
            [permKey]: setLocked
          }
        };
      }
      return t;
    }));

    try {
      const res = await fetch('/api/engineering/tools/task-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          action: 'TOGGLE_COLUMN',
          taskIds: targetIds,
          permissionKey: permKey,
          isLocked: setLocked,
          updatedBy: 'Aditya Yadav'
        })
      });

      if (res.ok) {
        const def = PERMISSION_DEFS.find(d => d.key === permKey);
        showToast(`${setLocked ? 'Locked' : 'Unlocked'} ${def?.label} across ${targetIds.length} tasks!`);
      }
    } catch (err) {
      console.error(err);
      showToast('Error executing column toggle', 'error');
    }
  };

  // Apply Presets
  const handleApplyPreset = async (presetType, presetName) => {
    const targetIds = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : null;

    try {
      const res = await fetch('/api/engineering/tools/task-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          action: 'APPLY_PRESET',
          preset: presetType,
          taskIds: targetIds,
          updatedBy: 'Aditya Yadav'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.tasks) {
          setTasks(data.tasks);
        }
        showToast(`Applied preset: ${presetName}!`);
      } else {
        showToast('Failed to apply preset', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error applying preset', 'error');
    }
  };

  // Open Configuration Modal for single task
  const handleOpenConfigModal = (task) => {
    setSelectedTaskForConfig(task);
    setConfigForm({
      permissions: { ...(task.permissions || {}) },
      lockDate: task.lockDate || new Date().toISOString().split('T')[0],
      lockRemarks: task.lockRemarks || '',
      lockedBy: task.lockedBy || 'Aditya Yadav'
    });
    setShowConfigModal(true);
  };

  // Submit Configuration Modal
  const handleSaveTaskConfig = async (e) => {
    e.preventDefault();
    if (!selectedTaskForConfig || !selectedProjectId) return;

    try {
      const res = await fetch('/api/engineering/tools/task-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          action: 'UPDATE_TASK_CONFIG',
          taskConfig: {
            id: selectedTaskForConfig.id,
            permissions: configForm.permissions,
            lockDate: configForm.lockDate,
            lockRemarks: configForm.lockRemarks,
            lockedBy: configForm.lockedBy
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(prev => prev.map(t => t.id === selectedTaskForConfig.id ? data.task : t));
        showToast(`Permissions updated for ${selectedTaskForConfig.taskName}!`);
        setShowConfigModal(false);
      } else {
        showToast('Failed to update task permissions', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving task permissions', 'error');
    }
  };

  // Submit Bulk Update Modal
  const handleSaveBulkPermissions = async (e) => {
    e.preventDefault();
    if (selectedTaskIds.size === 0 || !selectedProjectId) return;

    const ids = Array.from(selectedTaskIds);
    const targetSet = new Set(ids);
    const todayStr = new Date().toISOString().split('T')[0];

    // Optimistic UI
    setTasks(prev => prev.map(t => {
      if (targetSet.has(t.id)) {
        return {
          ...t,
          permissions: { ...bulkPermissions },
          lockDate: todayStr,
          lockRemarks: bulkRemarks
        };
      }
      return t;
    }));

    try {
      // Bulk update through SAVE_ALL with updated tasks
      const updatedAll = tasks.map(t => {
        if (targetSet.has(t.id)) {
          return {
            ...t,
            permissions: { ...bulkPermissions },
            lockDate: todayStr,
            lockRemarks: bulkRemarks,
            lockedBy: 'Aditya Yadav'
          };
        }
        return t;
      });

      const res = await fetch('/api/engineering/tools/task-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          action: 'SAVE_ALL',
          allTasks: updatedAll
        })
      });

      if (res.ok) {
        showToast(`Updated permissions for ${ids.length} selected tasks!`);
        setShowBulkModal(false);
      }
    } catch (err) {
      console.error(err);
      showToast('Error applying bulk permissions', 'error');
    }
  };

  // Export CSV Matrix
  const handleExportCSV = () => {
    if (tasks.length === 0) return;
    const headers = [
      'WBS', 'Group', 'Subgroup', 'Subgroup 2', 'Task Name',
      'Edit Task Estimate (Locked)',
      'Add Task (Locked)',
      'Raise Requisition (Locked)',
      'Material Issue (Locked)',
      'Extra Issue (Locked)',
      'Non Estimated Issue (Locked)',
      'Work Completion Entry (Locked)',
      'Work Order Generation (Locked)',
      'Lock Date', 'Lock Remarks', 'Locked By'
    ];

    const rows = filteredTasks.map(t => [
      `"${t.wbsCode}"`,
      `"${t.group}"`,
      `"${t.subgroup}"`,
      `"${t.subgroup2 || ''}"`,
      `"${t.taskName}"`,
      t.permissions?.editTaskEstimate ? 'LOCKED' : 'ALLOWED',
      t.permissions?.addTask ? 'LOCKED' : 'ALLOWED',
      t.permissions?.raiseRequisition ? 'LOCKED' : 'ALLOWED',
      t.permissions?.materialIssue ? 'LOCKED' : 'ALLOWED',
      t.permissions?.extraIssue ? 'LOCKED' : 'ALLOWED',
      t.permissions?.nonEstimatedIssue ? 'LOCKED' : 'ALLOWED',
      t.permissions?.workCompletionEntry ? 'LOCKED' : 'ALLOWED',
      t.permissions?.workOrderGeneration ? 'LOCKED' : 'ALLOWED',
      `"${t.lockDate || ''}"`,
      `"${(t.lockRemarks || '').replace(/"/g, '""')}"`,
      `"${t.lockedBy || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Task_Permissions_Lock_${currentProject?.name || 'Project'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="custom-horizontal-scrollbar" style={{ padding: '1.5rem 2rem', background: '#f8fafc', minHeight: 'calc(100vh - 60px)', color: '#0f172a', overflowX: 'auto', minWidth: 0 }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '12px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px',
          background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <Home size={14} /> Home <ChevronRight size={14} /> Tools <ChevronRight size={14} /> Task Lock
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={26} color="#6366f1" />
            Task Lock & Permissions Matrix
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Configure and enforce operational permissions: restrict estimate editing, task additions, requisitions, material issues, work completions, and work orders.
          </p>
        </div>

        {/* Project Selector */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Layers size={18} color="#6366f1" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Project:</span>
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={loadingProjects}
            style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '13px', fontWeight: 600, padding: '0.4rem 0.75rem', borderRadius: '8px', outline: 'none', minWidth: '220px' }}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} {p.state ? `(${p.state})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
            <span>Total Tasks</span>
            <FileText size={16} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            WBS activities tracked
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #fecaca', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#dc2626', fontSize: '12px', fontWeight: 600 }}>
            <span>Total Freeze</span>
            <ShieldAlert size={16} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: '6px' }}>
            {stats.fullyLocked}
          </div>
          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
            All 8 permissions locked
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#c2410c', fontSize: '12px', fontWeight: 600 }}>
            <span>Requisition Locked</span>
            <Lock size={16} color="#ea580c" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c2410c', marginTop: '6px' }}>
            {stats.requisitionLocked}
          </div>
          <div style={{ fontSize: '11px', color: '#ea580c', marginTop: '4px' }}>
            Indent creation blocked
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ea580c', fontSize: '12px', fontWeight: 600 }}>
            <span>Issue Locked</span>
            <AlertCircle size={16} color="#ea580c" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ea580c', marginTop: '6px' }}>
            {stats.materialIssueLocked}
          </div>
          <div style={{ fontSize: '11px', color: '#c2410c', marginTop: '4px' }}>
            Store issues blocked
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1d4ed8', fontSize: '12px', fontWeight: 600 }}>
            <span>Estimates Frozen</span>
            <Lock size={16} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1d4ed8', marginTop: '6px' }}>
            {stats.estimateLocked}
          </div>
          <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px' }}>
            Quantity/rate edit blocked
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#15803d', fontSize: '12px', fontWeight: 600 }}>
            <span>Work Entry Locked</span>
            <ShieldCheck size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', marginTop: '6px' }}>
            {stats.workCompletionLocked}
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>
            Measurement logs blocked
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        
        {/* Preset & Bulk Actions Bar */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={14} color="#6366f1" /> Quick Presets:
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset('LOCK_ALL', 'Total Freeze')}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Lock all 8 permissions across all tasks"
            >
              <Lock size={12} /> Lock All
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('UNLOCK_ALL', 'Total Unfreeze')}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Unlock all permissions across all tasks"
            >
              <Unlock size={12} /> Unlock All
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('LOCK_REQUISITIONS', 'Requisitions & Material Issues')}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              title="Block Requisition, Material Issue, Extra Issue, and Non-Estimated Issue"
            >
              📦 Lock Requisitions & Issues
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('LOCK_ESTIMATES', 'Estimates & Tasks')}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              title="Block editing estimates and creating child tasks"
            >
              📊 Lock Estimates & Add Task
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('LOCK_WORK_ENTRY', 'Work Completion & Work Orders')}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #ddd6fe', background: '#faf5ff', color: '#6d28d9', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              title="Block work completion logging and work order issuance"
            >
              📝 Lock Completion & WO
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedTaskIds.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  setBulkPermissions({
                    editTaskEstimate: true,
                    addTask: true,
                    raiseRequisition: true,
                    materialIssue: true,
                    extraIssue: true,
                    nonEstimatedIssue: true,
                    workCompletionEntry: false,
                    workOrderGeneration: false
                  });
                  setShowBulkModal(true);
                }}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: 'none',
                  background: '#6366f1', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 4px rgba(99, 102, 241, 0.25)'
                }}
              >
                <SlidersHorizontal size={13} />
                Configure Selected ({selectedTaskIds.size})
              </button>
            )}

            <button
              type="button"
              onClick={handleSyncTaskLibrary}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#ffffff', border: '1px solid #cbd5e1', color: '#4338ca',
                padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
              }}
              title="Sync tasks directly from Task Library"
            >
              <RefreshCw size={13} color="#6366f1" /> Sync Task Library
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155',
                padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <Download size={13} /> Export Matrix
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Group filter, Lock filter */}
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
              <input 
                type="text"
                placeholder="Search tasks, hierarchy, remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '6px 12px 6px 30px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', minWidth: '240px' }}
              />
            </div>

            {/* Group Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Group:</span>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              >
                <option value="ALL">All Groups ({availableGroups.length})</option>
                {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Lock Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Filter:</span>
              <select
                value={lockStatusFilter}
                onChange={(e) => setLockStatusFilter(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              >
                <option value="ALL">All States ({tasks.length})</option>
                <option value="FULLY_LOCKED">Fully Locked ({stats.fullyLocked})</option>
                <option value="PARTIALLY_LOCKED">Partially Locked ({stats.partiallyLocked})</option>
                <option value="UNLOCKED">Fully Open ({stats.unlocked})</option>
              </select>
            </div>
          </div>

          {/* Quick Info */}
          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
              <b>Locked</b> = Disallowed / Blocked
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              <b>Allowed</b> = Permitted
            </span>
          </div>
        </div>

        {/* Table */}
        {loadingTasks ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={26} className="spin" style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Loading task permissions for {currentProject?.name}...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8' }}>
            <Lock size={36} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No tasks found matching your filter criteria.</p>
          </div>
        ) : (
          <div 
            className="custom-horizontal-scrollbar"
            style={{ 
              overflowX: 'auto', 
              width: '100%',
              scrollbarWidth: 'thin',
              scrollbarColor: '#6366f1 #e2e8f0',
              paddingBottom: '8px'
            }}
          >
            <table style={{ width: '100%', minWidth: '1550px', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 12px', width: '30px', textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0}
                      onChange={handleToggleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '10px 8px', width: '45px' }}>WBS</th>
                  <th style={{ padding: '10px 10px', minWidth: '140px' }}>Group</th>
                  <th style={{ padding: '10px 10px', minWidth: '130px' }}>Subgroup</th>
                  <th style={{ padding: '10px 10px', minWidth: '120px' }}>Subgroup 2</th>
                  <th style={{ padding: '10px 12px', minWidth: '180px' }}>Task Name</th>

                  {/* 8 Permission Headers with quick column toggle */}
                  {PERMISSION_DEFS.map(def => (
                    <th key={def.key} style={{ padding: '8px 6px', textAlign: 'center', minWidth: '80px', borderLeft: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span title={def.desc} style={{ cursor: 'help', fontWeight: 700, color: '#334155' }}>
                          {def.shortHeader}
                        </span>
                        <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleColumn(def.key, true)}
                            style={{ padding: '1px 3px', fontSize: '9px', borderRadius: '3px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer' }}
                            title={`Lock all: ${def.fullName}`}
                          >
                            🔒
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleColumn(def.key, false)}
                            style={{ padding: '1px 3px', fontSize: '9px', borderRadius: '3px', border: '1px solid #86efac', background: '#dcfce7', color: '#15803d', cursor: 'pointer' }}
                            title={`Unlock all: ${def.fullName}`}
                          >
                            🔓
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}

                  <th style={{ padding: '10px 12px', textAlign: 'center', minWidth: '85px', borderLeft: '1px solid #e2e8f0' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '90px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(t => {
                  const summary = getTaskLockSummary(t);
                  const isSelected = selectedTaskIds.has(t.id);

                  return (
                    <tr 
                      key={t.id} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        background: isSelected ? '#f5f3ff' : 'transparent',
                        transition: 'background 0.15s ease' 
                      }} 
                      onMouseOver={e => !isSelected && (e.currentTarget.style.background = '#f8fafc')} 
                      onMouseOut={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(t.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* WBS */}
                      <td style={{ padding: '10px 8px', fontWeight: 700, color: '#64748b' }}>
                        {t.wbsCode}
                      </td>

                      {/* Group */}
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontSize: '11px', color: '#4338ca', fontWeight: 700, background: '#e0e7ff', padding: '2px 6px', borderRadius: '4px' }}>
                          {t.group}
                        </span>
                      </td>

                      {/* Subgroup */}
                      <td style={{ padding: '10px 10px', fontWeight: 600, color: '#1e293b' }}>
                        {t.subgroup}
                      </td>

                      {/* Subgroup 2 */}
                      <td style={{ padding: '10px 10px', color: '#64748b' }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                          {t.subgroup2 || '-'}
                        </span>
                      </td>

                      {/* Task Name */}
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                        <div>{t.taskName}</div>
                        {t.lockRemarks && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400, marginTop: '2px' }}>
                            💬 {t.lockRemarks}
                          </div>
                        )}
                      </td>

                      {/* 8 Permission Toggles */}
                      {PERMISSION_DEFS.map(def => {
                        const isLocked = !!t.permissions?.[def.key];

                        return (
                          <td key={def.key} style={{ padding: '8px 4px', textAlign: 'center', borderLeft: '1px solid #f8fafc' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleSinglePermission(t, def.key)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                padding: '3px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                                border: `1px solid ${isLocked ? '#fca5a5' : '#86efac'}`,
                                background: isLocked ? '#fee2e2' : '#f0fdf4',
                                color: isLocked ? '#b91c1c' : '#15803d',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                minWidth: '68px'
                              }}
                              title={`Click to ${isLocked ? 'Allow' : 'Lock/Block'} ${def.fullName}`}
                            >
                              {isLocked ? (
                                <>
                                  <Lock size={10} /> Locked
                                </>
                              ) : (
                                <>
                                  <Unlock size={10} /> Allowed
                                </>
                              )}
                            </button>
                          </td>
                        );
                      })}

                      {/* Summary Status Badge */}
                      <td style={{ padding: '10px 10px', textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>
                        {summary.isFullyLocked ? (
                          <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '2px 6px', borderRadius: '99px', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap' }}>
                            🔒 Frozen
                          </span>
                        ) : summary.isUnlocked ? (
                          <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '2px 6px', borderRadius: '99px', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap' }}>
                            🔓 Open
                          </span>
                        ) : (
                          <span style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '2px 6px', borderRadius: '99px', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap' }}>
                            {summary.lockedCount}/8 Locked
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenConfigModal(t)}
                            style={{
                              background: '#f8fafc', border: '1px solid #cbd5e1', color: '#4338ca',
                              padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                            }}
                            title="Open detailed permission settings"
                          >
                            <Settings size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTaskForHistory(t);
                              setShowHistoryModal(true);
                            }}
                            style={{
                              background: '#f8fafc', border: '1px solid #cbd5e1', color: '#64748b',
                              padding: '4px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            title="View permission audit log"
                          >
                            <History size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Detailed Task Lock Configuration */}
      {showConfigModal && selectedTaskForConfig && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '640px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={20} color="#6366f1" />
                  Task Lock Permissions
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  {selectedTaskForConfig.wbsCode} - {selectedTaskForConfig.taskName} ({selectedTaskForConfig.group})
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowConfigModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTaskConfig}>
              <div style={{ padding: '1.5rem', maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Quick Toggle Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                    Quick Action for this Task:
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const next = {};
                        PERMISSION_DEFS.forEach(d => { next[d.key] = true; });
                        setConfigForm({ ...configForm, permissions: next });
                      }}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#dc2626', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Block All (Lock)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = {};
                        PERMISSION_DEFS.forEach(d => { next[d.key] = false; });
                        setConfigForm({ ...configForm, permissions: next });
                      }}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #86efac', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Allow All (Unlock)
                    </button>
                  </div>
                </div>

                {/* 8 Permission Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {PERMISSION_DEFS.map(def => {
                    const isLocked = !!configForm.permissions[def.key];

                    return (
                      <div
                        key={def.key}
                        onClick={() => {
                          setConfigForm({
                            ...configForm,
                            permissions: {
                              ...configForm.permissions,
                              [def.key]: !isLocked
                            }
                          });
                        }}
                        style={{
                          padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                          border: `1.5px solid ${isLocked ? '#fca5a5' : '#cbd5e1'}`,
                          background: isLocked ? '#fff5f5' : '#ffffff',
                          transition: 'all 0.15s ease',
                          display: 'flex', flexDirection: 'column', gap: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: isLocked ? '#dc2626' : '#1e293b' }}>
                            {def.fullName}
                          </span>
                          <span style={{
                            padding: '2px 6px', borderRadius: '99px', fontSize: '10px', fontWeight: 700,
                            background: isLocked ? '#fee2e2' : '#f0fdf4',
                            color: isLocked ? '#b91c1c' : '#15803d',
                            border: `1px solid ${isLocked ? '#fca5a5' : '#86efac'}`
                          }}>
                            {isLocked ? '🔒 LOCKED' : '🔓 ALLOWED'}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '11px', color: isLocked ? '#991b1b' : '#64748b', lineHeight: 1.35 }}>
                          {def.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Manual Lock Date Entry */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Effective Lock Date (Manual Entry) *
                    </label>
                    <input 
                      type="date"
                      required
                      value={configForm.lockDate}
                      onChange={(e) => setConfigForm({ ...configForm, lockDate: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Authorized By
                    </label>
                    <input 
                      type="text"
                      value={configForm.lockedBy}
                      onChange={(e) => setConfigForm({ ...configForm, lockedBy: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Lock Remarks (Manual Entry) */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Reason / Remarks for Lock Restrictions *
                  </label>
                  <textarea 
                    rows={2}
                    required
                    placeholder="e.g. Activity baseline frozen; material issues disallowed until site clearance is issued..."
                    value={configForm.lockRemarks}
                    onChange={(e) => setConfigForm({ ...configForm, lockRemarks: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  style={{ background: '#e2e8f0', border: 'none', color: '#475569', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#6366f1', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Task Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Bulk Permission Modal */}
      {showBulkModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '580px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Bulk Apply Permissions ({selectedTaskIds.size} Tasks)
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Choose which operations to lock or allow across all selected tasks simultaneously.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowBulkModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBulkPermissions}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '480px', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {PERMISSION_DEFS.map(def => {
                    const isLocked = !!bulkPermissions[def.key];

                    return (
                      <div
                        key={def.key}
                        onClick={() => {
                          setBulkPermissions({
                            ...bulkPermissions,
                            [def.key]: !isLocked
                          });
                        }}
                        style={{
                          padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                          border: `1.5px solid ${isLocked ? '#fca5a5' : '#cbd5e1'}`,
                          background: isLocked ? '#fff5f5' : '#ffffff',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 700, color: isLocked ? '#dc2626' : '#1e293b' }}>
                          {def.fullName}
                        </span>
                        <span style={{
                          padding: '2px 6px', borderRadius: '99px', fontSize: '10px', fontWeight: 700,
                          background: isLocked ? '#fee2e2' : '#f0fdf4',
                          color: isLocked ? '#b91c1c' : '#15803d',
                          border: `1px solid ${isLocked ? '#fca5a5' : '#86efac'}`
                        }}>
                          {isLocked ? '🔒 LOCKED' : '🔓 ALLOWED'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Bulk Reason / Remarks
                  </label>
                  <input 
                    type="text"
                    required
                    value={bulkRemarks}
                    onChange={(e) => setBulkRemarks(e.target.value)}
                    placeholder="e.g. Mass freeze applied for quarterly audit..."
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  style={{ background: '#e2e8f0', border: 'none', color: '#475569', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#6366f1', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Apply to {selectedTaskIds.size} Tasks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Audit Trail Modal */}
      {showHistoryModal && selectedTaskForHistory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Task Permission History
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  {selectedTaskForHistory.taskName}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowHistoryModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem', maxHeight: '380px', overflowY: 'auto' }}>
              {selectedTaskForHistory.history && selectedTaskForHistory.history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedTaskForHistory.history.map((h, i) => (
                    <div 
                      key={h.id || i}
                      style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                        padding: '10px 12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '12px', color: '#1e293b' }}>
                          {h.action}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {h.date}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Logged by: {h.user || 'System'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: '#94a3b8', textAlign: 'center' }}>
                  No historical logs recorded yet for this task.
                </p>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{ background: '#0f172a', border: 'none', color: 'white', padding: '8px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
