'use client';
import React, { useState, useEffect } from 'react';
import { Home, ChevronRight, Search, RefreshCw, FileText, Plus, Trash2, Loader2 } from 'lucide-react';
import '../../contracting.css';

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function LabourRequisition() {
  const [projects, setProjects] = useState([]);
  const [taskLabours, setTaskLabours] = useState([]); // labours from task library for selected project's library
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingLabours, setLoadingLabours] = useState(false);
  const [searched, setSearched] = useState(false);

  const [filters, setFilters] = useState({
    projectId: '',
    taskId: '',
    labourId: '',
    fromDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    groupBy: 'Labour',
  });

  // Requisition table rows - editable
  const [rows, setRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all projects on mount
  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingProjects(false));

    fetch('/api/engineering/unit-library')
      .then(r => r.json())
      .then(data => {
        const units = (Array.isArray(data) ? data : [])
          .map(unit => typeof unit === 'string' ? unit : unit.name)
          .filter(Boolean);
        setAvailableUnits(Array.from(new Set(units)));
      })
      .catch(() => setAvailableUnits([]));
  }, []);

  // Fetch labours from task library when project changes
  useEffect(() => {
    if (!filters.projectId) {
      setTaskLabours([]);
      setRows([]);
      setSearched(false);
      return;
    }
    setLoadingLabours(true);
    // Fetch all master task library groups (which have the labours)
    fetch('/api/engineering/task-library')
      .then(r => r.json())
      .then(groups => {
        if (!Array.isArray(groups)) { setTaskLabours([]); return; }
        // Flatten all labours from all tasks in all groups
        const labourMap = new Map();
        groups.forEach(group => {
          (group.tasks || []).forEach(task => {
            (task.labours || []).forEach(labour => {
              // We'll store a unique key per labour per task so we can filter by task
              const key = `${task.id}-${labour.name}`;
              if (!labourMap.has(key)) {
                labourMap.set(key, {
                  id: labour.id,
                  name: labour.name,
                  taskId: task.id,
                  taskName: task.name,
                  unit: labour.unit || 'Manday',
                  quantity: labour.quantity || 0,
                  rate: labour.rate || 0,
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
      fromDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      groupBy: 'Labour',
    });
    setTaskLabours([]);
    setRows([]);
    setSearched(false);
  };

  const handleSearch = () => {
    if (!filters.projectId) return;
    // Build initial rows from task labours, filtered by task and labour if selected
    let source = taskLabours;
    if (filters.taskId) {
      source = source.filter(l => l.taskId === filters.taskId);
    }
    if (filters.labourId) {
      source = source.filter(l => l.id === filters.labourId);
    }

    setRows(source.map(l => ({
      id: l.id,
      labour: l.name,
      unit: l.unit,
      qty: l.quantity || 1,
      leadTime: '',
      taskName: l.taskName,
      rate: l.rate || 0,
    })));
    setSearched(true);
  };

  const handleRowChange = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleAddRow = () => {
    setRows(prev => [...prev, { id: '', labour: '', unit: 'Manday', qty: 1, leadTime: '', taskName: '', rate: 0 }]);
  };

  const handleDeleteRow = (idx) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const project = projects.find(p => p.id === filters.projectId);
    if (!project || rows.length === 0) {
      showToast('Please select a project and ensure there are rows to submit', 'error');
      return;
    }
    const validRows = rows.filter(r => r.labour && r.qty > 0);
    if (validRows.length === 0) {
      showToast('Please fill in Labour name and Quantity for each row', 'error');
      return;
    }

    try {
      setSubmitting(true);
      for (const row of validRows) {
        const response = await fetch('/api/contracting/labour/requisitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: filters.projectId,
            category: filters.groupBy,
            designation: row.labour,
            quantity: parseFloat(row.qty) || 1,
            unit: row.unit,
            rate: parseFloat(row.rate) || 0,
            purpose: row.taskName || '',
            requiredDate: filters.toDate,
          })
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || 'Failed to submit requisition');
        }
      }
      showToast(`${validRows.length} requisition(s) submitted successfully`);
    } catch (err) {
      showToast(err.message || 'Failed to submit requisitions', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contracting-container">

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: toast.type === 'error' ? '#dc2626' : '#16a34a',
          border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
          borderRadius: '8px', padding: '12px 20px', fontWeight: 600, fontSize: '0.88rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {toast.msg}
        </div>
      )}

      <div className="contracting-header">
        <div className="contracting-header-title">
          <FileText size={18} />
          Labour Requisition
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Labour Requisition
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>

        {/* Filter Section */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
            - Filter
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>

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
              <FormGroup label="Task">
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

              {/* From Date */}
              <FormGroup label="From Date">
                <input
                  type="date"
                  className="contracting-input"
                  style={{ width: '100%' }}
                  value={filters.fromDate}
                  onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}
                />
              </FormGroup>

              {/* To Date */}
              <FormGroup label="To Date">
                <input
                  type="date"
                  className="contracting-input"
                  style={{ width: '100%' }}
                  value={filters.toDate}
                  onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}
                />
              </FormGroup>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', gridColumn: 'span 5', alignSelf: 'end', paddingBottom: '16px' }}>
                <button className="btn-cyan" onClick={handleReset}>
                  <RefreshCw size={14} /> Reset
                </button>
                <button
                  className="btn-cyan"
                  onClick={handleSearch}
                  disabled={!filters.projectId || loadingLabours}
                  style={{ opacity: filters.projectId ? 1 : 0.5, cursor: filters.projectId ? 'pointer' : 'not-allowed' }}
                >
                  <Search size={14} /> Search
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Table Section */}
        {searched && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
            <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Labour Requisition Details</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleAddRow}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  <Plus size={13} /> Add Row
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || rows.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 14px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: rows.length === 0 ? 0.5 : 1 }}
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
                  Submit Requisition
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#17a2b8', fontWeight: 700, width: '40px' }}>#</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#17a2b8', fontWeight: 700 }}>Labour</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#17a2b8', fontWeight: 700 }}>Task</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#17a2b8', fontWeight: 700, width: '100px' }}>Qty</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#17a2b8', fontWeight: 700, width: '120px' }}>Unit</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#17a2b8', fontWeight: 700, width: '100px' }}>Rate (₹)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#17a2b8', fontWeight: 700, width: '120px' }}>Amount (₹)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#17a2b8', fontWeight: 700, width: '140px' }}>Lead Time (Days)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#17a2b8', fontWeight: 700, width: '60px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                        No labour data found. Click "Add Row" to manually add or check task library for this project.
                      </td>
                    </tr>
                  ) : rows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fafcff' }}>
                      <td style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <select
                          className="contracting-input"
                          style={{ width: '100%', minWidth: '180px' }}
                          value={row.labour}
                          onChange={e => {
                            const found = taskLabours.find(l => l.name === e.target.value);
                            handleRowChange(idx, 'labour', e.target.value);
                            if (found) {
                              handleRowChange(idx, 'unit', found.unit);
                              handleRowChange(idx, 'qty', found.quantity || 1);
                              handleRowChange(idx, 'rate', found.rate || 0);
                            }
                          }}
                        >
                          <option value="">-- Select Labour --</option>
                          {taskLabours.map((l, i) => (
                            <option key={i} value={l.name}>{l.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#64748b', fontSize: '0.8rem' }}>{row.taskName || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="contracting-input"
                          style={{ width: '80px', textAlign: 'center' }}
                          value={row.qty}
                          onChange={e => handleRowChange(idx, 'qty', e.target.value)}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <select
                          className="contracting-input"
                          style={{ width: '100%' }}
                          value={row.unit}
                          onChange={e => handleRowChange(idx, 'unit', e.target.value)}
                        >
                          {row.unit && !availableUnits.includes(row.unit) && (
                            <option value={row.unit}>{row.unit}</option>
                          )}
                          {availableUnits.map(unit => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          step="any"
                          className="contracting-input"
                          style={{ width: '80px', textAlign: 'center' }}
                          value={row.rate || ''}
                          onChange={e => handleRowChange(idx, 'rate', e.target.value)}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#0ea5e9' }}>
                        {((parseFloat(row.qty) || 0) * (parseFloat(row.rate) || 0)).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          min="0"
                          className="contracting-input"
                          style={{ width: '100px', textAlign: 'center' }}
                          placeholder="e.g. 7"
                          value={row.leadTime}
                          onChange={e => handleRowChange(idx, 'leadTime', e.target.value)}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteRow(idx)}
                          style={{ background: '#fee2e2', border: 'none', borderRadius: '5px', padding: '4px 8px', cursor: 'pointer', color: '#dc2626' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                      <td colSpan={3} style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>Total Rows: {rows.length}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>
                        {rows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0).toFixed(2)}
                      </td>
                      <td colSpan={2} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Total Amount:</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#0ea5e9' }}>
                        ₹{rows.reduce((s, r) => s + ((parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0)), 0).toFixed(2)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
