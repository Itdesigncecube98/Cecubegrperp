'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  CheckCircle, Clock, AlertCircle, FileText, Printer, Plus,
  Layers, Filter, Search, Download, Award, ChevronRight,
  ShieldCheck, RefreshCw, X, Calendar, Package, ArrowUpRight
} from 'lucide-react';
import '../planning.css';

export default function WorkCompletionTask() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname.startsWith('/engineering/')) {
      router.replace('/contracting/work-completion');
    }
  }, [pathname, router]);

  // Projects
  const [projects, setProjects] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals state
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedTaskForLog, setSelectedTaskForLog] = useState(null);
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().slice(0, 16),
    shift: 'Day',
    addQty: '',
    engineer: 'Aditya Yadav',
    mbRef: '',
    remark: '',
    newStatus: ''
  });
  const [logDocuments, setLogDocuments] = useState([]);

  // Certificate Modal state
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedTaskForCert, setSelectedTaskForCert] = useState(null);

  // Toast state
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
        console.error('Failed to fetch projects', err);
        showToast('Failed to load projects', 'error');
      } finally {
        setLoadingProjects(false);
      }
    }
    fetchProjects();
  }, []);

  useEffect(() => {
    fetch('/api/contracting/work-orders')
      .then(res => res.json())
      .then(data => setWorkOrders(Array.isArray(data) ? data : []))
      .catch(() => setWorkOrders([]));
  }, []);

  // 2. Fetch Work Completion Tasks when Project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    async function fetchTasks() {
      setLoadingTasks(true);
      try {
        const res = await fetch(`/api/engineering/planning/work-completion?projectId=${selectedProjectId}`);
        if (res.ok) {
          const data = await res.json();
          setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        }
      } catch (err) {
        console.error('Failed to load work completion tasks', err);
        showToast('Error loading work completion tasks', 'error');
      } finally {
        setLoadingTasks(false);
      }
    }
    fetchTasks();
  }, [selectedProjectId]);

  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const currentContractor = useMemo(() => {
    const projectName = currentProject?.name;
    return workOrders.find(order => order.project?.name === projectName)?.contractorName || '';
  }, [currentProject, workOrders]);

  // Distinct groups for filter dropdown
  const groupOptions = useMemo(() => {
    const set = new Set();
    tasks.forEach(t => {
      if (t.groupName) set.add(t.groupName);
    });
    return Array.from(set);
  }, [tasks]);

  // KPIs
  const kpis = useMemo(() => {
    const total = tasks.length;
    const completedCount = tasks.filter(t => t.percentComplete >= 100).length;
    const pendingCount = tasks.filter(t => t.verificationStatus === 'Pending Verification').length;
    const approvedCount = tasks.filter(t => t.verificationStatus === 'Quality Approved').length;

    let totalPlanned = 0;
    let totalCompleted = 0;
    tasks.forEach(t => {
      totalPlanned += t.plannedQty || 0;
      totalCompleted += t.completedQty || 0;
    });

    const overallPercent = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;
    return { total, completedCount, pendingCount, approvedCount, overallPercent, totalPlanned, totalCompleted };
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterGroup !== 'ALL' && t.groupName !== filterGroup) return false;
      if (filterStatus !== 'ALL' && t.verificationStatus !== filterStatus) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.taskName?.toLowerCase().includes(q) ||
        t.materialName?.toLowerCase().includes(q) ||
        t.subgroupName?.toLowerCase().includes(q) ||
        t.groupName?.toLowerCase().includes(q) ||
        t.wbsCode?.toLowerCase().includes(q) ||
        t.mbRef?.toLowerCase().includes(q)
      );
    });
  }, [tasks, filterGroup, filterStatus, searchQuery]);

  // Open Log Modal
  const handleOpenLogModal = (task) => {
    setSelectedTaskForLog(task);
    setLogForm({
      date: new Date().toISOString().slice(0, 16),
      shift: 'Day',
      addQty: '',
      engineer: 'Aditya Yadav',
      mbRef: task.mbRef || '',
      remark: '',
      newStatus: task.verificationStatus
    });
    setLogDocuments([]);
    setShowLogModal(true);
  };

  // Submit Progress Log
  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!selectedTaskForLog || !selectedProjectId) return;

    const addVal = parseFloat(logForm.addQty) || 0;
    const newCompleted = Math.round(((selectedTaskForLog.completedQty || 0) + addVal) * 10) / 10;
    const newBalance = Math.max(0, Math.round(((selectedTaskForLog.plannedQty || 0) - newCompleted) * 10) / 10);
    const newPercent = selectedTaskForLog.plannedQty > 0 
      ? Math.min(100, Math.round((newCompleted / selectedTaskForLog.plannedQty) * 100))
      : 0;

    let finalStatus = logForm.newStatus || selectedTaskForLog.verificationStatus;
    if (newPercent >= 100 && finalStatus !== 'Quality Approved') {
      finalStatus = 'Ready for Inspection';
    }

    const newLogEntry = {
      id: `log-${Date.now()}`,
      date: logForm.date,
      shift: logForm.shift,
      qty: addVal,
      engineer: logForm.engineer,
      remark: logForm.remark || 'Site progress recorded'
    };

    const updatedTask = {
      ...selectedTaskForLog,
      previousQty: selectedTaskForLog.completedQty,
      completedQty: newCompleted,
      cumulativeQty: newCompleted,
      workPercent: newPercent,
      remainingQty: newBalance,
      cumulativeAmount: newCompleted * Number(selectedTaskForLog.rate || 0),
      balanceAmount: newBalance * Number(selectedTaskForLog.rate || 0),
      balanceQty: newBalance,
      percentComplete: newPercent,
      mbRef: logForm.mbRef || selectedTaskForLog.mbRef,
      verificationStatus: finalStatus,
      actualDate: newPercent >= 100 ? logForm.date : selectedTaskForLog.actualDate,
      logs: [newLogEntry, ...(selectedTaskForLog.logs || [])]
    };

    try {
      const uploadedDocuments = await Promise.all(logDocuments.map(async file => {
        const formData = new FormData();
        formData.append('file', file);
        const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error || `Failed to upload ${file.name}`);
        return { name: file.name, type: file.type, size: file.size, url: uploadData.url };
      }));
      newLogEntry.documents = uploadedDocuments;

      const res = await fetch('/api/engineering/planning/work-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          action: 'UPDATE_TASK',
          taskUpdate: updatedTask
        })
      });

      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        showToast('Work completion progress recorded successfully!');
        setShowLogModal(false);
      } else {
        showToast('Failed to update progress', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error recording progress', 'error');
    }
  };

  // Quick Status Toggle (Quality Approval)
  const handleQuickApprove = async (task) => {
    const updated = {
      ...task,
      verificationStatus: task.verificationStatus === 'Quality Approved' ? 'Pending Verification' : 'Quality Approved'
    };

    try {
      const res = await fetch('/api/engineering/planning/work-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          action: 'UPDATE_TASK',
          taskUpdate: updated
        })
      });

      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
        showToast(`Task status updated to ${updated.verificationStatus}!`);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    }
  };

  // Open Certificate Modal
  const handleOpenCertModal = (task) => {
    setSelectedTaskForCert(task);
    setShowCertModal(true);
  };

  // Print Certificate
  const handlePrintCertificate = () => {
    window.print();
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
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="planning-header">
        <div className="planning-title-area">
          <h1>
            <Award size={26} color="#059669" />
            Work Completion Task Tracking
          </h1>
          <p>Real-time physical work completion logs, measurement book records & quality sign-offs by Material</p>
        </div>

        <div className="planning-project-select-card">
          <Layers size={18} color="#059669" />
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

      {/* KPI Cards */}
      <div className="planning-kpi-grid">
        <div className="planning-kpi-card">
          <div className="kpi-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
            <Award size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Overall Completion</div>
            <div className="kpi-value" style={{ color: '#059669' }}>{kpis.overallPercent}%</div>
          </div>
        </div>

        <div className="planning-kpi-card">
          <div className="kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Package size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Material Tasks</div>
            <div className="kpi-value">{kpis.total} Items</div>
          </div>
        </div>

        <div className="planning-kpi-card">
          <div className="kpi-icon-box" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <ShieldCheck size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Quality Approved</div>
            <div className="kpi-value" style={{ color: '#15803d' }}>{kpis.approvedCount}</div>
          </div>
        </div>

        <div className="planning-kpi-card">
          <div className="kpi-icon-box" style={{ background: '#fefce8', color: '#ca8a04' }}>
            <Clock size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Pending Verification</div>
            <div className="kpi-value" style={{ color: '#a16207' }}>{kpis.pendingCount}</div>
          </div>
        </div>

        <div className="planning-kpi-card">
          <div className="kpi-icon-box" style={{ background: '#faf5ff', color: '#7c3aed' }}>
            <CheckCircle size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">100% Completed</div>
            <div className="kpi-value">{kpis.completedCount}</div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="wc-table-card">
        {/* Toolbar */}
        <div className="wc-table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <input 
              type="text"
              className="wc-search-input"
              placeholder="Search by Material, Subgroup, WBS or MB No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Group:</span>
              <select 
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              >
                <option value="ALL">All Groups</option>
                {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Status:</span>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Quality Approved">Quality Approved</option>
                <option value="Site Incharge Signed">Site Incharge Signed</option>
                <option value="Pending Verification">Pending Verification</option>
                <option value="Ready for Inspection">Ready for Inspection</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button"
              onClick={() => {
                const csv = 'data:text/csv;charset=utf-8,' + [
                  ['WBS', 'Group', 'Subgroup', 'Material', 'Planned Qty', 'Unit', 'Completed Qty', 'Balance Qty', '% Done', 'Status', 'MB Ref'].join(','),
                  ...filteredTasks.map(t => [
                    `"${t.wbsCode}"`,
                    `"${t.groupName}"`,
                    `"${t.subgroupName}"`,
                    `"${t.materialName}"`,
                    t.plannedQty,
                    t.unit,
                    t.completedQty,
                    t.balanceQty,
                    t.percentComplete,
                    `"${t.verificationStatus}"`,
                    `"${t.mbRef}"`
                  ].join(','))
                ].join('\n');
                const link = document.createElement('a');
                link.setAttribute('href', encodeURI(csv));
                link.setAttribute('download', `Work_Completion_${currentProject?.name}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b',
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Data Table */}
        {loadingTasks ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={28} className="spin" style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Loading work completion records...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <Package size={36} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No work completion items match your filter criteria.</p>
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
            <table className="wc-data-table" style={{ width: '100%', minWidth: '1380px' }}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>WBS</th>
                  <th>Hierarchy (Group &gt; Subgroup)</th>
                  <th>Material / Task Item</th>
                  <th style={{ textAlign: 'right' }}>Planned</th>
                  <th style={{ textAlign: 'right' }}>Completed</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th style={{ width: '130px' }}>% Physical Done</th>
                  <th style={{ textAlign: 'right' }}>Rate</th>
                  <th style={{ textAlign: 'right' }}>Cumulative Amount</th>
                  <th style={{ textAlign: 'right' }}>Balance Amount</th>
                  <th>MB Reference</th>
                  <th>Verification Status</th>
                  <th style={{ textAlign: 'center', width: '170px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const isApproved = task.verificationStatus === 'Quality Approved';
                  const isIncharge = task.verificationStatus === 'Site Incharge Signed';
                  const isPending = task.verificationStatus === 'Pending Verification';

                  return (
                    <tr key={task.id}>
                      <td style={{ fontWeight: 700, color: '#475569' }}>
                        {task.wbsCode}
                      </td>
                      <td>
                        <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700 }}>
                          {task.groupName}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                          {task.subgroupName}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {task.materialName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {task.specification || task.taskName}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {task.plannedQty} <span style={{ fontSize: '11px', color: '#64748b' }}>{task.unit}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        {task.completedQty} <span style={{ fontSize: '11px', color: '#64748b' }}>{task.unit}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: task.balanceQty > 0 ? '#b45309' : '#64748b' }}>
                        {task.balanceQty} <span style={{ fontSize: '11px', color: '#64748b' }}>{task.unit}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress-bar-container" style={{ flex: 1 }}>
                            <div 
                              className="progress-bar-fill" 
                              style={{ 
                                width: `${task.percentComplete}%`,
                                background: task.percentComplete >= 100 ? '#10b981' : (task.percentComplete >= 50 ? '#3b82f6' : '#f59e0b')
                              }} 
                            />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', minWidth: '32px' }}>
                            {task.percentComplete}%
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        ₹{Number(task.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        ₹{Number(task.cumulativeAmount || (task.completedQty || 0) * (task.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#b45309' }}>
                        ₹{Number(task.balanceAmount || (task.balanceQty || 0) * (task.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span style={{ fontFamilty: 'monospace', fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, color: '#334155' }}>
                          {task.mbRef || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span 
                          className={`status-badge ${isApproved ? 'approved' : (isIncharge ? 'incharge' : (isPending ? 'pending' : 'approved'))}`}
                          onClick={() => handleQuickApprove(task)}
                          style={{ cursor: 'pointer' }}
                          title="Click to toggle approval"
                        >
                          {isApproved && <ShieldCheck size={12} />}
                          {isIncharge && <CheckCircle size={12} />}
                          {isPending && <Clock size={12} />}
                          <span>{task.verificationStatus}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button 
                            type="button"
                            onClick={() => handleOpenLogModal(task)}
                            style={{
                              background: '#3b82f6', border: 'none', color: 'white',
                              padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                            title="Log today's site work progress"
                          >
                            <Plus size={12} /> Log Qty
                          </button>

                          <button 
                            type="button"
                            onClick={() => handleOpenCertModal(task)}
                            style={{
                              background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b',
                              padding: '5px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                            title="Generate Work Completion Certificate"
                          >
                            <FileText size={12} color="#6366f1" /> WCC
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

      {/* Log Progress Modal */}
      {showLogModal && selectedTaskForLog && (
        <div className="planning-modal-backdrop">
          <div className="planning-modal-content">
            <div className="planning-modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Log Work Progress & Quantity</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  {selectedTaskForLog.wbsCode} - {selectedTaskForLog.materialName} ({selectedTaskForLog.subgroupName})
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowLogModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProgress}>
              <div className="planning-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
                  <div className="planning-form-field">
                    <label>Project</label>
                    <input type="text" value={currentProject?.name || 'Project not selected'} readOnly />
                  </div>
                  <div className="planning-form-field">
                    <label>Contractor</label>
                    <input type="text" value={currentContractor || 'No contractor assigned'} readOnly />
                  </div>
                  <div className="planning-form-field">
                    <label>Task</label>
                    <input type="text" value={selectedTaskForLog.taskName || selectedTaskForLog.materialName || ''} readOnly />
                  </div>
                </div>

                {/* Current Quantity Summary */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px',
                  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                  padding: '12px', marginBottom: '1.25rem', textAlign: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Planned Total</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                      {selectedTaskForLog.plannedQty} {selectedTaskForLog.unit}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Already Completed</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>
                      {selectedTaskForLog.completedQty} {selectedTaskForLog.unit}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Remaining Balance</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#dc2626' }}>
                      {selectedTaskForLog.balanceQty} {selectedTaskForLog.unit}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.25rem', textAlign: 'center' }}>
                  <div style={{ padding: '10px', background: '#ecfdf5', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>Completed Amount</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>₹{Number(selectedTaskForLog.cumulativeAmount || ((selectedTaskForLog.completedQty || 0) * (selectedTaskForLog.rate || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div style={{ padding: '10px', background: '#fff7ed', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#c2410c', fontWeight: 600 }}>Balance Amount</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#b45309' }}>₹{Number(selectedTaskForLog.balanceAmount || ((selectedTaskForLog.balanceQty || 0) * (selectedTaskForLog.rate || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>Rate</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#2563eb' }}>₹{Number(selectedTaskForLog.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <div className="planning-form-grid">
                  <div className="planning-form-field">
                    <label>Date &amp; Time of Work</label>
                    <input 
                      type="datetime-local" 
                      value={logForm.date}
                      onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="planning-form-field">
                    <label>Shift Execution</label>
                    <select 
                      value={logForm.shift}
                      onChange={(e) => setLogForm({ ...logForm, shift: e.target.value })}
                    >
                      <option value="Day">Day Shift</option>
                      <option value="Night">Night Shift</option>
                    </select>
                  </div>

                  <div className="planning-form-field">
                    <label>Installed / Completed Qty ({selectedTaskForLog.unit}) *</label>
                    <input 
                      type="number"
                      step="0.1"
                      placeholder={`e.g. 20`}
                      value={logForm.addQty}
                      onChange={(e) => setLogForm({ ...logForm, addQty: e.target.value })}
                      required
                    />
                  </div>

                  <div className="planning-form-field">
                    <label>Measurement Book (MB) Ref</label>
                    <input 
                      type="text"
                      placeholder="e.g. MB-01/Page-22"
                      value={logForm.mbRef}
                      onChange={(e) => setLogForm({ ...logForm, mbRef: e.target.value })}
                    />
                  </div>

                  <div className="planning-form-field">
                    <label>Executing Engineer</label>
                    <input 
                      type="text"
                      value={logForm.engineer}
                      onChange={(e) => setLogForm({ ...logForm, engineer: e.target.value })}
                      required
                    />
                  </div>

                  <div className="planning-form-field">
                    <label>Updated Verification Status</label>
                    <select 
                      value={logForm.newStatus}
                      onChange={(e) => setLogForm({ ...logForm, newStatus: e.target.value })}
                    >
                      <option value="Pending Verification">Pending Verification</option>
                      <option value="Ready for Inspection">Ready for Inspection</option>
                      <option value="Site Incharge Signed">Site Incharge Signed</option>
                      <option value="Quality Approved">Quality Approved</option>
                    </select>
                  </div>

                  <div className="planning-form-field full">
                    <label>Site Observations & Inspection Remarks</label>
                    <textarea 
                      rows={2}
                      placeholder="Enter details about joints, routing, testing or inspection clearances..."
                      value={logForm.remark}
                      onChange={(e) => setLogForm({ ...logForm, remark: e.target.value })}
                    />
                  </div>

                  <div className="planning-form-field full">
                    <label>Supporting Documents</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={event => setLogDocuments(previous => [...previous, ...Array.from(event.target.files || [])])}
                    />
                    {logDocuments.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {logDocuments.map((file, index) => (
                          <div key={`${file.name}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}>
                            <span>{file.name}</span>
                            <button type="button" onClick={() => setLogDocuments(previous => previous.filter((_, fileIndex) => fileIndex !== index))} style={{ border: 0, background: 'transparent', color: '#dc2626', cursor: 'pointer' }}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="planning-modal-footer">
                <button 
                  type="button" 
                  onClick={() => setShowLogModal(false)}
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
                    background: '#059669', border: 'none', color: 'white',
                    padding: '8px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Confirm & Save Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Work Completion Certificate (WCC) Preview Modal */}
      {showCertModal && selectedTaskForCert && (
        <div className="planning-modal-backdrop">
          <div className="planning-modal-content" style={{ maxWidth: '820px' }}>
            <div className="planning-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="#059669" />
                <h3 style={{ margin: 0 }}>Work Completion Certificate (WCC)</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  type="button" 
                  onClick={handlePrintCertificate}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: '#059669', border: 'none', color: 'white',
                    padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  <Printer size={14} /> Print Certificate
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowCertModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="planning-modal-body" style={{ background: '#f1f5f9' }}>
              <div className="wcc-certificate-sheet">
                <div className="wcc-header-logo">
                  <img src="/logo.png" alt="CeCube Group" style={{ maxHeight: '55px', marginBottom: '8px' }} />
                  <div style={{ fontSize: '18px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    CeCube Engineering India Pvt. Ltd.
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    ISO 9001:2015 Certified | Infrastructure, Engineering & EPC Contractors
                  </div>
                </div>

                <div className="wcc-cert-title">
                  Work Completion Certificate
                </div>

                <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '1.5rem', textAlign: 'justify' }}>
                  This is to certify that the specified engineering installation work detailed below has been executed, inspected, and completed in compliance with the approved project drawings, engineering standards, and quality specifications.
                </p>

                <table className="wcc-details-table">
                  <tbody>
                    <tr>
                      <td className="label-cell">Project Name</td>
                      <td style={{ fontWeight: 700 }}>{currentProject?.name || 'CeCube Engineering Project'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">Project Location</td>
                      <td>{currentProject?.state || 'Haryana / NCR'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">WBS Code & Group</td>
                      <td>{selectedTaskForCert.wbsCode} - {selectedTaskForCert.groupName}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">Subgroup / Category</td>
                      <td>{selectedTaskForCert.subgroupName}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">Material / Scope of Work</td>
                      <td style={{ fontWeight: 700 }}>{selectedTaskForCert.materialName} ({selectedTaskForCert.taskName})</td>
                    </tr>
                    <tr>
                      <td className="label-cell">Material Specification</td>
                      <td>{selectedTaskForCert.specification}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">Verified Quantity Completed</td>
                      <td style={{ fontWeight: 800, color: '#059669' }}>
                        {selectedTaskForCert.completedQty} {selectedTaskForCert.unit} (out of planned {selectedTaskForCert.plannedQty} {selectedTaskForCert.unit})
                      </td>
                    </tr>
                    <tr>
                      <td className="label-cell">Physical % Completion</td>
                      <td style={{ fontWeight: 700 }}>{selectedTaskForCert.percentComplete}%</td>
                    </tr>
                    <tr>
                      <td className="label-cell">Measurement Book (MB) Ref</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{selectedTaskForCert.mbRef}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">Completion Date</td>
                      <td>{selectedTaskForCert.actualDate || selectedTaskForCert.targetDate}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">Quality Status</td>
                      <td style={{ fontWeight: 700, color: '#15803d' }}>{selectedTaskForCert.verificationStatus}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="wcc-signatures">
                  <div className="wcc-sig-box">
                    <div>Aditya Yadav</div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Site Project Engineer</div>
                  </div>
                  <div className="wcc-sig-box">
                    <div>Harmesh Kumar</div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Quality Assurance Manager</div>
                  </div>
                  <div className="wcc-sig-box">
                    <div>Authorized Signatory</div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Client / PMC Representative</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="planning-modal-footer">
              <button 
                type="button" 
                onClick={() => setShowCertModal(false)}
                style={{
                  background: '#e2e8f0', border: 'none', color: '#475569',
                  padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button 
                type="button" 
                onClick={handlePrintCertificate}
                style={{
                  background: '#059669', border: 'none', color: 'white',
                  padding: '8px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Print Official Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
