'use client';
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { usePermissions } from '@/context/PermissionsContext';
import { employeeToolCode } from '@/lib/employeeToolCatalog';
import { 
  Search, FileText, FileSpreadsheet, Download, Home, ChevronRight, ChevronDown,
  Lock, Unlock, History, X, Loader2, CheckCircle, Edit
} from 'lucide-react';
import '../../engineering-ui.css';

function getBudgetTimeline(task) {
  const history = [...(task?.budgetHistories || [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  let approvedAmount = Number(task?.approvedAmount) || 0;
  let allocatedAmount = Number(task?.allocatedAmount) || 0;
  let releasedBudgetAmount = Number(task?.releasedBudgetAmount ?? task?.directAllocatedAmount) || 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const changes = history[index].changes || {};
    if (changes.approvedAmount) approvedAmount = Number(changes.approvedAmount.old) || 0;
    if (changes.allocatedAmount) allocatedAmount = Number(changes.allocatedAmount.old) || 0;
    if (changes.releaseBudget) releasedBudgetAmount = Number(changes.releaseBudget.old) || 0;
  }

  return history.reduce((timeline, entry) => {
    const changes = entry.changes || {};
    const addEvent = (type, previousAmount, amount) => timeline.push({
      id: `${entry.id}-${type}`,
      type,
      createdAt: entry.createdAt,
      previousAmount,
      amount,
      changeAmount: amount - previousAmount,
      approvedAmount,
      allocatedAmount,
      releasedBudgetAmount,
    });

    if (changes.approvedAmount) {
      const previousAmount = approvedAmount;
      approvedAmount = Number(changes.approvedAmount.new) || 0;
      addEvent('Approved budget', previousAmount, approvedAmount);
    }
    if (changes.allocatedAmount) {
      const previousAmount = allocatedAmount;
      allocatedAmount = Number(changes.allocatedAmount.new) || 0;
      addEvent('WBS allocation updated', previousAmount, allocatedAmount);
    }
    if (changes.releaseBudget) {
      const previousAmount = releasedBudgetAmount;
      releasedBudgetAmount = Number(changes.releaseBudget.new) || 0;
      addEvent('Budget released', previousAmount, releasedBudgetAmount);
    }
    return timeline;
  }, []);
}

export default function WBSBudget() {
  const { activeEmployee, hasRight } = usePermissions();
  const canBudgetEdit = projectId => !activeEmployee || hasRight(employeeToolCode('Engineering', 'WBS Budget / Estimate Allocation'), projectId);
  const canBudgetLock = projectId => !activeEmployee || hasRight(employeeToolCode('Engineering', 'WBS Budget Lock'), projectId);
  const canBudgetRelease = projectId => !activeEmployee || hasRight(employeeToolCode('Engineering', 'WBS Budget Release'), projectId);
  const canBudgetView = projectId => canBudgetEdit(projectId) || canBudgetLock(projectId) || canBudgetRelease(projectId);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [tasks, setTasks] = useState([]);
  const [isProjectLocked, setIsProjectLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [expandedTreeNodes, setExpandedTreeNodes] = useState([]);
  const [savingTaskId, setSavingTaskId] = useState(null);
  const [saveSuccessId, setSaveSuccessId] = useState(null);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [historyTask, setHistoryTask] = useState(null);

  const [formData, setFormData] = useState({});

  // Fetch projects and tasks on initial mount
  useEffect(() => {
    React.startTransition(() => fetchProjectsAndTasks());
  }, []);

  async function fetchProjectsAndTasks() {
    try {
      setLoadingProjects(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
        }
      }
      // Employee loads are already scoped by the WBS grants in the API. The
      // sync action is admin-only, so requesting it here would hide all rows.
      await fetchTasks('ALL', true);
    } catch (err) {
      console.error('Failed to load projects/tasks:', err);
      setLoadError(err.message || 'Failed to load WBS budget data.');
    } finally {
      setLoadingProjects(false);
    }
  }

  const fetchTasks = async (projId = selectedProjectId, isSync = false) => {
    try {
      if (isSync) setSyncing(true);
      else setLoading(true);

      const shouldSync = isSync;
      const url = `/api/engineering/wbs-budget?projectId=${projId}${shouldSync ? '&sync=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLoadError('');
        setTasks(data.tasks || data);
        setIsProjectLocked(data.isProjectLocked || false);
        
        // Initialize form data for each task
        const initialForm = {};
        const taskList = data.tasks || data;
        if (activeEmployee) {
          const permittedProjects = [...new Map(
            taskList.filter(task => task.project).map(task => [task.project.id, task.project])
          ).values()];
          setProjects(permittedProjects);
          if (selectedProjectId !== 'ALL' && !permittedProjects.some(project => project.id === selectedProjectId)) {
            setSelectedProjectId('ALL');
          }
        }
        taskList.forEach(t => {
          initialForm[t.id] = {
            approvedAmount: t.approvedAmount ?? 0,
            allocatedAmount: t.allocatedAmount ?? 0,
            releasedBudgetAmount: t.releasedBudgetAmount ?? t.directAllocatedAmount ?? 0,
            releaseAmount: '',
            unallocatedAmount: t.unallocatedAmount ?? 0,
            allocatedEstimateAmount: t.allocatedEstimateAmount ?? 0,
            unallocatedEstimateAmount: t.unallocatedEstimateAmount ?? 0,
            expendedAmount: t.expendedAmount ?? 0,
            budgetHeadCategory: t.budgetHeadCategory || 'Civil Works',
            remark: t.remark || ''
          };
        });
        setFormData(initialForm);

        // Ensure no tree nodes are auto-expanded by default unless already set
        if (expandedTreeNodes.length > 0) {
           // keep existing expanded nodes if refreshing
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        setLoadError(errorData.error || 'Failed to load WBS budget data.');
        setTasks([]);
        setIsProjectLocked(false);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setLoadError(err.message || 'Failed to load WBS budget data.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleProjectFilterChange = (projId) => {
    setSelectedProjectId(projId);
    fetchTasks(projId, true);
  };

  const toggleRow = (task) => {
    if (expandedRow === task.id) {
      setExpandedRow(null);
    } else {
      setExpandedRow(task.id);
      if (!formData[task.id]) {
        setFormData(prev => ({
          ...prev,
          [task.id]: {
            approvedAmount: task.approvedAmount ?? 0,
            allocatedAmount: task.allocatedAmount ?? 0,
            releasedBudgetAmount: task.releasedBudgetAmount ?? task.directAllocatedAmount ?? 0,
            releaseAmount: '',
            unallocatedAmount: task.unallocatedAmount ?? 0,
            allocatedEstimateAmount: task.allocatedEstimateAmount ?? 0,
            unallocatedEstimateAmount: task.unallocatedEstimateAmount ?? 0,
            expendedAmount: task.expendedAmount ?? 0,
            budgetHeadCategory: task.budgetHeadCategory || 'Civil Works',
            remark: task.remark || ''
          }
        }));
      }
    }
  };

  const toggleTreeNode = (taskId) => {
    setExpandedTreeNodes(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
    setExpandedRow(null); // Close any open edit forms when toggling tree nodes
  };

  const handleFieldChange = (taskId, field, value) => {
    setFormData(prev => {
      const changedTask = tasks.find(t => t.id === taskId);
      if (!changedTask || changedTask.wbsGroupId || changedTask.wbsTaskId || field !== 'approvedAmount') return prev;

      const current = prev[taskId] || {};
      const numVal = parseFloat(value) || 0;
      const updated = { ...current, [field]: value };
      updated.unallocatedAmount = (numVal - (Number(current.allocatedAmount ?? changedTask.allocatedAmount) || 0)).toFixed(2);
      return { ...prev, [taskId]: updated };
    });
  };

  const handleSaveBudget = async (task) => {
    if (task.wbsGroupId || task.wbsTaskId) return;
    const taskForm = formData[task.id];
    if (!taskForm) return;

    try {
      setSavingTaskId(task.id);
      const payload = {
        id: task.id,
        approvedAmount: Number(taskForm.approvedAmount) || 0,
        remark: taskForm.remark
      };

      const res = await fetch('/api/engineering/wbs-budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve project budget');
      }

      await fetchTasks(selectedProjectId, false);
      setSaveSuccessId(task.id);
      setTimeout(() => setSaveSuccessId(null), 3000);
    } catch (err) {
      console.error('Error saving budget:', err);
      alert('Failed to approve project budget: ' + err.message);
    } finally {
      setSavingTaskId(null);
    }
  };

  const handleReleaseBudget = async task => {
    const increment = Number(formData[task.id]?.releaseAmount);
    if (!Number.isFinite(increment) || increment <= 0) {
      alert('Enter a positive amount to release.');
      return;
    }
    try {
      setSavingTaskId(task.id);
      const res = await fetch('/api/engineering/wbs-budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, releaseAmount: increment }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to release budget.');
      await fetchTasks(selectedProjectId, false);
      alert('Budget released successfully. The release amount has been added to the timeline.');
    } catch (error) {
      alert('Failed to release budget: ' + error.message);
    } finally {
      setSavingTaskId(null);
    }
  };

  const handleToggleLock = async (task) => {
    try {
      const res = await fetch('/api/engineering/wbs-budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: task.id,
          isLocked: !task.isLocked
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      }
    } catch (err) {
      console.error('Error toggling lock:', err);
    }
  };

  const handleExportReport = (reportType = 'ALL') => {
    const reportTasks = sortedTasks;
    if (!reportTasks.length) return;

    const baseRows = reportTasks.map(task => ({
      Project: task.project?.name || projects.find(project => project.id === task.projectId)?.name || '',
      Company: task.project?.company || '',
      'WBS Item': task.taskName,
      'Row Type': task.wbsTaskId ? 'Task' : task.wbsGroupId ? 'WBS Group' : 'Project Total',
      'Approved Budget': Number(task.approvedAmount) || 0,
      'Allocated Budget': Number(task.allocatedAmount) || 0,
      'Released Budget': Number(task.releasedBudgetAmount ?? task.directAllocatedAmount) || 0,
      'Unallocated Budget': Number(task.unallocatedAmount) || 0,
      'Allocated Estimate (PO/WO)': Number(task.allocatedEstimateAmount) || 0,
      'Unallocated Estimate': Number(task.unallocatedEstimateAmount) || 0,
      Expended: Number(task.expendedAmount) || 0,
      'Budget Head': task.budgetHeadCategory || '',
      Status: task.isLocked ? 'Locked' : 'Open',
      Remark: task.remark || '',
    }));
    const wb = XLSX.utils.book_new();
    const addSheet = (name, rows) => {
      const sheet = XLSX.utils.json_to_sheet(rows);
      if (rows.length) sheet['!cols'] = Object.keys(rows[0]).map(key => ({ wch: Math.min(32, Math.max(14, key.length + 2)) }));
      XLSX.utils.book_append_sheet(wb, sheet, name);
    };

    if (reportType === 'ALL' || reportType === 'WBS') addSheet('WBS Budget', baseRows);
    const budgetRows = reportTasks.filter(task => !task.wbsTaskId).map(task => ({
      Project: task.project?.name || '', Company: task.project?.company || '', 'WBS Item': task.taskName,
      'Approved Amount': Number(task.approvedAmount) || 0, 'Allocated Amount': Number(task.allocatedAmount) || 0,
      'Unallocated Amount': Number(task.unallocatedAmount) || 0,
      'Allocated Estimate (PO/WO)': Number(task.allocatedEstimateAmount) || 0,
      'Unallocated Estimate': Number(task.unallocatedEstimateAmount) || 0,
      Expended: Number(task.expendedAmount) || 0,
    }));
    if (reportType === 'ALL' || reportType === 'ESTIMATE') addSheet('Budget Estimates', budgetRows);

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `WBS_${reportType === 'ALL' ? 'Reports' : reportType === 'ESTIMATE' ? 'Budget_Estimates' : 'Budget'}_${today}.xlsx`);
    setReportsOpen(false);
  };

  const formatVal = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00';
    return Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Sort tasks hierarchically
  const sortedTasks = [];
  const projectIds = [...new Set(tasks.map(t => t.projectId))];
  projectIds.forEach(pid => {
    const pRow = tasks.find(t => t.projectId === pid && !t.wbsGroupId && !t.wbsTaskId);
    if (pRow) sortedTasks.push(pRow);
    
    const groups = tasks.filter(t => t.projectId === pid && t.wbsGroupId && !t.wbsTaskId);
    groups.forEach(g => {
      sortedTasks.push(g);
      const materials = tasks.filter(t => t.projectId === pid && t.wbsGroupId === g.wbsGroupId && t.wbsTaskId);
      materials.forEach(m => sortedTasks.push(m));
    });
    
    const orphans = tasks.filter(t => t.projectId === pid && !sortedTasks.includes(t));
    orphans.forEach(o => sortedTasks.push(o));
  });
  const lockedProjectIds = new Set(
    tasks
      .filter(task => !task.wbsGroupId && !task.wbsTaskId && task.isLocked)
      .map(task => task.projectId)
  );
  const budgetTimeline = historyTask ? getBudgetTimeline(historyTask) : [];
  const budgetWarnings = sortedTasks.filter(task => !task.wbsGroupId && !task.wbsTaskId).flatMap(task => {
    const warnings = [];
    const approved = Number(task.approvedAmount) || 0;
    const allocated = Number(task.allocatedAmount) || 0;
    const estimateAllocated = Number(task.allocatedEstimateAmount) || 0;
    const released = Number(task.releasedBudgetAmount ?? task.directAllocatedAmount) || 0;
    const expended = Number(task.expendedAmount) || 0;
    if (allocated > approved + 0.005) warnings.push(`${task.taskName}: WBS allocation is ₹${formatVal(allocated - approved)} above approved budget.`);
    if (estimateAllocated > released + 0.005) warnings.push(`${task.taskName}: PO/WO estimate allocation is ₹${formatVal(estimateAllocated - released)} above the released budget.`);
    if (estimateAllocated > approved + 0.005) warnings.push(`${task.taskName}: PO/WO estimate is ₹${formatVal(estimateAllocated - approved)} above approved budget.`);
    if (expended > approved + 0.005) warnings.push(`${task.taskName}: billed expended amount is ₹${formatVal(expended - approved)} above approved budget.`);
    if (expended > estimateAllocated + 0.005) warnings.push(`${task.taskName}: billed expended amount is ₹${formatVal(expended - estimateAllocated)} above PO/WO estimate allocation.`);
    return warnings;
  });

  return (
    <div className="premium-page-container" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      
      {/* Top Header */}
      <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '8px', color: '#0ea5e9' }}>
            <FileText size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#334155', margin: 0 }}>WBS Budget</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Work Breakdown Structure & Budget Allocation for Projects</span>
          </div>
        </div>
        
        <div className="breadcrumb" style={{ margin: 0 }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Projects <ChevronRight size={14} /> WBS Budget
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Filters Top Bar */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '24px', alignItems: 'flex-end', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>Project</label>
            <select 
              className="premium-input" 
              style={{ width: '100%' }}
              value={selectedProjectId}
              onChange={(e) => handleProjectFilterChange(e.target.value)}
              disabled={loadingProjects}
            >
              <option value="ALL">-- All Projects ({projects.length}) --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            className="premium-btn-primary"
            style={{ background: '#0ea5e9', height: '40px', padding: '0 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            onClick={() => fetchTasks(selectedProjectId, !activeEmployee)}
            title="Search & Sync Tasks"
          >
            {(loading || syncing) ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            <span>Search</span>
          </button>
        </div>

        {isProjectLocked && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Lock size={20} color="#ef4444" />
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#b91c1c', fontWeight: 700 }}>Project Budget is Locked</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#991b1b' }}>Adding tasks or modifying budget allocations is disabled to prevent discrepancies.</p>
              </div>
            </div>
            <button
              className="btn-secondary" 
              style={{ background: 'white', color: '#b91c1c', border: '1px solid #fca5a5', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
              onClick={() => window.open(`/engineering/tools/set-budget-lock?projectId=${selectedProjectId}`, '_blank')}
            >
              Manage Lock Details â†—
            </button>
          </div>
        )}

        {loadError && (
          <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#b91c1c', fontSize: '.9rem' }}>
            {loadError}
          </div>
        )}

        {budgetWarnings.length > 0 && (
          <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#b91c1c', fontSize: '.88rem' }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                Budget calculation needs attention ({budgetWarnings.length})
              </summary>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                {budgetWarnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}
              </ul>
            </details>
          </div>
        )}

        {/* Action Bar */}
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <button type="button" className="premium-btn-primary" style={{ background: reportsOpen ? '#0369a1' : '#0ea5e9', display: 'flex', alignItems: 'center', gap: '8px', minHeight: 40, padding: '0 14px', borderRadius: 8, boxShadow: reportsOpen ? '0 3px 10px rgba(2,132,199,.2)' : 'none' }} onClick={() => setReportsOpen(open => !open)} aria-expanded={reportsOpen}>
                <FileSpreadsheet size={16} /> Reports <ChevronDown size={14} />
              </button>
              {reportsOpen && <div style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 7px)', left: 0, minWidth: 230, padding: 6, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', boxShadow: '0 12px 30px rgba(15,23,42,.16)' }}>
                {[
                  ['ALL', 'Full WBS reports workbook'],
                  ['WBS', 'WBS budget sheet'],
                  ['ESTIMATE', 'Budget and PO/WO estimates sheet'],
                ].map(([type, label]) => <button key={type} type="button" onClick={() => handleExportReport(type)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 11px', border: 0, borderRadius: 7, background: 'transparent', color: '#334155', fontSize: 13, textAlign: 'left', cursor: 'pointer' }} onMouseEnter={event => { event.currentTarget.style.background = '#f0f9ff'; }} onMouseLeave={event => { event.currentTarget.style.background = 'transparent'; }}>
                  <Download size={15} color="#0284c7" /> {label}
                </button>)}
              </div>}
            </div>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Showing {tasks.length} project task{tasks.length === 1 ? '' : 's'}
            </span>
          </div>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Approve budgets, release funds in stages, and track WBS and PO/WO totals separately.
          </span>
        </div>

        {/* Complex Data Table */}
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="premium-data-table" style={{ width: '100%', minWidth: '1250px' }}>
              <thead>
                <tr>
                  {['Project / WBS Item', 'Approved Budget', 'Allocated Budget', 'Released Budget', 'Unallocated Budget', 'Allocated Estimate (PO/WO)', 'Unallocated Estimate', 'Expended (RA/Purchase Bills)', 'Actions'].map(label => (
                    <th key={label} style={{ background: '#0ea5e9', color: 'white', padding: '12px 10px', textAlign: label === 'Project / WBS Item' ? 'left' : 'right', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8', fontSize: '0.82rem', minWidth: label === 'Project / WBS Item' ? 240 : 135 }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        <Loader2 className="animate-spin" size={20} color="#0ea5e9" />
                        <span>Loading projects and budget data...</span>
                      </div>
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      <p style={{ margin: '0' }}>No tasks found for the selected project filter.</p>
                    </td>
                  </tr>
                ) : (
                  sortedTasks.map((task) => {
                    const isExpanded = expandedRow === task.id;
                    const tf = formData[task.id] || {};
                    const rowData = formData[task.id] || task;
                    const isProject = !task.wbsGroupId && !task.wbsTaskId;
                    const isGroup = task.wbsGroupId && !task.wbsTaskId;
                    const isMaterial = !!task.wbsTaskId;
                    const isBudgetLocked = isProjectLocked || task.isLocked || task.budgetLockActive || lockedProjectIds.has(task.projectId);

                    let parentId = null;
                    if (isGroup) {
                      const pRow = tasks.find(t => t.projectId === task.projectId && !t.wbsGroupId && !t.wbsTaskId);
                      parentId = pRow ? pRow.id : null;
                    } else if (isMaterial) {
                      const gRow = tasks.find(t => t.wbsGroupId === task.wbsGroupId && !t.wbsTaskId);
                      parentId = gRow ? gRow.id : null;
                    }

                    let isVisible = true;
                    if (isGroup && parentId) {
                      isVisible = expandedTreeNodes.includes(parentId);
                    }
                    if (isMaterial) {
                      const pRow = tasks.find(t => t.projectId === task.projectId && !t.wbsGroupId && !t.wbsTaskId);
                      if (parentId) {
                        isVisible = expandedTreeNodes.includes(parentId) && expandedTreeNodes.includes(pRow?.id);
                      } else {
                        isVisible = pRow ? expandedTreeNodes.includes(pRow.id) : true;
                      }
                    }

                    if (!isVisible) return null;

                    let indent = 0;
                    let icon = null;
                    if (isGroup) {
                      indent = 20;
                      icon = <div style={{ width: '8px', height: '8px', borderLeft: '2px solid #94a3b8', borderBottom: '2px solid #94a3b8', marginRight: '6px', marginTop: '-4px' }} />;
                    } else if (isMaterial) {
                      indent = 40;
                    }

                    return (
                      <React.Fragment key={task.id}>
                        <tr style={{ background: isExpanded ? '#f0f9ff' : (isProject ? '#f8fafc' : (isGroup ? '#f1f5f9' : '#ffffff')), borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' }}>
                          <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: `${16 + indent}px` }}>
                            {(!isMaterial) ? (
                              <div 
                                onClick={() => toggleTreeNode(task.id)} 
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}
                                title="Expand/Collapse"
                              >
                                {expandedTreeNodes.includes(task.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </div>
                            ) : (
                              <div style={{ width: '16px' }} />
                            )}
                            {icon}
                            <div>
                              <span style={{ fontSize: '0.85rem', fontWeight: isProject ? 700 : (isGroup ? 600 : 500), color: isProject ? '#0f172a' : (isGroup ? '#1e293b' : '#334155'), whiteSpace: 'nowrap' }}>
                                {task.taskName}
                              </span>
                              {task.project?.company && isProject && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                  {task.project.company}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#0369a1', fontWeight: 600 }}>
                            {formatVal(rowData.approvedAmount)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#0284c7', fontWeight: 600 }}>
                            {isMaterial ? 'â€”' : formatVal(rowData.allocatedAmount)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#0f766e', fontWeight: 700 }}>
                            {isProject ? formatVal(rowData.releasedBudgetAmount ?? rowData.directAllocatedAmount) : 'â€”'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: Number(rowData.unallocatedAmount) < -0.005 ? '#dc2626' : Number(rowData.unallocatedAmount) > 0 ? '#15803d' : '#475569', fontWeight: 700 }}>
                            {isMaterial ? 'â€”' : formatVal(rowData.unallocatedAmount)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: Number(rowData.allocatedEstimateAmount) > Number(rowData.releasedBudgetAmount ?? rowData.directAllocatedAmount) + 0.005 ? '#dc2626' : '#7c3aed', fontWeight: 600 }}>
                            {isProject ? formatVal(rowData.allocatedEstimateAmount) : 'â€”'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: Number(rowData.unallocatedEstimateAmount) < -0.005 ? '#dc2626' : '#7c3aed', fontWeight: 600 }}>
                            {isProject ? formatVal(rowData.unallocatedEstimateAmount) : 'â€”'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: Number(rowData.expendedAmount) > Math.min(Number(rowData.approvedAmount) || 0, Number(rowData.allocatedEstimateAmount) || 0) + 0.005 ? '#dc2626' : '#475569', fontWeight: 600 }}>
                            {isProject ? formatVal(rowData.expendedAmount) : 'â€”'}
                          </td>
                          
                          {/* Actions */}
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                              {isProject && (canBudgetEdit(task.projectId) || canBudgetRelease(task.projectId)) && (
                                <button
                                  type="button"
                                  onClick={() => toggleRow(task)}
                                  title={isBudgetLocked ? 'Budget is locked; unlock it before changing budget.' : canBudgetEdit(task.projectId) ? 'Approve or release budget' : 'Release budget'}
                                  aria-label={isBudgetLocked ? 'Budget is locked' : 'Open project budget actions'}
                                  disabled={isBudgetLocked}
                                  style={{ background: 'none', border: 'none', cursor: isBudgetLocked ? 'not-allowed' : 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4, color: !isBudgetLocked ? '#0284c7' : '#94a3b8', fontSize: '0.72rem' }}
                                >
                                  <Edit size={15} /> Budget
                                </button>
                              )}
                              {(isProject || isGroup || isMaterial) && canBudgetView(task.projectId) && (
                                <button
                                  type="button"
                                  onClick={() => setHistoryTask(task)}
                                  title="View Budget Timeline"
                                  aria-label={`View budget timeline for ${task.taskName}`}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', color: '#475569' }}
                                >
                                  <History size={15} />
                                </button>
                              )}
                              {!isMaterial && canBudgetLock(task.projectId) && <button
                                onClick={() => handleToggleLock(task)}
                                title={task.isLocked ? 'Unlock Budget' : 'Lock Budget'}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                              >
                                {task.isLocked ? <Lock size={15} color="#ef4444" /> : <Unlock size={15} color="#0ea5e9" />}
                              </button>}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Comprehensive Budget Column Editor */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} style={{ padding: '20px', background: 'white', borderBottom: '2px solid #38bdf8' }}>
                              <div style={{ border: '1px solid #bae6fd', borderRadius: '10px', padding: '24px', background: '#f8fafc', position: 'relative', opacity: isBudgetLocked ? 0.8 : 1, pointerEvents: isBudgetLocked ? 'none' : 'auto' }}>
                                
                                <div 
                                  style={{ position: 'absolute', top: '14px', right: '14px', cursor: 'pointer', color: '#0284c7', background: '#e0f2fe', borderRadius: '50%', padding: '4px', pointerEvents: 'auto' }} 
                                  onClick={() => toggleRow(task)}
                                  title="Close editor"
                                >
                                  <X size={16} />
                                </div>
                                
                                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ background: '#0284c7', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {isProject ? 'PROJECT BUDGET APPROVAL' : 'WBS ALLOCATION DETAILS'}
                                  </div>
                                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 600 }}>
                                    {task.taskName}
                                  </h3>
                                  {task.isLocked && (
                                    <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Lock size={12} /> Locked (Unlock to modify)
                                    </span>
                                  )}
                                  {isProject && (
                                    <span style={{ fontSize: '0.75rem', color: '#0ea5e9', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', pointerEvents: 'none' }}>
                                      * Allocation and PO/WO estimate totals update automatically
                                    </span>
                                  )}
                                </div>
                                
                                {/* Approved budget, WBS allocation, and PO/WO estimate totals */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#0284c7', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                      1. Approved Budget
                                    </h4>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>{isProject ? 'Approved project ceiling (₹)' : 'WBS group budget (₹)'}</label>
                                      {isProject ? (
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          className="premium-input"
                                          style={{ width: '100%', fontSize: '0.9rem', fontWeight: 700 }}
                                          value={tf.approvedAmount ?? ''}
                                          onChange={event => handleFieldChange(task.id, 'approvedAmount', event.target.value)}
                                          disabled={task.isLocked || !canBudgetEdit(task.projectId)}
                                        />
                                      ) : <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0369a1' }}>{formatVal(task.approvedAmount)}</div>}
                                    </div>
                                  </div>

                                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#0284c7', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                    2. WBS Allocated Budget
                                    </h4>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>From Define WBS (₹)</label>
                                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0369a1' }}>{formatVal(task.allocatedAmount)}</div>
                                    </div>
                                  </div>

                                  {isProject && <div style={{ background: 'white', border: '1px solid #99f6e4', borderRadius: '8px', padding: '14px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#0f766e', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                      3. Released Budget
                                    </h4>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Cumulative released (₹)</label>
                                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f766e' }}>{formatVal(rowData.releasedBudgetAmount ?? rowData.directAllocatedAmount)}</div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', margin: '10px 0 4px' }}>Release another amount (₹)</label>
                                      <input
                                        type="number"
                                        min="0.01"
                                        max={Math.max(0, Number(task.approvedAmount) - Number(rowData.releasedBudgetAmount ?? rowData.directAllocatedAmount))}
                                        step="0.01"
                                        className="premium-input"
                                        style={{ width: '100%', fontSize: '0.9rem', fontWeight: 700 }}
                                        value={tf.releaseAmount ?? ''}
                                        onChange={event => setFormData(previous => ({ ...previous, [task.id]: { ...previous[task.id], releaseAmount: event.target.value } }))}
                                        disabled={task.isLocked || !canBudgetRelease(task.projectId)}
                                      />
                                    </div>
                                  </div>}

                                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#15803d', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                      4. Unallocated Budget
                                    </h4>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Approved budget minus WBS allocation (₹)</label>
                                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#15803d' }}>{formatVal(rowData.unallocatedAmount)}</div>
                                    </div>
                                  </div>

                                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#7c3aed', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                      5. PO/WO Estimate
                                    </h4>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>PO + WO total (₹)</label>
                                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#7c3aed' }}>{formatVal(rowData.allocatedEstimateAmount)}</div>
                                    </div>
                                  </div>

                                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#7c3aed', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                      6. Unallocated Estimate
                                    </h4>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Released budget minus PO + WO total (₹)</label>
                                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#7c3aed' }}>{formatVal(rowData.unallocatedEstimateAmount)}</div>
                                    </div>
                                  </div>

                                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#475569', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                      7. Expended
                                    </h4>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>RA + purchase bill total (₹)</label>
                                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#475569' }}>{formatVal(rowData.expendedAmount)}</div>
                                    </div>
                                  </div>

                                </div>

                                {/* Additional Categorization & Remark */}
                                <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '6px' }}>
                                    Remark
                                  </label>
                                  <input 
                                    type="text" 
                                    className="premium-input" 
                                    style={{ width: '100%', fontSize: '0.85rem' }}
                                    value={tf.remark ?? ''}
                                    placeholder="Add any specific notes or justifications here..."
                                    onChange={(e) => handleFieldChange(task.id, 'remark', e.target.value)}
                                    disabled={task.isLocked || !isProject || !canBudgetEdit(task.projectId)}
                                  />
                                </div>

                                {/* Bottom Form Action Buttons */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    {saveSuccessId === task.id && (
                                      <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                                        <CheckCircle size={16} /> Approved budget saved successfully!
                                      </span>
                                    )}
                                  </div>
                                  {isProject && (
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                      <button
                                        className="premium-btn-primary"
                                        style={{ background: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}
                                        onClick={() => setHistoryTask(task)}
                                      >
                                        <History size={16} /> View History
                                      </button>
                                      <button
                                        className="premium-btn-primary"
                                        style={{ background: saveSuccessId === task.id ? '#15803d' : '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: 42, padding: '0 20px', borderRadius: 8, fontWeight: 700, boxShadow: saveSuccessId === task.id ? '0 3px 9px rgba(21,128,61,.2)' : '0 3px 9px rgba(2,132,199,.18)', opacity: savingTaskId === task.id || isBudgetLocked || !canBudgetEdit(task.projectId) ? .7 : 1, cursor: savingTaskId === task.id || isBudgetLocked || !canBudgetEdit(task.projectId) ? 'not-allowed' : 'pointer' }}
                                        onClick={() => handleSaveBudget(task)}
                                        disabled={savingTaskId === task.id || isBudgetLocked || !canBudgetEdit(task.projectId)}
                                      >
                                        {savingTaskId === task.id ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle size={17} strokeWidth={2.5} />}
                                        {savingTaskId === task.id ? 'Savingâ€¦' : saveSuccessId === task.id ? 'Approved' : 'Approve Budget'}
                                      </button>
                                      <button
                                        type="button"
                                        className="premium-btn-primary"
                                        style={{ background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: 42, padding: '0 20px', borderRadius: 8, fontWeight: 700, opacity: savingTaskId === task.id || isBudgetLocked || task.isLocked || !canBudgetRelease(task.projectId) ? .7 : 1, cursor: savingTaskId === task.id || isBudgetLocked || task.isLocked || !canBudgetRelease(task.projectId) ? 'not-allowed' : 'pointer' }}
                                        onClick={() => handleReleaseBudget(task)}
                                        disabled={savingTaskId === task.id || isBudgetLocked || task.isLocked || !canBudgetRelease(task.projectId)}
                                      >
                                        {savingTaskId === task.id ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle size={17} />}
                                        Release Budget
                                      </button>
                                    </div>
                                  )}
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {historyTask && (
        <div
          role="presentation"
          onClick={() => setHistoryTask(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, .48)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-timeline-title"
            onClick={event => event.stopPropagation()}
            style={{ width: 'min(760px, 100%)', maxHeight: '85vh', overflow: 'hidden', background: 'white', borderRadius: 12, boxShadow: '0 20px 50px rgba(15,23,42,.25)' }}
          >
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, padding: 20, borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 id="budget-timeline-title" style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem' }}>Budget Timeline</h3>
                <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '.85rem' }}>{historyTask.taskName}</p>
                <p style={{ margin: '8px 0 0', color: '#475569', fontSize: '.85rem' }}>
                  Approved: ₹{formatVal(historyTask.approvedAmount)} · WBS allocated: ₹{formatVal(historyTask.allocatedAmount)} · Released: ₹{formatVal(historyTask.releasedBudgetAmount ?? historyTask.directAllocatedAmount)} · Unallocated: ₹{formatVal(historyTask.unallocatedAmount)}
                </p>
              </div>
              <button type="button" aria-label="Close budget timeline" onClick={() => setHistoryTask(null)} style={{ border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </header>
            <div style={{ padding: 20, overflowY: 'auto', maxHeight: 'calc(85vh - 100px)' }}>
              {budgetTimeline.length === 0 ? (
                <p style={{ margin: 0, color: '#64748b', fontSize: '.9rem' }}>No budget changes have been recorded yet.</p>
              ) : (
                <ol style={{ display: 'grid', gap: 12, listStyle: 'none', margin: 0, padding: 0 }}>
                  {budgetTimeline.slice().reverse().map((entry, index) => (
                    <li key={entry.id} style={{ border: '1px solid #e2e8f0', borderLeft: '4px solid #0ea5e9', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <strong style={{ color: '#0f172a' }}>{entry.type} · Revision {budgetTimeline.length - index}</strong>
                        <time style={{ color: '#64748b', fontSize: '.82rem' }}>{new Date(entry.createdAt).toLocaleString('en-IN')}</time>
                      </div>
                      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, fontSize: '.85rem' }}>
                        <span>Previous: <strong>₹{formatVal(entry.previousAmount)}</strong></span>
                        <span>New total: <strong>₹{formatVal(entry.amount)}</strong></span>
                        {entry.type !== 'Budget released' && <span>Change: <strong>{formatVal(entry.changeAmount)}</strong></span>}
                        {entry.type === 'Budget released' && <span>Released this time: <strong>₹{formatVal(entry.changeAmount)}</strong></span>}
                        <span>{entry.type === 'Budget released' ? 'Released total then' : 'Allocated then'}: <strong>{entry.type === 'Budget released' ? `₹${formatVal(entry.releasedBudgetAmount)}` : `₹${formatVal(entry.allocatedAmount)}`}</strong></span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      )}

    </div>
  );
}
