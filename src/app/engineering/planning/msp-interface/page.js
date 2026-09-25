'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, Layers, Plus, Save, Download, Filter, Eye, RefreshCw,
  Clock, CheckCircle, AlertTriangle, ChevronRight, ChevronDown, 
  Sparkles, Link2, ArrowRight, Folder, FolderPlus, Package, 
  Activity, Zap, Search, ShieldCheck, FileSpreadsheet
} from 'lucide-react';
import '../planning.css';

export default function MspInterface() {
  // Projects
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Schedule & View State
  const [schedule, setSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // 'split', 'sheet', 'gantt', 'critical'
  const [zoomLevel, setZoomLevel] = useState('weeks'); // 'days', 'weeks', 'months'
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Add/Edit Task Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    type: 'material', // 'group', 'subgroup', 'material', 'milestone'
    name: '',
    groupName: '',
    subgroupName: '',
    materialName: '',
    unit: 'Nos',
    plannedQty: 10,
    duration: 5,
    startDate: new Date().toISOString().split('T')[0],
    finishDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    predecessors: '',
    resources: 'Engineering Gang',
    progress: 0,
    isCritical: false
  });

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch Projects from Project List
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
        console.error('Failed to fetch projects', err);
        showToast('Failed to load project list', 'error');
      } finally {
        setLoadingProjects(false);
      }
    }
    fetchProjects();
  }, []);

  // 2. Fetch MSP Schedule when Project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    async function fetchSchedule() {
      setLoadingSchedule(true);
      try {
        const res = await fetch(`/api/engineering/planning/msp?projectId=${selectedProjectId}`);
        if (res.ok) {
          const data = await res.json();
          setSchedule(Array.isArray(data.schedule) ? data.schedule : []);
        }
      } catch (err) {
        console.error('Failed to load MSP schedule', err);
        showToast('Error loading schedule', 'error');
      } finally {
        setLoadingSchedule(false);
      }
    }
    fetchSchedule();
  }, [selectedProjectId]);

  // Selected Project object
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Distinct groups & subgroups for form dropdowns
  const availableGroups = useMemo(() => {
    const set = new Set();
    schedule.forEach(t => {
      if (t.groupName) set.add(t.groupName);
      if (t.type === 'group' && t.name) set.add(t.name);
    });
    return Array.from(set);
  }, [schedule]);

  const availableSubgroups = useMemo(() => {
    const set = new Set();
    schedule.forEach(t => {
      if (t.subgroupName) set.add(t.subgroupName);
      if (t.type === 'subgroup' && t.name) set.add(t.name);
    });
    return Array.from(set);
  }, [schedule]);

  // Toggle Collapse
  const toggleCollapse = (id) => {
    setCollapsedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered schedule
  const filteredSchedule = useMemo(() => {
    return schedule.filter(item => {
      if (viewMode === 'critical' && !item.isCritical) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name?.toLowerCase().includes(q) ||
        item.groupName?.toLowerCase().includes(q) ||
        item.subgroupName?.toLowerCase().includes(q) ||
        item.materialName?.toLowerCase().includes(q) ||
        item.wbsCode?.toLowerCase().includes(q)
      );
    });
  }, [schedule, viewMode, searchQuery]);

  // KPIs
  const stats = useMemo(() => {
    const total = schedule.length;
    const critical = schedule.filter(t => t.isCritical).length;
    const milestones = schedule.filter(t => t.isMilestone || t.duration === 0).length;
    const groupsCount = schedule.filter(t => t.type === 'group').length;
    const subgroupsCount = schedule.filter(t => t.type === 'subgroup').length;
    const materialsCount = schedule.filter(t => t.type === 'material').length;

    const materialTasks = schedule.filter(t => t.type === 'material');
    const avgProgress = materialTasks.length > 0 
      ? Math.round(materialTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / materialTasks.length)
      : (total > 0 ? Math.round(schedule.reduce((acc, t) => acc + (t.progress || 0), 0) / total) : 0);

    return { total, critical, milestones, groupsCount, subgroupsCount, materialsCount, avgProgress };
  }, [schedule]);

  // Timeline Scale Calculation for Gantt
  const timelineDates = useMemo(() => {
    if (schedule.length === 0) return [];
    let minD = new Date();
    let maxD = new Date(Date.now() + 60 * 86400000);

    schedule.forEach(t => {
      if (t.startDate) {
        const d = new Date(t.startDate);
        if (d < minD) minD = d;
      }
      if (t.finishDate) {
        const d = new Date(t.finishDate);
        if (d > maxD) maxD = d;
      }
    });

    const dates = [];
    const cur = new Date(minD);
    cur.setDate(cur.getDate() - 3); // 3-day padding before
    const end = new Date(maxD);
    end.setDate(end.getDate() + 10); // 10-day padding after

    const step = zoomLevel === 'days' ? 1 : (zoomLevel === 'weeks' ? 7 : 14);
    while (cur <= end) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + step);
    }
    return dates;
  }, [schedule, zoomLevel]);

  const timelineStart = timelineDates[0] ? timelineDates[0].getTime() : Date.now();
  const timelineEnd = timelineDates[timelineDates.length - 1] ? timelineDates[timelineDates.length - 1].getTime() : Date.now() + 1;
  const totalTimelineSpan = Math.max(1, timelineEnd - timelineStart);
  const ganttWidthPx = Math.max(900, timelineDates.length * (zoomLevel === 'days' ? 36 : (zoomLevel === 'weeks' ? 75 : 90)));

  const getBarPosition = (startDateStr, finishDateStr) => {
    if (!startDateStr) return { left: 0, width: 0 };
    const s = new Date(startDateStr).getTime();
    const f = finishDateStr ? new Date(finishDateStr).getTime() : s + 86400000;
    const leftRatio = Math.max(0, Math.min(1, (s - timelineStart) / totalTimelineSpan));
    const widthRatio = Math.max(0.01, Math.min(1 - leftRatio, (f - s) / totalTimelineSpan));
    return {
      left: Math.round(leftRatio * ganttWidthPx),
      width: Math.max(14, Math.round(widthRatio * ganttWidthPx))
    };
  };

  // Inline field update
  const handleTaskChange = (id, field, value) => {
    setSchedule(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, [field]: value };
      if (field === 'startDate' || field === 'duration') {
        const s = new Date(updated.startDate || Date.now());
        const dur = parseInt(updated.duration || 1, 10);
        s.setDate(s.getDate() + Math.max(0, dur));
        updated.finishDate = s.toISOString().split('T')[0];
      }
      return updated;
    }));
  };

  // Save Schedule
  const handleSaveSchedule = async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/engineering/planning/msp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, schedule })
      });
      if (res.ok) {
        showToast('MSP Master Schedule saved successfully!');
      } else {
        showToast('Failed to save schedule', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving schedule', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Auto-schedule (Cascade dates via predecessors)
  const handleAutoSchedule = () => {
    const map = new Map(schedule.map(t => [t.wbsCode, t]));
    const updated = schedule.map(t => {
      if (!t.predecessors) return t;
      const predCode = t.predecessors.replace(/[^0-9.]/g, '');
      const predTask = map.get(predCode);
      if (predTask && predTask.finishDate) {
        const newStart = new Date(predTask.finishDate);
        newStart.setDate(newStart.getDate() + 1);
        const newStartStr = newStart.toISOString().split('T')[0];
        const newFinish = new Date(newStart);
        newFinish.setDate(newFinish.getDate() + Math.max(1, t.duration));
        return {
          ...t,
          startDate: newStartStr,
          finishDate: newFinish.toISOString().split('T')[0]
        };
      }
      return t;
    });
    setSchedule(updated);
    showToast('Schedule auto-calculated based on predecessor links!');
  };

  // Modal open for Add/Edit
  const handleOpenAddModal = () => {
    setEditingTask(null);
    setTaskForm({
      type: 'material',
      name: '',
      groupName: availableGroups[0] || 'CeCube Electrical Materials',
      subgroupName: availableSubgroups[0] || 'Wires & Cables',
      materialName: '',
      unit: 'Coil',
      plannedQty: 100,
      duration: 7,
      startDate: new Date().toISOString().split('T')[0],
      finishDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      predecessors: '',
      resources: 'Electrical Gang',
      progress: 0,
      isCritical: false
    });
    setShowTaskModal(true);
  };

  const handleSaveModalTask = (e) => {
    e.preventDefault();
    if (editingTask) {
      setSchedule(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskForm } : t));
      showToast('Task updated successfully');
    } else {
      const nextIndex = schedule.length + 1;
      let nextWbs = `${nextIndex}.0`;
      if (taskForm.type === 'subgroup') {
        nextWbs = `1.${nextIndex}.0`;
      } else if (taskForm.type === 'material') {
        nextWbs = `1.1.${nextIndex}`;
      }

      const newTask = {
        id: `custom-${Date.now()}`,
        rowNumber: nextIndex,
        wbsCode: nextWbs,
        isSummary: taskForm.type === 'group' || taskForm.type === 'subgroup',
        isMilestone: taskForm.type === 'milestone' || taskForm.duration === 0,
        level: taskForm.type === 'group' ? 1 : (taskForm.type === 'subgroup' ? 2 : 3),
        ...taskForm,
        name: taskForm.name || (taskForm.type === 'material' ? `${taskForm.materialName} Installation` : `${taskForm.groupName || taskForm.subgroupName}`)
      };
      setSchedule(prev => [...prev, newTask]);
      showToast('New item added to MSP schedule');
    }
    setShowTaskModal(false);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (schedule.length === 0) return;
    const headers = ['Row', 'WBS', 'Type', 'Task/Material Name', 'Group', 'Subgroup', 'Duration (Days)', 'Start Date', 'Finish Date', 'Predecessors', 'Resources', '% Complete', 'Critical'];
    const rows = schedule.map(t => [
      t.rowNumber,
      `"${t.wbsCode}"`,
      t.type || 'task',
      `"${(t.name || '').replace(/"/g, '""')}"`,
      `"${(t.groupName || '').replace(/"/g, '""')}"`,
      `"${(t.subgroupName || '').replace(/"/g, '""')}"`,
      t.duration,
      t.startDate,
      t.finishDate,
      `"${t.predecessors || ''}"`,
      `"${(t.resources || '').replace(/"/g, '""')}"`,
      t.progress,
      t.isCritical ? 'Yes' : 'No'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MSP_Schedule_${currentProject?.name || 'Project'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="planning-wrapper">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '12px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px',
          background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header with Project Selector */}
      <div className="planning-header">
        <div className="planning-title-area">
          <h1>
            <FileSpreadsheet size={26} color="#6366f1" />
            MSP Master Schedule Interface
          </h1>
          <p>Microsoft Project planning & execution tree with Group, Subgroup, and Material synchronization</p>
        </div>

        <div className="planning-project-select-card">
          <Layers size={18} color="#6366f1" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Project:</span>
          <select 
            className="planning-select"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={loadingProjects}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.state ? `(${p.state})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs strip */}
      <div className="planning-kpi-grid">
        <div className="planning-kpi-card">
          <div className="kpi-icon-box" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
            <Activity size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total Planned Items</div>
            <div className="kpi-value">{stats.total}</div>
          </div>
        </div>

        <div className="planning-kpi-card">
          <div className="kpi-icon-box" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <Zap size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Critical Path Tasks</div>
            <div className="kpi-value" style={{ color: '#dc2626' }}>{stats.critical}</div>
          </div>
        </div>

        <div className="planning-kpi-card">
          <div className="kpi-icon-box" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <CheckCircle size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Overall Completion</div>
            <div className="kpi-value" style={{ color: '#15803d' }}>{stats.avgProgress}%</div>
          </div>
        </div>

        <div className="planning-kpi-card">
          <div className="kpi-icon-box" style={{ background: '#faf5ff', color: '#9333ea' }}>
            <Package size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Materials Scheduled</div>
            <div className="kpi-value">{stats.materialsCount}</div>
          </div>
        </div>

        <div className="planning-kpi-card">
          <div className="kpi-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
            <ShieldCheck size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Groups & Subgroups</div>
            <div className="kpi-value">{stats.groupsCount} Grp / {stats.subgroupsCount} Sub</div>
          </div>
        </div>
      </div>

      {/* MS Project Ribbon Toolbar */}
      <div className="msp-ribbon">
        <div className="msp-ribbon-group">
          <button 
            type="button" 
            className={`msp-ribbon-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
          >
            <Eye size={14} /> Gantt View
          </button>
          <button 
            type="button" 
            className={`msp-ribbon-btn ${viewMode === 'sheet' ? 'active' : ''}`}
            onClick={() => setViewMode('sheet')}
          >
            <FileSpreadsheet size={14} /> Task Sheet
          </button>
          <button 
            type="button" 
            className={`msp-ribbon-btn ${viewMode === 'gantt' ? 'active' : ''}`}
            onClick={() => setViewMode('gantt')}
          >
            <Calendar size={14} /> Timeline Only
          </button>
          <button 
            type="button" 
            className={`msp-ribbon-btn ${viewMode === 'critical' ? 'active' : ''}`}
            onClick={() => setViewMode(prev => prev === 'critical' ? 'split' : 'critical')}
          >
            <Zap size={14} color="#f87171" /> Critical Path
          </button>

          <span style={{ height: '18px', width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }}></span>

          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Zoom:</span>
          <button 
            type="button" 
            className={`msp-ribbon-btn ${zoomLevel === 'days' ? 'active' : ''}`}
            onClick={() => setZoomLevel('days')}
          >
            Days
          </button>
          <button 
            type="button" 
            className={`msp-ribbon-btn ${zoomLevel === 'weeks' ? 'active' : ''}`}
            onClick={() => setZoomLevel('weeks')}
          >
            Weeks
          </button>
          <button 
            type="button" 
            className={`msp-ribbon-btn ${zoomLevel === 'months' ? 'active' : ''}`}
            onClick={() => setZoomLevel('months')}
          >
            Months
          </button>
        </div>

        <div className="msp-ribbon-group">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={13} style={{ position: 'absolute', left: '8px', color: '#94a3b8' }} />
            <input 
              type="text"
              placeholder="Search tasks, groups, materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', padding: '4px 8px 4px 26px', borderRadius: '6px', fontSize: '12px', outline: 'none', width: '180px'
              }}
            />
          </div>

          <button 
            type="button" 
            className="msp-ribbon-btn primary"
            onClick={handleOpenAddModal}
          >
            <Plus size={14} /> Add Item
          </button>

          <button 
            type="button" 
            className="msp-ribbon-btn"
            onClick={handleAutoSchedule}
            title="Auto calculate dates based on predecessors"
          >
            <Sparkles size={14} color="#fbbf24" /> Auto-Schedule
          </button>

          <button 
            type="button" 
            className="msp-ribbon-btn"
            onClick={handleSaveSchedule}
            disabled={saving}
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save Plan'}
          </button>

          <button 
            type="button" 
            className="msp-ribbon-btn"
            onClick={handleExportCSV}
            title="Export schedule to Excel/CSV"
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Main Workspace Card */}
      <div className="msp-workspace-card">
        {loadingSchedule ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={28} className="spin" style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Loading MSP Schedule for {currentProject?.name}...</p>
          </div>
        ) : (
          <div className="msp-split-container">
            {/* LEFT PANE: Task Sheet Grid */}
            {(viewMode === 'split' || viewMode === 'sheet') && (
              <div 
                className="msp-table-pane custom-horizontal-scrollbar" 
                style={{ 
                  flex: viewMode === 'sheet' ? '1' : '0 0 58%',
                  overflowX: 'auto',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#3b82f6 #e2e8f0'
                }}
              >
                <table className="msp-table" style={{ minWidth: viewMode === 'sheet' ? '1200px' : '950px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                      <th style={{ width: '65px' }}>WBS</th>
                      <th style={{ width: '80px' }}>Type</th>
                      <th style={{ minWidth: '220px' }}>Task / Material Name</th>
                      <th style={{ width: '70px', textAlign: 'right' }}>Dur (d)</th>
                      <th style={{ width: '95px' }}>Start</th>
                      <th style={{ width: '95px' }}>Finish</th>
                      <th style={{ width: '75px' }}>Pred</th>
                      <th style={{ minWidth: '130px' }}>Assigned Resource</th>
                      <th style={{ width: '75px', textAlign: 'right' }}>% Comp</th>
                      <th style={{ width: '55px', textAlign: 'center' }}>Crit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchedule.map((t) => {
                      const isSummary = t.isSummary || t.type === 'group' || t.type === 'subgroup';
                      const indentLevel = t.level || (t.type === 'group' ? 1 : (t.type === 'subgroup' ? 2 : 3));

                      return (
                        <tr 
                          key={t.id} 
                          className={`${isSummary ? 'summary-row' : ''} ${t.isCritical ? 'critical-row' : ''}`}
                        >
                          <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>
                            {t.rowNumber}
                          </td>
                          <td style={{ fontWeight: 700, color: '#475569' }}>
                            {t.wbsCode}
                          </td>
                          <td>
                            {t.type === 'group' && (
                              <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                                GROUP
                              </span>
                            )}
                            {t.type === 'subgroup' && (
                              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                                SUBGRP
                              </span>
                            )}
                            {t.type === 'material' && (
                              <span style={{ background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                                MAT
                              </span>
                            )}
                            {t.type === 'milestone' && (
                              <span style={{ background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                                MILE
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: `${(indentLevel - 1) * 16}px`, gap: '6px' }}>
                              {isSummary ? (
                                <span style={{ color: '#6366f1', cursor: 'pointer' }}>
                                  <Folder size={14} />
                                </span>
                              ) : (
                                <span style={{ color: '#059669' }}>
                                  <Package size={13} />
                                </span>
                              )}
                              <input 
                                type="text"
                                value={t.name || ''}
                                onChange={(e) => handleTaskChange(t.id, 'name', e.target.value)}
                                style={{ fontWeight: isSummary ? 700 : 500 }}
                              />
                            </div>
                          </td>
                          <td>
                            <input 
                              type="number"
                              min="0"
                              value={t.duration}
                              onChange={(e) => handleTaskChange(t.id, 'duration', e.target.value)}
                              style={{ textAlign: 'right' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="date"
                              value={t.startDate || ''}
                              onChange={(e) => handleTaskChange(t.id, 'startDate', e.target.value)}
                            />
                          </td>
                          <td>
                            <input 
                              type="date"
                              value={t.finishDate || ''}
                              onChange={(e) => handleTaskChange(t.id, 'finishDate', e.target.value)}
                            />
                          </td>
                          <td>
                            <input 
                              type="text"
                              placeholder="e.g. 1FS"
                              value={t.predecessors || ''}
                              onChange={(e) => handleTaskChange(t.id, 'predecessors', e.target.value)}
                            />
                          </td>
                          <td>
                            <input 
                              type="text"
                              value={t.resources || ''}
                              onChange={(e) => handleTaskChange(t.id, 'resources', e.target.value)}
                            />
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input 
                                type="number"
                                min="0"
                                max="100"
                                value={t.progress || 0}
                                onChange={(e) => handleTaskChange(t.id, 'progress', parseInt(e.target.value, 10) || 0)}
                                style={{ textAlign: 'right', width: '38px' }}
                              />
                              <span style={{ fontSize: '10px', color: '#64748b' }}>%</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="checkbox"
                              checked={!!t.isCritical}
                              onChange={(e) => handleTaskChange(t.id, 'isCritical', e.target.checked)}
                              style={{ cursor: 'pointer', width: 'auto' }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* RIGHT PANE: Interactive Gantt Timeline */}
            {(viewMode === 'split' || viewMode === 'gantt') && (
              <div 
                className="msp-gantt-pane custom-horizontal-scrollbar"
                style={{ 
                  flex: viewMode === 'gantt' ? '1' : '0 0 42%',
                  overflowX: 'auto',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#3b82f6 #e2e8f0'
                }}
              >
                <div style={{ width: `${ganttWidthPx}px` }}>
                  {/* Timeline Header */}
                  <div className="gantt-timeline-header">
                    {/* Month / Week row */}
                    <div className="gantt-month-row">
                      {timelineDates.map((d, i) => {
                        const colW = zoomLevel === 'days' ? 36 : (zoomLevel === 'weeks' ? 75 : 90);
                        const isFirstOfMonth = d.getDate() <= 7;
                        return (
                          <div 
                            key={i} 
                            className="gantt-col-header" 
                            style={{ width: `${colW}px` }}
                          >
                            {zoomLevel === 'days' 
                              ? (isFirstOfMonth ? d.toLocaleString('en', { month: 'short' }) : '') 
                              : d.toLocaleString('en', { month: 'short', year: '2-digit' })}
                          </div>
                        );
                      })}
                    </div>
                    {/* Day labels row */}
                    <div className="gantt-days-row">
                      {timelineDates.map((d, i) => {
                        const colW = zoomLevel === 'days' ? 36 : (zoomLevel === 'weeks' ? 75 : 90);
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        return (
                          <div 
                            key={i} 
                            className={`gantt-col-header ${isWeekend ? 'weekend' : ''}`}
                            style={{ width: `${colW}px` }}
                          >
                            {zoomLevel === 'days' ? d.getDate() : `W${Math.ceil(d.getDate() / 7)}`}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chart Body */}
                  <div className="gantt-chart-body">
                    {filteredSchedule.map((t) => {
                      const isSummary = t.isSummary || t.type === 'group' || t.type === 'subgroup';
                      const isMilestone = t.isMilestone || t.duration === 0;
                      const { left, width } = getBarPosition(t.startDate, t.finishDate);

                      return (
                        <div key={t.id} className="gantt-row">
                          {/* Background Grid Columns */}
                          {timelineDates.map((d, i) => {
                            const colW = zoomLevel === 'days' ? 36 : (zoomLevel === 'weeks' ? 75 : 90);
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                            return (
                              <div 
                                key={i} 
                                className={`gantt-grid-col ${isWeekend ? 'weekend' : ''}`}
                                style={{ width: `${colW}px` }}
                              />
                            );
                          })}

                          {/* Task Bar / Milestone Diamond */}
                          {isMilestone ? (
                            <div 
                              className="gantt-milestone-diamond"
                              style={{ left: `${left}px` }}
                              title={`Milestone: ${t.name} (${t.startDate})`}
                            />
                          ) : isSummary ? (
                            <div 
                              className={`gantt-bar summary ${t.isCritical ? 'critical' : ''}`}
                              style={{ left: `${left}px`, width: `${width}px` }}
                              title={`Summary: ${t.name} (${t.duration}d, ${t.progress}%)`}
                            >
                              <div 
                                className="gantt-bar-progress" 
                                style={{ width: `${t.progress || 0}%`, background: 'rgba(255,255,255,0.4)' }} 
                              />
                            </div>
                          ) : (
                            <div 
                              className={`gantt-bar ${t.isCritical ? 'critical' : ''} ${t.progress >= 100 ? 'completed' : ''}`}
                              style={{ 
                                left: `${left}px`, 
                                width: `${width}px`,
                                background: t.isCritical ? '#ef4444' : (t.type === 'material' ? '#3b82f6' : '#6366f1')
                              }}
                              title={`${t.name} | ${t.duration} Days | ${t.progress}% Complete`}
                            >
                              <div 
                                className="gantt-bar-progress" 
                                style={{ width: `${t.progress || 0}%` }} 
                              />
                              <span style={{ position: 'relative', zIndex: 2, paddingLeft: '2px' }}>
                                {t.name} ({t.progress}%)
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Task Modal */}
      {showTaskModal && (
        <div className="planning-modal-backdrop">
          <div className="planning-modal-content">
            <div className="planning-modal-header">
              <h3>{editingTask ? 'Edit Schedule Item' : 'Add Item to MSP Schedule'}</h3>
              <button 
                type="button" 
                onClick={() => setShowTaskModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModalTask}>
              <div className="planning-modal-body">
                <div className="planning-form-grid">
                  {/* Type */}
                  <div className="planning-form-field">
                    <label>Hierarchy Level</label>
                    <select 
                      value={taskForm.type}
                      onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                    >
                      <option value="group">Level 1: Group</option>
                      <option value="subgroup">Level 2: Subgroup</option>
                      <option value="material">Level 3: Material Item</option>
                      <option value="milestone">Milestone (0 Duration)</option>
                    </select>
                  </div>

                  {/* Group Name */}
                  <div className="planning-form-field">
                    <label>Parent Group</label>
                    <input 
                      type="text"
                      list="group-options"
                      placeholder="e.g. CeCube Electrical Materials"
                      value={taskForm.groupName}
                      onChange={(e) => setTaskForm({ ...taskForm, groupName: e.target.value })}
                    />
                    <datalist id="group-options">
                      {availableGroups.map(g => <option key={g} value={g} />)}
                    </datalist>
                  </div>

                  {/* Subgroup Name */}
                  {(taskForm.type === 'subgroup' || taskForm.type === 'material') && (
                    <div className="planning-form-field">
                      <label>Subgroup</label>
                      <input 
                        type="text"
                        list="subgroup-options"
                        placeholder="e.g. Wires & Cables"
                        value={taskForm.subgroupName}
                        onChange={(e) => setTaskForm({ ...taskForm, subgroupName: e.target.value })}
                      />
                      <datalist id="subgroup-options">
                        {availableSubgroups.map(s => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                  )}

                  {/* Material Name */}
                  {taskForm.type === 'material' && (
                    <div className="planning-form-field">
                      <label>Material Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Copper Wire 1.5mm"
                        value={taskForm.materialName}
                        onChange={(e) => setTaskForm({ ...taskForm, materialName: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  {/* Item Description / Task Title */}
                  <div className="planning-form-field full">
                    <label>Task Display Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Copper Wire 1.5mm Laying & Termination"
                      value={taskForm.name}
                      onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* Duration & Unit */}
                  <div className="planning-form-field">
                    <label>Duration (Days)</label>
                    <input 
                      type="number"
                      min="0"
                      value={taskForm.duration}
                      onChange={(e) => {
                        const dur = parseInt(e.target.value, 10) || 0;
                        const s = new Date(taskForm.startDate);
                        s.setDate(s.getDate() + dur);
                        setTaskForm({ ...taskForm, duration: dur, finishDate: s.toISOString().split('T')[0] });
                      }}
                      required
                    />
                  </div>

                  {taskForm.type === 'material' && (
                    <div className="planning-form-field">
                      <label>Unit of Measure & Qty</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="number"
                          placeholder="Qty"
                          value={taskForm.plannedQty}
                          onChange={(e) => setTaskForm({ ...taskForm, plannedQty: parseFloat(e.target.value) || 0 })}
                          style={{ flex: 1 }}
                        />
                        <select 
                          value={taskForm.unit}
                          onChange={(e) => setTaskForm({ ...taskForm, unit: e.target.value })}
                          style={{ width: '90px' }}
                        >
                          <option value="Coil">Coil</option>
                          <option value="MTR">MTR</option>
                          <option value="Nos">Nos</option>
                          <option value="Litre">Litre</option>
                          <option value="CUM">CUM</option>
                          <option value="SQM">SQM</option>
                          <option value="KG">KG</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="planning-form-field">
                    <label>Start Date</label>
                    <input 
                      type="date"
                      value={taskForm.startDate}
                      onChange={(e) => {
                        const s = new Date(e.target.value);
                        s.setDate(s.getDate() + parseInt(taskForm.duration || 0, 10));
                        setTaskForm({ ...taskForm, startDate: e.target.value, finishDate: s.toISOString().split('T')[0] });
                      }}
                      required
                    />
                  </div>

                  <div className="planning-form-field">
                    <label>Finish Date</label>
                    <input 
                      type="date"
                      value={taskForm.finishDate}
                      onChange={(e) => setTaskForm({ ...taskForm, finishDate: e.target.value })}
                      required
                    />
                  </div>

                  {/* Predecessors & Resources */}
                  <div className="planning-form-field">
                    <label>Predecessors (e.g. 1.0, 2FS)</label>
                    <input 
                      type="text"
                      placeholder="e.g. 1.1.1"
                      value={taskForm.predecessors}
                      onChange={(e) => setTaskForm({ ...taskForm, predecessors: e.target.value })}
                    />
                  </div>

                  <div className="planning-form-field">
                    <label>Assigned Resource</label>
                    <input 
                      type="text"
                      placeholder="e.g. Electrical Gang A"
                      value={taskForm.resources}
                      onChange={(e) => setTaskForm({ ...taskForm, resources: e.target.value })}
                    />
                  </div>

                  <div className="planning-form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <input 
                      type="checkbox"
                      id="crit-check"
                      checked={taskForm.isCritical}
                      onChange={(e) => setTaskForm({ ...taskForm, isCritical: e.target.checked })}
                      style={{ width: 'auto' }}
                    />
                    <label htmlFor="crit-check" style={{ cursor: 'pointer', margin: 0 }}>
                      Mark as Critical Path item (Red Highlight)
                    </label>
                  </div>
                </div>
              </div>

              <div className="planning-modal-footer">
                <button 
                  type="button" 
                  onClick={() => setShowTaskModal(false)}
                  style={{
                    background: '#e2e8f0', border: 'none', color: '#475569',
                    padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{
                    background: '#6366f1', border: 'none', color: 'white',
                    padding: '8px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Add to Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
