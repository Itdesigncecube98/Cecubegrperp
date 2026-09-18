'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Home, ChevronRight, Layers, Plus, Filter, Search, 
  Download, Calendar, MessageSquare, History, CheckCircle2, 
  Clock, AlertTriangle, RefreshCw, X, ArrowRight, Shield, 
  Folder, Check, Edit3, Sparkles
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

const STATUS_CONFIG = {
  Tentative: { label: 'Tentative', bg: '#fef3c7', text: '#b45309', border: '#fde68a', desc: 'Subject to design/site clearances' },
  Normal:    { label: 'Normal',    bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', desc: 'Standard baseline schedule' },
  Confirm:   { label: 'Confirm',   bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe', desc: 'Approved and firm commitment' },
  Started:   { label: 'Started',   bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe', desc: 'Physical execution underway' },
  Completed: { label: 'Completed', bg: '#d1fae5', text: '#065f46', border: '#a7f3d0', desc: 'Execution finished & inspected' },
  Closed:    { label: 'Closed',    bg: '#f3f4f6', text: '#374151', border: '#d1d5db', desc: 'Sign-off complete & closed' }
};

export default function TaskStatusPage() {
  // Projects
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');

  // Add Task Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    group: '',
    subgroup: '',
    subgroup2: '',
    taskName: '',
    status: 'Normal',
    changeDate: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  // Change Status Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTaskForStatus, setSelectedTaskForStatus] = useState(null);
  const [statusForm, setStatusForm] = useState({
    newStatus: 'Started',
    changeDate: new Date().toISOString().split('T')[0],
    remarks: '',
    changedBy: 'Aditya Yadav'
  });

  // History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState(null);

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch projects from Project List
  useEffect(() => {
    async function fetchProjects() {
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
    fetchProjects();
  }, []);

  // 2. Fetch Tasks when Project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    async function fetchTasks() {
      setLoadingTasks(true);
      try {
        const res = await fetch(`/api/engineering/tools/task-status?projectId=${selectedProjectId}`);
        if (res.ok) {
          const data = await res.json();
          setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        }
      } catch (err) {
        console.error('Failed to load tasks', err);
        showToast('Failed to load tasks', 'error');
      } finally {
        setLoadingTasks(false);
      }
    }
    fetchTasks();
  }, [selectedProjectId]);

  const handleSyncTaskLibrary = async () => {
    if (!selectedProjectId) return;
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/engineering/tools/task-status?projectId=${selectedProjectId}&sync=true`);
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
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

  // Distinct groups & subgroups
  const availableGroups = useMemo(() => {
    const set = new Set();
    tasks.forEach(t => {
      if (t.group) set.add(t.group);
    });
    return Array.from(set);
  }, [tasks]);

  const availableSubgroups = useMemo(() => {
    const set = new Set();
    tasks.forEach(t => {
      if (t.subgroup) set.add(t.subgroup);
    });
    return Array.from(set);
  }, [tasks]);

  // Status Counts
  const statusCounts = useMemo(() => {
    const counts = { ALL: tasks.length, Tentative: 0, Normal: 0, Confirm: 0, Started: 0, Completed: 0, Closed: 0 };
    tasks.forEach(t => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });
    return counts;
  }, [tasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (groupFilter !== 'ALL' && t.group !== groupFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.taskName?.toLowerCase().includes(q) ||
        t.group?.toLowerCase().includes(q) ||
        t.subgroup?.toLowerCase().includes(q) ||
        t.subgroup2?.toLowerCase().includes(q) ||
        t.remarks?.toLowerCase().includes(q) ||
        t.wbsCode?.toLowerCase().includes(q)
      );
    });
  }, [tasks, statusFilter, groupFilter, searchQuery]);

  // Open Change Status Modal
  const handleOpenStatusModal = (task) => {
    setSelectedTaskForStatus(task);
    setStatusForm({
      newStatus: task.status,
      changeDate: new Date().toISOString().split('T')[0],
      remarks: '',
      changedBy: 'Aditya Yadav'
    });
    setShowStatusModal(true);
  };

  // Submit Change Status
  const handleSaveStatusChange = async (e) => {
    e.preventDefault();
    if (!selectedTaskForStatus || !selectedProjectId) return;

    try {
      const res = await fetch('/api/engineering/tools/task-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          action: 'UPDATE_STATUS',
          taskUpdate: {
            id: selectedTaskForStatus.id,
            status: statusForm.newStatus,
            changeDate: statusForm.changeDate,
            remarks: statusForm.remarks,
            changedBy: statusForm.changedBy
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(prev => prev.map(t => t.id === selectedTaskForStatus.id ? data.task : t));
        showToast(`Task status changed to ${statusForm.newStatus}!`);
        setShowStatusModal(false);
      } else {
        showToast('Failed to update task status', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating status', 'error');
    }
  };

  // Submit Add New Task
  const handleSaveNewTask = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    try {
      const res = await fetch('/api/engineering/tools/task-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          action: 'ADD_TASK',
          task: {
            ...newTaskForm,
            wbsCode: `${tasks.length + 1}.0`,
            changedBy: 'Aditya Yadav'
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(prev => [data.task, ...prev]);
        showToast('New task added successfully!');
        setShowAddModal(false);
        setNewTaskForm({
          group: availableGroups[0] || '',
          subgroup: availableSubgroups[0] || '',
          subgroup2: '',
          taskName: '',
          status: 'Normal',
          changeDate: new Date().toISOString().split('T')[0],
          remarks: ''
        });
      } else {
        showToast('Failed to add task', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error adding task', 'error');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (tasks.length === 0) return;
    const headers = ['WBS', 'Group', 'Subgroup', 'Subgroup 2', 'Task Name', 'Current Status', 'Change Date', 'Remarks'];
    const rows = filteredTasks.map(t => [
      `"${t.wbsCode}"`,
      `"${t.group}"`,
      `"${t.subgroup}"`,
      `"${t.subgroup2 || ''}"`,
      `"${t.taskName}"`,
      `"${t.status}"`,
      `"${t.changeDate}"`,
      `"${(t.remarks || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Task_Status_${currentProject?.name || 'Project'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="custom-horizontal-scrollbar" style={{ padding: '1.5rem 2rem', background: '#f8fafc', minHeight: 'calc(100vh - 60px)', color: '#0f172a', overflowX: 'auto', minWidth: 0 }}>
      {/* Toast */}
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <Home size={14} /> Home <ChevronRight size={14} /> Tools <ChevronRight size={14} /> Task Status
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={26} color="#059669" />
            Task Status Management
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Track, add and change task lifecycle status: Tentative, Normal, Confirm, Started, Completed, Closed
          </p>
        </div>

        {/* Project Selector */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Layers size={18} color="#059669" />
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

      {/* Status Filter Pills Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          style={{
            padding: '7px 14px', borderRadius: '20px', border: '1px solid',
            borderColor: statusFilter === 'ALL' ? '#0f172a' : '#e2e8f0',
            background: statusFilter === 'ALL' ? '#0f172a' : '#ffffff',
            color: statusFilter === 'ALL' ? '#ffffff' : '#475569',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          All Tasks <span style={{ background: statusFilter === 'ALL' ? '#334155' : '#f1f5f9', padding: '1px 7px', borderRadius: '99px', fontSize: '11px' }}>{statusCounts.ALL}</span>
        </button>

        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const isSelected = statusFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              style={{
                padding: '7px 14px', borderRadius: '20px', border: '1px solid',
                borderColor: isSelected ? cfg.text : cfg.border,
                background: isSelected ? cfg.text : cfg.bg,
                color: isSelected ? '#ffffff' : cfg.text,
                fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              {cfg.label}
              <span style={{ 
                background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)', 
                padding: '1px 7px', borderRadius: '99px', fontSize: '11px' 
              }}>
                {statusCounts[key] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Table Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {/* Actions Toolbar */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Group:</span>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              >
                <option value="ALL">All Groups</option>
                {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSyncTaskLibrary}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#ffffff', border: '1px solid #cbd5e1', color: '#065f46',
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
              }}
              title="Sync tasks directly from Task Library"
            >
              <RefreshCw size={14} color="#059669" /> Sync Task Library
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155',
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <Download size={14} /> Export CSV
            </button>

            <button
              type="button"
              onClick={() => {
                setNewTaskForm({
                  group: availableGroups[0] || 'CeCube Electrical Materials',
                  subgroup: availableSubgroups[0] || 'Wires & Cables',
                  subgroup2: 'Installation Spec',
                  taskName: '',
                  status: 'Normal',
                  changeDate: new Date().toISOString().split('T')[0],
                  remarks: ''
                });
                setShowAddModal(true);
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                border: 'none', color: 'white',
                padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
              }}
            >
              <Plus size={15} /> Add Task
            </button>
          </div>
        </div>

        {/* Table */}
        {loadingTasks ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={26} className="spin" style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Loading task statuses for {currentProject?.name}...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <Activity size={36} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No tasks found matching your filter criteria.</p>
          </div>
        ) : (
          <div 
            className="custom-horizontal-scrollbar"
            style={{ 
              overflowX: 'auto', 
              width: '100%',
              scrollbarWidth: 'thin',
              scrollbarColor: '#059669 #e2e8f0',
              paddingBottom: '8px'
            }}
          >
            <table style={{ width: '100%', minWidth: '1350px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 14px', width: '50px' }}>WBS</th>
                  <th style={{ padding: '10px 14px' }}>Group</th>
                  <th style={{ padding: '10px 14px' }}>Subgroup</th>
                  <th style={{ padding: '10px 14px' }}>Subgroup 2</th>
                  <th style={{ padding: '10px 14px', minWidth: '220px' }}>Task Name</th>
                  <th style={{ padding: '10px 14px' }}>Current Status</th>
                  <th style={{ padding: '10px 14px' }}>Change Date</th>
                  <th style={{ padding: '10px 14px', minWidth: '200px' }}>Remarks</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(t => {
                  const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.Normal;

                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#64748b' }}>
                        {t.wbsCode}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: '12px', color: '#4338ca', fontWeight: 700, background: '#e0e7ff', padding: '3px 8px', borderRadius: '6px' }}>
                          {t.group}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                          {t.subgroup}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12px' }}>
                        <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          {t.subgroup2 || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                        {t.taskName}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span 
                          onClick={() => handleOpenStatusModal(t)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`,
                            padding: '3px 10px', borderRadius: '99px', fontWeight: 700, fontSize: '12px',
                            cursor: 'pointer'
                          }}
                          title="Click to change status"
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.text }}></span>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={13} color="#94a3b8" />
                          {t.changeDate || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12px' }}>
                        {t.remarks ? (
                          <span title={t.remarks}>
                            {t.remarks.length > 50 ? `${t.remarks.slice(0, 50)}...` : t.remarks}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>No remarks</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(t)}
                            style={{
                              background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a',
                              padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                            title="Change Task Status"
                          >
                            <Edit3 size={13} color="#059669" />
                            <span>Change</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTaskForHistory(t);
                              setShowHistoryModal(true);
                            }}
                            style={{
                              background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569',
                              padding: '5px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            title="View Status Change History"
                          >
                            <History size={14} />
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

      {/* MODAL 1: Change Task Status */}
      {showStatusModal && selectedTaskForStatus && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Change Task Status</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  {selectedTaskForStatus.wbsCode} - {selectedTaskForStatus.taskName}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowStatusModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStatusChange}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Current vs New Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Select New Task Status *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {Object.keys(STATUS_CONFIG).map((st) => {
                      const cfg = STATUS_CONFIG[st];
                      const isSelected = statusForm.newStatus === st;
                      return (
                        <div
                          key={st}
                          onClick={() => setStatusForm({ ...statusForm, newStatus: st })}
                          style={{
                            padding: '10px 8px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer',
                            border: `2px solid ${isSelected ? cfg.text : cfg.border}`,
                            background: isSelected ? cfg.bg : '#ffffff',
                            color: cfg.text, fontWeight: 700, fontSize: '13px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {st}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Change Date (Manual Entry) */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Status Change Date (Manual Entry) *
                  </label>
                  <input 
                    type="date"
                    required
                    value={statusForm.changeDate}
                    onChange={(e) => setStatusForm({ ...statusForm, changeDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Enter the effective date of this status change</span>
                </div>

                {/* Remarks */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Reason & Remarks for Status Change *
                  </label>
                  <textarea 
                    rows={3}
                    required
                    placeholder="e.g. Work started today following client site handover, gang mobilized..."
                    value={statusForm.remarks}
                    onChange={(e) => setStatusForm({ ...statusForm, remarks: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Engineer Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Updated By
                  </label>
                  <input 
                    type="text"
                    value={statusForm.changedBy}
                    onChange={(e) => setStatusForm({ ...statusForm, changedBy: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  style={{ background: '#e2e8f0', border: 'none', color: '#475569', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#059669', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add New Task */}
      {showAddModal && (
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
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Add New Task to Project</h3>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewTask}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Group *</label>
                    <input 
                      type="text"
                      list="grp-list"
                      required
                      placeholder="e.g. CeCube Electrical Materials"
                      value={newTaskForm.group}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, group: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                    <datalist id="grp-list">
                      {availableGroups.map(g => <option key={g} value={g} />)}
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Subgroup *</label>
                    <input 
                      type="text"
                      list="sub-list"
                      required
                      placeholder="e.g. Wires & Cables"
                      value={newTaskForm.subgroup}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, subgroup: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                    <datalist id="sub-list">
                      {availableSubgroups.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Subgroup 2 / Specification</label>
                  <input 
                    type="text"
                    placeholder="e.g. Multi-strand copper 1.5mm"
                    value={newTaskForm.subgroup2}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, subgroup2: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Task Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Copper Wire 1.5mm Point Wiring"
                    value={newTaskForm.taskName}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, taskName: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Initial Status</label>
                    <select
                      value={newTaskForm.status}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, status: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="Tentative">Tentative</option>
                      <option value="Normal">Normal</option>
                      <option value="Confirm">Confirm</option>
                      <option value="Started">Started</option>
                      <option value="Completed">Completed</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Effective Date (Manual Entry)</label>
                    <input 
                      type="date"
                      value={newTaskForm.changeDate}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, changeDate: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Remarks / Scope Notes</label>
                  <textarea 
                    rows={2}
                    placeholder="Enter notes about task scope or material prerequisites..."
                    value={newTaskForm.remarks}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, remarks: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: '#e2e8f0', border: 'none', color: '#475569', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#059669', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Status History Audit Trail */}
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
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Status Change Audit Trail</h3>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedTaskForHistory.history.map((h, i) => {
                    const cfg = STATUS_CONFIG[h.status] || STATUS_CONFIG.Normal;
                    return (
                      <div 
                        key={h.id || i}
                        style={{
                          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                          padding: '12px 14px', position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{
                            background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`,
                            padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700
                          }}>
                            {h.status}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                            {h.date}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#1e293b', marginBottom: '4px' }}>
                          {h.remarks}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Updated by: {h.changedBy || 'System User'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ margin: 0, color: '#94a3b8', textAlign: 'center' }}>No previous history records available.</p>
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
