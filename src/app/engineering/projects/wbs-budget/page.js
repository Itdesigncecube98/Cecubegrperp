'use client';
import React, { useState, useEffect } from 'react';
import { 
  Search, FileText, Home, ChevronRight, ChevronDown,
  Lock, Unlock, History, X, Loader2, CheckCircle, Eye, EyeOff, Edit
} from 'lucide-react';
import '../../engineering-ui.css';

export default function WBSBudget() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [tasks, setTasks] = useState([]);
  const [isProjectLocked, setIsProjectLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [expandedTreeNodes, setExpandedTreeNodes] = useState([]);
  const [amountMode, setAmountMode] = useState('Show Amount');
  const [savingTaskId, setSavingTaskId] = useState(null);
  const [saveSuccessId, setSaveSuccessId] = useState(null);

  // Form state for all budget columns in expanded row
  const [formData, setFormData] = useState({});

  const showAmount = amountMode === 'Show Amount';

  // Fetch projects and tasks on initial mount
  useEffect(() => {
    fetchProjectsAndTasks();
  }, []);

  const fetchProjectsAndTasks = async () => {
    try {
      setLoadingProjects(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
        }
      }
      await fetchTasks('ALL', true);
    } catch (err) {
      console.error('Failed to load projects/tasks:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchTasks = async (projId = selectedProjectId, isSync = false) => {
    try {
      if (isSync) setSyncing(true);
      else setLoading(true);

      const url = `/api/engineering/wbs-budget?projectId=${projId}${isSync ? '&sync=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || data);
        setIsProjectLocked(data.isProjectLocked || false);
        
        // Initialize form data for each task
        const initialForm = {};
        const taskList = data.tasks || data;
        taskList.forEach(t => {
          initialForm[t.id] = {
            approvedBuiltUpArea: t.approvedBuiltUpArea ?? 1,
            approvedRate: t.approvedRate ?? 0,
            approvedAmount: t.approvedAmount ?? 0,
            allocatedRate: t.allocatedRate ?? 0,
            allocatedAmount: t.allocatedAmount ?? 0,
            allocatedEstimateRate: t.allocatedEstimateRate ?? 0,
            allocatedEstimateAmount: t.allocatedEstimateAmount ?? 0,
            unallocatedRate: t.unallocatedRate ?? 0,
            unallocatedAmount: t.unallocatedAmount ?? 0,
            estimateRate: t.estimateRate ?? 0,
            estimateAmount: t.estimateAmount ?? 0,
            expendedRate: t.expendedRate ?? 0,
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
        setTasks([]);
        setIsProjectLocked(false);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
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
            approvedBuiltUpArea: task.approvedBuiltUpArea ?? 1,
            approvedRate: task.approvedRate ?? 0,
            approvedAmount: task.approvedAmount ?? 0,
            allocatedRate: task.allocatedRate ?? 0,
            allocatedAmount: task.allocatedAmount ?? 0,
            allocatedEstimateRate: task.allocatedEstimateRate ?? 0,
            allocatedEstimateAmount: task.allocatedEstimateAmount ?? 0,
            unallocatedRate: task.unallocatedRate ?? 0,
            unallocatedAmount: task.unallocatedAmount ?? 0,
            estimateRate: task.estimateRate ?? 0,
            estimateAmount: task.estimateAmount ?? 0,
            expendedRate: task.expendedRate ?? 0,
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
      if (!changedTask?.wbsGroupId || changedTask.wbsTaskId) return prev;

      const current = prev[taskId] || {};
      const numVal = parseFloat(value) || 0;
      const updated = { ...current, [field]: value };
      const area = parseFloat(field === 'approvedBuiltUpArea' ? numVal : (current.approvedBuiltUpArea || 1));

      const budgetPairs = [
        ['approvedRate', 'approvedAmount'],
        ['allocatedRate', 'allocatedAmount'],
        ['allocatedEstimateRate', 'allocatedEstimateAmount'],
        ['unallocatedRate', 'unallocatedAmount'],
        ['estimateRate', 'estimateAmount'],
        ['expendedRate', 'expendedAmount']
      ];

      for (const [rateField, amountField] of budgetPairs) {
        if (field === rateField || field === 'approvedBuiltUpArea') {
          const rate = field === rateField ? numVal : (Number(current[rateField]) || 0);
          updated[amountField] = (rate * area).toFixed(2);
        } else if (field === amountField && area > 0) {
          updated[rateField] = (numVal / area).toFixed(2);
        }
      }

      const appAmt = parseFloat(updated.approvedAmount ?? current.approvedAmount) || 0;
      const allocAmt = parseFloat(updated.allocatedAmount ?? current.allocatedAmount) || 0;
      if (['approvedBuiltUpArea', 'approvedRate', 'approvedAmount', 'allocatedRate', 'allocatedAmount'].includes(field)) {
        const unalloc = Math.max(0, appAmt - allocAmt);
        updated.unallocatedAmount = unalloc.toFixed(2);
        if (area > 0) {
          updated.unallocatedRate = (unalloc / area).toFixed(2);
        }
      }

      const newForm = { ...prev, [taskId]: updated };

      const parentProject = tasks.find(t => t.projectId === changedTask.projectId && !t.wbsGroupId && !t.wbsTaskId);
      if (parentProject) {
        const projectGroups = tasks.filter(t => t.projectId === changedTask.projectId && t.wbsGroupId && !t.wbsTaskId);
        const projectTotals = {};
        for (const [rateField, amountField] of budgetPairs) {
          const amount = projectGroups.reduce((sum, group) => {
            const groupForm = group.id === taskId ? updated : (newForm[group.id] || group);
            return sum + (Number(groupForm[amountField]) || 0);
          }, 0);
          projectTotals[amountField] = amount.toFixed(2);
          const projectArea = Number(parentProject.approvedBuiltUpArea) || 0;
          projectTotals[rateField] = projectArea > 0 ? (amount / projectArea).toFixed(2) : '0.00';
        }
        newForm[parentProject.id] = {
          ...(newForm[parentProject.id] || parentProject),
          ...projectTotals
        };
      }

      return newForm;
    });
  };

  const handleSaveBudget = async (task) => {
    if (!task.wbsGroupId || task.wbsTaskId) return;
    const taskForm = formData[task.id];
    if (!taskForm) return;

    try {
      setSavingTaskId(task.id);
      const payload = {
        id: task.id,
        approvedBuiltUpArea: Number(taskForm.approvedBuiltUpArea) || 0,
        approvedRate: Number(taskForm.approvedRate) || 0,
        approvedAmount: Number(taskForm.approvedAmount) || 0,
        allocatedRate: Number(taskForm.allocatedRate) || 0,
        allocatedAmount: Number(taskForm.allocatedAmount) || 0,
        allocatedEstimateRate: Number(taskForm.allocatedEstimateRate) || 0,
        allocatedEstimateAmount: Number(taskForm.allocatedEstimateAmount) || 0,
        unallocatedRate: Number(taskForm.unallocatedRate) || 0,
        unallocatedAmount: Number(taskForm.unallocatedAmount) || 0,
        estimateRate: Number(taskForm.estimateRate) || 0,
        estimateAmount: Number(taskForm.estimateAmount) || 0,
        expendedRate: Number(taskForm.expendedRate) || 0,
        expendedAmount: Number(taskForm.expendedAmount) || 0,
        budgetHeadCategory: taskForm.budgetHeadCategory,
        remark: taskForm.remark
      };

      const res = await fetch('/api/engineering/wbs-budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update group budget');
      }

      await fetchTasks(selectedProjectId, false);
      setSaveSuccessId(task.id);
      setTimeout(() => setSaveSuccessId(null), 3000);
    } catch (err) {
      console.error('Error saving budget:', err);
      alert('Failed to save budget columns: ' + err.message);
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

  // Format helpers
  const formatRate = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00';
    return Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVal = (val) => {
    if (amountMode === 'Hide Amount') return '—';
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

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>Amount In</label>
            <select 
              className="premium-input" 
              style={{ width: '100%' }}
              value={amountMode}
              onChange={(e) => setAmountMode(e.target.value)}
            >
              <option value="Show Amount">Show Amount</option>
              <option value="Hide Amount">Hide Amount</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0ea5e9', marginBottom: '8px' }}>View Mode</label>
            <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                <input type="radio" name="viewMode" defaultChecked style={{ accentColor: '#0ea5e9', width: '16px', height: '16px' }} /> WBS
              </label>
            </div>
          </div>
          
          <button
            className="premium-btn-primary"
            style={{ background: '#0ea5e9', height: '40px', padding: '0 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            onClick={() => fetchTasks(selectedProjectId, true)}
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
              Manage Lock Details ↗
            </button>
          </div>
        )}

        {/* Action Bar */}
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="premium-btn-primary" style={{ background: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Reports <ChevronDown size={14} />
            </button>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Showing {tasks.length} project task{tasks.length === 1 ? '' : 's'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: showAmount ? '#0284c7' : '#e11d48', background: showAmount ? '#e0f2fe' : '#ffe4e6', padding: '3px 8px', borderRadius: '4px', fontWeight: 500 }}>
              {showAmount ? <Eye size={13} /> : <EyeOff size={13} />}
              {showAmount ? 'Amounts Visible' : 'Amounts Hidden'}
            </span>
          </div>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Edit budgets on WBS group rows. Task rows are scope-only.
          </span>
        </div>

        {/* Complex Data Table */}
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="premium-data-table" style={{ width: '100%', minWidth: showAmount ? '1350px' : '950px' }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ background: '#0ea5e9', color: 'white', padding: '12px 16px', textAlign: 'left', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8', minWidth: '240px' }}>
                    Project / WBS Item
                  </th>
                  <th colSpan={showAmount ? 3 : 2} style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'center', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8', fontSize: '0.85rem' }}>
                    Approved Budget
                  </th>
                  <th colSpan={showAmount ? 2 : 1} style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'center', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8', fontSize: '0.85rem' }}>
                    Allocated Budget
                  </th>
                  <th colSpan={showAmount ? 2 : 1} style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'center', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8', fontSize: '0.85rem' }}>
                    Allocated Estimate
                  </th>
                  <th colSpan={showAmount ? 2 : 1} style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'center', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8', fontSize: '0.85rem' }}>
                    Unallocated Budget
                  </th>
                  <th colSpan={showAmount ? 2 : 1} style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'center', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8', fontSize: '0.85rem' }}>
                    Estimate
                  </th>
                  <th colSpan={showAmount ? 2 : 1} style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'center', fontSize: '0.85rem', borderBottom: '1px solid #38bdf8' }}>
                    Expended
                  </th>
                  <th rowSpan={2} style={{ background: '#0ea5e9', color: 'white', padding: '12px', textAlign: 'center', borderBottom: '1px solid #38bdf8', width: '80px' }}>
                    Actions
                  </th>
                </tr>
                <tr>
                  {/* Approved Budget */}
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Built-Up Area</th>
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Rate</th>
                  {showAmount && (
                    <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Amount</th>
                  )}
                  
                  {/* Allocated Budget */}
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Rate</th>
                  {showAmount && (
                    <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Amount</th>
                  )}
                  
                  {/* Allocated Estimate */}
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Rate</th>
                  {showAmount && (
                    <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Amount</th>
                  )}
                  
                  {/* Unallocated Budget */}
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Rate</th>
                  {showAmount && (
                    <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Amount</th>
                  )}
                  
                  {/* Estimate */}
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Rate</th>
                  {showAmount && (
                    <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Amount</th>
                  )}
                  
                  {/* Expended */}
                  <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderRight: '1px solid #38bdf8', borderBottom: '1px solid #38bdf8' }}>Rate</th>
                  {showAmount && (
                    <th style={{ background: '#0ea5e9', color: 'white', padding: '8px', textAlign: 'right', fontSize: '0.75rem', borderBottom: '1px solid #38bdf8' }}>Amount</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={showAmount ? 15 : 9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        <Loader2 className="animate-spin" size={20} color="#0ea5e9" />
                        <span>Loading projects and budget data...</span>
                      </div>
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={showAmount ? 15 : 9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
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
                    const isBudgetLocked = isProjectLocked || task.isLocked || lockedProjectIds.has(task.projectId);

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
                            <input type="checkbox" defaultChecked style={{ accentColor: '#0ea5e9' }} />
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
                          
                          {/* Approved Budget */}
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
                            {isMaterial ? '—' : rowData.approvedBuiltUpArea}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
                            {isMaterial ? '—' : formatRate(rowData.approvedRate)}
                          </td>
                          {showAmount && (
                            <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#0369a1', fontWeight: 600 }}>
                              {isMaterial ? '—' : formatVal(rowData.approvedAmount)}
                            </td>
                          )}
                          
                          {/* Allocated Budget */}
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
                            {isMaterial ? '—' : formatRate(rowData.allocatedRate)}
                          </td>
                          {showAmount && (
                            <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#0284c7', fontWeight: 600 }}>
                              {isMaterial ? '—' : formatVal(rowData.allocatedAmount)}
                            </td>
                          )}
                          
                          {/* Allocated Estimate */}
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
                            {isMaterial ? '—' : formatRate(rowData.allocatedEstimateRate)}
                          </td>
                          {showAmount && (
                            <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
                              {isMaterial ? '—' : formatVal(rowData.allocatedEstimateAmount)}
                            </td>
                          )}
                          
                          {/* Unallocated Budget */}
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
                            {isMaterial ? '—' : formatRate(rowData.unallocatedRate)}
                          </td>
                          {showAmount && (
                            <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: task.unallocatedAmount > 0 ? '#15803d' : '#475569', fontWeight: 600 }}>
                              {isMaterial ? '—' : formatVal(rowData.unallocatedAmount)}
                            </td>
                          )}
                          
                          {/* Estimate */}
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
                            {isMaterial ? '—' : formatRate(rowData.estimateRate)}
                          </td>
                          {showAmount && (
                            <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
                              {isMaterial ? '—' : formatVal(rowData.estimateAmount)}
                            </td>
                          )}
                          
                          {/* Expended */}
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#475569' }}>
                            {isMaterial ? '—' : formatRate(rowData.expendedRate)}
                          </td>
                          {showAmount && (
                            <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.8rem', color: '#dc2626', background: '#fecaca', fontWeight: 600 }}>
                              {isMaterial ? '—' : formatVal(rowData.expendedAmount)}
                            </td>
                          )}
                          
                          {/* Actions */}
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {!isMaterial && (
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                {isGroup && (
                                  <button
                                    onClick={() => toggleRow(task)}
                                    title="Edit Group Budget"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                  >
                                    <Edit size={15} color="#0ea5e9" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleToggleLock(task)}
                                  title={task.isLocked ? 'Unlock Budget' : 'Lock Budget'}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                  {task.isLocked ? <Lock size={15} color="#ef4444" /> : <Unlock size={15} color="#0ea5e9" />}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Comprehensive Budget Column Editor */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={showAmount ? 15 : 9} style={{ padding: '20px', background: 'white', borderBottom: '2px solid #38bdf8' }}>
                              <div style={{ border: '1px solid #bae6fd', borderRadius: '10px', padding: '24px', background: '#f8fafc', position: 'relative', opacity: isProject || isBudgetLocked ? 0.8 : 1, pointerEvents: isProject || isBudgetLocked ? 'none' : 'auto' }}>
                                
                                <div 
                                  style={{ position: 'absolute', top: '14px', right: '14px', cursor: 'pointer', color: '#0284c7', background: '#e0f2fe', borderRadius: '50%', padding: '4px', pointerEvents: 'auto' }} 
                                  onClick={() => toggleRow(task)}
                                  title="Close editor"
                                >
                                  <X size={16} />
                                </div>
                                
                                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ background: '#0284c7', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {isProject ? 'AUTO-CALCULATED PROJECT TOTALS' : 'EDIT GROUP BUDGET'}
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
                                      * Totals auto-calculated from WBS groups
                                    </span>
                                  )}
                                </div>
                                
                                {/* 6 Grid Columns for Budget Categories */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                                  
                                  {/* 1. Approved Budget */}
                                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#0284c7', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                      1. Approved Budget
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Built-Up Area</label>
                                        <input 
                                          type="number" 
                                          className="premium-input" 
                                          style={{ width: '100%', fontSize: '0.85rem' }}
                                          value={tf.approvedBuiltUpArea ?? ''}
                                          onChange={(e) => handleFieldChange(task.id, 'approvedBuiltUpArea', e.target.value)}
                                          disabled={task.isLocked || !isGroup}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Approved Rate (₹)</label>
                                        <input 
                                          type="number" 
                                          className="premium-input" 
                                          style={{ width: '100%', fontSize: '0.85rem' }}
                                          value={tf.approvedRate ?? ''}
                                          onChange={(e) => handleFieldChange(task.id, 'approvedRate', e.target.value)}
                                          disabled={task.isLocked || !isGroup}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Approved Amount (₹)</label>
                                      <input 
                                        type="number" 
                                        className="premium-input" 
                                        style={{ width: '100%', fontSize: '0.85rem', fontWeight: 600 }}
                                        value={tf.approvedAmount ?? ''}
                                        onChange={(e) => handleFieldChange(task.id, 'approvedAmount', e.target.value)}
                                        disabled={task.isLocked || !isGroup}
                                      />
                                    </div>
                                  </div>

                                  {/* 2. Allocated Budget */}
                                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#0284c7', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                      2. Allocated Budget
                                    </h4>
                                    <div style={{ marginBottom: '10px' }}>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Allocated Rate (₹)</label>
                                      <input 
                                        type="number" 
                                        className="premium-input" 
                                        style={{ width: '100%', fontSize: '0.85rem' }}
                                        value={tf.allocatedRate ?? ''}
                                        onChange={(e) => handleFieldChange(task.id, 'allocatedRate', e.target.value)}
                                        disabled={task.isLocked || !isGroup}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Allocated Amount (₹)</label>
                                      <input 
                                        type="number" 
                                        className="premium-input" 
                                        style={{ width: '100%', fontSize: '0.85rem', fontWeight: 600 }}
                                        value={tf.allocatedAmount ?? ''}
                                        onChange={(e) => handleFieldChange(task.id, 'allocatedAmount', e.target.value)}
                                        disabled={task.isLocked || !isGroup}
                                      />
                                    </div>
                                  </div>

                                  {/* 3. Allocated Estimate */}
                                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#0284c7', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                      3. Allocated Estimate
                                    </h4>
                                    <div style={{ marginBottom: '10px' }}>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Allocated Estimate Rate (₹)</label>
                                      <input 
                                        type="number" 
                                        className="premium-input" 
                                        style={{ width: '100%', fontSize: '0.85rem' }}
                                        value={tf.allocatedEstimateRate ?? ''}
                                        onChange={(e) => handleFieldChange(task.id, 'allocatedEstimateRate', e.target.value)}
                                        disabled={task.isLocked || !isGroup}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Allocated Estimate Amount (₹)</label>
                                      <input 
                                        type="number" 
                                        className="premium-input" 
                                        style={{ width: '100%', fontSize: '0.85rem' }}
                                        value={tf.allocatedEstimateAmount ?? ''}
                                        onChange={(e) => handleFieldChange(task.id, 'allocatedEstimateAmount', e.target.value)}
                                        disabled={task.isLocked || !isGroup}
                                      />
                                    </div>
                                  </div>

                                  {/* 4. Unallocated Budget */}
                                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#15803d', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                      4. Unallocated Budget
                                    </h4>
                                    <div style={{ marginBottom: '10px' }}>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Unallocated Rate (₹)</label>
                                      <input 
                                        type="number" 
                                        className="premium-input" 
                                        style={{ width: '100%', fontSize: '0.85rem' }}
                                        value={tf.unallocatedRate ?? ''}
                                        onChange={(e) => handleFieldChange(task.id, 'unallocatedRate', e.target.value)}
                                        disabled={task.isLocked || !isGroup}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Unallocated Amount (₹)</label>
                                      <input 
                                        type="number" 
                                        className="premium-input" 
                                        style={{ width: '100%', fontSize: '0.85rem', fontWeight: 600 }}
                                        value={tf.unallocatedAmount ?? ''}
                                        onChange={(e) => handleFieldChange(task.id, 'unallocatedAmount', e.target.value)}
                                        disabled={task.isLocked || !isGroup}
                                      />
                                    </div>
                                  </div>

                                  {/* 5. Estimate */}
                                  <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#0284c7', fontWeight: 600, borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                      5. Estimate
                                    </h4>
                                    <div style={{ marginBottom: '10px' }}>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Estimate Rate (₹)</label>
                                      <input 
                                        type="number" 
                                        className="premium-input" 
                                        style={{ width: '100%', fontSize: '0.85rem' }}
                                        value={tf.estimateRate ?? ''}
                                        onChange={(e) => handleFieldChange(task.id, 'estimateRate', e.target.value)}
                                        disabled={task.isLocked || !isGroup}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Estimate Amount (₹)</label>
                                      <input 
                                        type="number" 
                                        className="premium-input" 
                                        style={{ width: '100%', fontSize: '0.85rem' }}
                                        value={tf.estimateAmount ?? ''}
                                        onChange={(e) => handleFieldChange(task.id, 'estimateAmount', e.target.value)}
                                        disabled={task.isLocked || !isGroup}
                                      />
                                    </div>
                                  </div>

                                  {/* 6. Expended */}
                                  <div style={{ background: 'white', border: '1px solid #fee2e2', borderRadius: '8px', padding: '14px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#dc2626', fontWeight: 600, borderBottom: '1px solid #fee2e2', paddingBottom: '6px' }}>
                                      6. Expended
                                    </h4>
                                    <div style={{ marginBottom: '10px' }}>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Expended Rate (₹)</label>
                                      <input 
                                        type="number" 
                                        className="premium-input" 
                                        style={{ width: '100%', fontSize: '0.85rem' }}
                                        value={tf.expendedRate ?? ''}
                                        onChange={(e) => handleFieldChange(task.id, 'expendedRate', e.target.value)}
                                        disabled={task.isLocked || !isGroup}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Expended Amount (₹)</label>
                                      <input 
                                        type="number" 
                                        className="premium-input" 
                                        style={{ width: '100%', fontSize: '0.85rem', fontWeight: 600, color: '#dc2626' }}
                                        value={tf.expendedAmount ?? ''}
                                        onChange={(e) => handleFieldChange(task.id, 'expendedAmount', e.target.value)}
                                        disabled={task.isLocked || !isGroup}
                                      />
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
                                    disabled={task.isLocked || !isGroup}
                                  />
                                </div>

                                {/* Bottom Form Action Buttons */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    {saveSuccessId === task.id && (
                                      <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                                        <CheckCircle size={16} /> Budget columns saved successfully!
                                      </span>
                                    )}
                                  </div>
                                  {isGroup && (
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                      <button
                                        className="premium-btn-primary"
                                        style={{ background: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}
                                        onClick={() => alert(`History for ${task.taskName}:\nUpdated: ${new Date(task.updatedAt).toLocaleString()}`)}
                                      >
                                        <History size={16} /> View History
                                      </button>
                                      <button
                                        className="premium-btn-primary"
                                        style={{ background: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', fontWeight: 600 }}
                                        onClick={() => handleSaveBudget(task)}
                                        disabled={savingTaskId === task.id || isBudgetLocked}
                                      >
                                        {savingTaskId === task.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                        Save Group Budget
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

    </div>
  );
}
