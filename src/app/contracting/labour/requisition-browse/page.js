'use client';
import React, { useState, useEffect } from 'react';
import { Home, ChevronRight, Search, RefreshCw, List, Printer, Check, Loader2 } from 'lucide-react';
import '../../contracting.css';

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function LabourRequisitionBrowse() {
  const [projects, setProjects] = useState([]);
  const [taskLabours, setTaskLabours] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingLabours, setLoadingLabours] = useState(false);
  const [requisitions, setRequisitions] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');

  const [filters, setFilters] = useState({
    projectId: '',
    taskId: '',
    labourId: '',
    reqType: 'Requisition',
    fromDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    reqStatus: '',
    pendingStatus: '',
  });

  // Fetch all projects on mount
  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingProjects(false));
  }, []);

  // Fetch labours from master task library when project changes
  useEffect(() => {
    if (!filters.projectId) {
      setTaskLabours([]);
      return;
    }
    setLoadingLabours(true);
    fetch('/api/engineering/task-library')
      .then(r => r.json())
      .then(groups => {
        if (!Array.isArray(groups)) { setTaskLabours([]); return; }
        const labourMap = new Map();
        groups.forEach(group => {
          (group.tasks || []).forEach(task => {
            (task.labours || []).forEach(labour => {
              const key = `${task.id}-${labour.name}`;
              if (!labourMap.has(key)) {
                labourMap.set(key, {
                  id: labour.id,
                  name: labour.name,
                  taskId: task.id,
                  taskName: task.name,
                });
              }
            });
          });
        });
        setTaskLabours(Array.from(labourMap.values()));
      })
      .catch(console.error)
      .finally(() => setLoadingLabours(false));
  }, [filters.projectId]);

  const handleReset = () => {
    setFilters({
      projectId: '',
      taskId: '',
      labourId: '',
      reqType: 'Requisition',
      fromDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      reqStatus: '',
      pendingStatus: '',
    });
    setTaskLabours([]);
    setRequisitions([]);
    setSelectedIds([]);
    setSelectedStatus('');
  };

  const handleSearch = async () => {
    if (!filters.projectId) {
      alert("Please select a project to search");
      return;
    }
    setLoadingReqs(true);
    try {
      const res = await fetch(`/api/contracting/labour/requisitions?projectId=${filters.projectId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Filter by date range (simple client-side filter for demo)
        const filtered = data.filter(r => {
          const requisitionDate = r.requiredDate || r.date || r.createdAt;
          const rDate = new Date(requisitionDate);
          const fDate = new Date(`${filters.fromDate}T00:00:00`);
          const tDate = new Date(`${filters.toDate}T23:59:59.999`);
          
          let valid = rDate >= fDate && rDate <= tDate;

          if (filters.reqStatus && String(r.status || '').toUpperCase() !== filters.reqStatus) {
            valid = false;
          }
          
          // If task filter selected, we check if purpose matches task name (since we saved taskName in purpose)
          if (filters.taskId && valid) {
            const task = taskLabours.find(t => t.taskId === filters.taskId);
            if (task && r.purpose !== task.taskName) valid = false;
          }
          
          // If labour filter selected, we check if designation matches labour name
          if (filters.labourId && valid) {
            const lab = taskLabours.find(l => l.id === filters.labourId);
            if (lab && r.designation !== lab.name) valid = false;
          }

          return valid;
        });
        setRequisitions(filtered);
        setSelectedIds([]);
      } else {
        setRequisitions([]);
      }
    } catch (err) {
      console.error(err);
      setRequisitions([]);
    } finally {
      setLoadingReqs(false);
    }
  };

  const pendingRequisitions = requisitions.filter(req => String(req.status || '').toLowerCase() === 'pending');
  const allPendingSelected = pendingRequisitions.length > 0
    && pendingRequisitions.every(req => selectedIds.includes(req.id));

  const toggleRequisition = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]);
  };

  const toggleAllPending = () => {
    setSelectedIds(allPendingSelected ? [] : pendingRequisitions.map(req => req.id));
  };

  const applyStatus = async () => {
    if (!selectedStatus) {
      alert('Please select a status');
      return;
    }
    if (selectedIds.length === 0) {
      alert('Please select at least one requisition');
      return;
    }

    setLoadingReqs(true);
    try {
      const responses = await Promise.all(selectedIds.map(id => fetch('/api/contracting/labour/requisitions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: selectedStatus })
      })));
      const failedResponse = responses.find(response => !response.ok);
      if (failedResponse) {
        const result = await failedResponse.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to update requisition status');
      }
      setSelectedIds([]);
      setSelectedStatus('');
      await handleSearch();
    } catch (error) {
      alert(error.message || 'Failed to update requisition status');
      setLoadingReqs(false);
    }
  };

  return (
    <div className="contracting-container">
      
      <div className="contracting-header">
        <div className="contracting-header-title">
          <List size={18} />
          Labour Requisition Browse
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Labour Requisition Browse
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Filter Section */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              
              {/* Project */}
              <FormGroup label="Project" required>
                <select
                  className="contracting-input"
                  style={{ width: '100%' }}
                  value={filters.projectId}
                  onChange={e => setFilters(f => ({ ...f, projectId: e.target.value, taskId: '', labourId: '' }))}
                  disabled={loadingProjects}
                >
                  <option value="">{loadingProjects ? 'Loading...' : '-Select-'}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.company})</option>
                  ))}
                </select>
              </FormGroup>
              
              {/* Task */}
              <FormGroup label="Task (WBS Filter)">
                <select
                  className="contracting-input"
                  style={{ width: '100%' }}
                  value={filters.taskId}
                  onChange={e => setFilters(f => ({ ...f, taskId: e.target.value, labourId: '' }))}
                  disabled={!filters.projectId || loadingLabours}
                >
                  <option value="">
                    {!filters.projectId
                      ? 'Select Project'
                      : loadingLabours
                      ? 'Loading...'
                      : taskLabours.length === 0
                      ? 'No tasks found'
                      : '-- All Tasks --'}
                  </option>
                  {Array.from(new Map(taskLabours.map(l => [l.taskId, l.taskName])).entries()).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </FormGroup>
              
              {/* Labour */}
              <FormGroup label="Labour">
                <select
                  className="contracting-input"
                  style={{ width: '100%' }}
                  value={filters.labourId}
                  onChange={e => setFilters(f => ({ ...f, labourId: e.target.value }))}
                  disabled={!filters.projectId || loadingLabours}
                >
                  <option value="">
                    {!filters.projectId
                      ? 'Select Project'
                      : loadingLabours
                      ? 'Loading...'
                      : taskLabours.length === 0
                      ? 'No labours found'
                      : '-- All Labours --'}
                  </option>
                  {Array.from(
                    new Map(
                      taskLabours
                        .filter(l => !filters.taskId || l.taskId === filters.taskId)
                        .map(l => [l.name, l])
                    ).values()
                  ).map((l, i) => (
                    <option key={i} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </FormGroup>

              {/* Req Type */}
              <FormGroup label="">
                <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#17a2b8', fontWeight: 600 }}>
                    <input 
                      type="radio" name="reqType" 
                      checked={filters.reqType === 'Requisition'} 
                      onChange={() => setFilters(f => ({ ...f, reqType: 'Requisition' }))}
                    /> Requisition
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#17a2b8', fontWeight: 600 }}>
                    <input 
                      type="radio" name="reqType" 
                      checked={filters.reqType === 'Requirement'} 
                      onChange={() => setFilters(f => ({ ...f, reqType: 'Requirement' }))}
                    /> Requirement
                  </label>
                </div>
              </FormGroup>

              {/* From Date */}
              <FormGroup label="From Date" required>
                <input
                  type="date"
                  className="contracting-input"
                  style={{ width: '100%' }}
                  value={filters.fromDate}
                  onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}
                />
              </FormGroup>

              {/* To Date */}
              <FormGroup label="To Date" required>
                <input
                  type="date"
                  className="contracting-input"
                  style={{ width: '100%' }}
                  value={filters.toDate}
                  onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}
                />
              </FormGroup>

              {/* Req Status */}
              <FormGroup label="Requisition Status">
                <select
                  className="contracting-input"
                  style={{ width: '100%' }}
                  value={filters.reqStatus}
                  onChange={e => setFilters(f => ({ ...f, reqStatus: e.target.value }))}
                >
                  <option value="">-- All --</option>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </FormGroup>
              
              {/* Pending Status */}
              <FormGroup label="Pending Status">
                <select
                  className="contracting-input"
                  style={{ width: '100%' }}
                  value={filters.pendingStatus}
                  onChange={e => setFilters(f => ({ ...f, pendingStatus: e.target.value }))}
                >
                  <option value="">-- All --</option>
                  <option value="HIGH">High Priority</option>
                  <option value="NORMAL">Normal Priority</option>
                </select>
              </FormGroup>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn-cyan" onClick={handleReset}><RefreshCw size={14} /> Reset</button>
              <button 
                className="btn-cyan" 
                onClick={handleSearch}
                disabled={!filters.projectId || loadingReqs}
                style={{ opacity: filters.projectId ? 1 : 0.5, cursor: filters.projectId ? 'pointer' : 'not-allowed', minWidth: '80px', justifyContent: 'center' }}
              >
                {loadingReqs ? <Loader2 size={14} className="animate-spin" /> : <><Search size={14} /> Search</>}
              </button>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '16px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#ef4444' }}></div> Urgent</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#22c55e' }}></div> High</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#f97316' }}></div> Normal</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#eab308' }}></div> Low</div>
          </div>
        </div>

        {/* Results Area */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', minHeight: '300px', overflowX: 'auto', paddingBottom: '60px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 12px', textAlign: 'center', color: '#17a2b8', fontWeight: 700, width: '44px' }}>
                  <input
                    type="checkbox"
                    aria-label="Select all pending requisitions"
                    checked={allPendingSelected}
                    onChange={toggleAllPending}
                    disabled={pendingRequisitions.length === 0}
                  />
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#17a2b8', fontWeight: 700, width: '40px' }}>#</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#17a2b8', fontWeight: 700 }}>Req. No.</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#17a2b8', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#17a2b8', fontWeight: 700 }}>Task</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#17a2b8', fontWeight: 700 }}>Labour</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', color: '#17a2b8', fontWeight: 700 }}>Qty</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', color: '#17a2b8', fontWeight: 700 }}>Rate (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', color: '#17a2b8', fontWeight: 700 }}>Amount (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', color: '#17a2b8', fontWeight: 700 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                    {loadingReqs ? 'Searching...' : 'No requisitions found for the selected criteria.'}
                  </td>
                </tr>
              ) : (
                requisitions.map((req, idx) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fafcff' }}>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        aria-label={`Select requisition ${req.reqNo}`}
                        checked={selectedIds.includes(req.id)}
                        disabled={String(req.status || '').toLowerCase() !== 'pending'}
                        onChange={() => toggleRequisition(req.id)}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#334155' }}>{req.reqNo}</td>
                    <td style={{ padding: '8px 12px' }}>{new Date(req.requiredDate || req.date || req.createdAt).toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{req.purpose || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{req.designation}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>{req.quantity} {req.unit}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>{req.rate?.toFixed(2) || '0.00'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#0ea5e9' }}>{((req.quantity || 0) * (req.rate || 0)).toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                        background: String(req.status || '').toLowerCase() === 'approved' ? '#dcfce7' : String(req.status || '').toLowerCase() === 'rejected' ? '#fee2e2' : '#fef9c3',
                        color: String(req.status || '').toLowerCase() === 'approved' ? '#16a34a' : String(req.status || '').toLowerCase() === 'rejected' ? '#dc2626' : '#ca8a04' 
                      }}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Action Bar */}
        <div style={{ 
          position: 'fixed', bottom: 0, left: '260px', right: 0, 
          background: 'white', borderTop: '1px solid #e2e8f0', 
          padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <button className="btn-cyan"><Printer size={14} /> Print <ChevronRight size={14} /></button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: '#17a2b8', fontWeight: 600 }}>
            <span>Total Record: {requisitions.length}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Select Status</span>
              <select className="contracting-input" style={{ width: '150px' }} value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                <option value="">Select Status</option>
                <option value="Approved">APPROVE</option>
                <option value="Cancelled">REJECT</option>
              </select>
            </div>
            <button className="btn-cyan" onClick={applyStatus} disabled={loadingReqs || selectedIds.length === 0}>
              {loadingReqs ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Apply Status
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
