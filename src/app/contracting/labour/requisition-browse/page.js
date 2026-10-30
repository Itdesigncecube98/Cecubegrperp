'use client';
import React, { useState, useEffect } from 'react';
import { Home, ChevronRight, Search, RefreshCw, List, FileSpreadsheet, FileDown, Check, Loader2, Plus } from 'lucide-react';
import LabourRequisitionForm from '../requisition/LabourRequisitionForm';
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
  const [projectTasks, setProjectTasks] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingLabours, setLoadingLabours] = useState(false);
  const [requisitions, setRequisitions] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [activeTab, setActiveTab] = useState('browse');

  const [filters, setFilters] = useState({
    projectId: '',
    taskId: '',
    reqStatus: '',
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
    if (!filters.projectId) return undefined;
    let cancelled = false;
    fetch(`/api/engineering/task-library?projectId=${encodeURIComponent(filters.projectId)}`, { cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load project tasks.');
        return data;
      })
      .then(groups => {
        if (!cancelled) {
          setProjectTasks(Array.isArray(groups)
            ? groups.flatMap(group => (group.tasks || []).map(task => ({ id: task.id, name: task.name })))
            : []);
        }
      })
      .catch(error => {
        if (!cancelled) {
          console.error(error);
          setProjectTasks([]);
          alert(error.message || 'Unable to load project tasks.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLabours(false);
      });
    return () => { cancelled = true; };
  }, [filters.projectId]);

  const handleReset = () => {
    setFilters({
      projectId: '',
      taskId: '',
      reqStatus: '',
    });
    setProjectTasks([]);
    setRequisitions([]);
    setSelectedIds([]);
    setSelectedStatus('');
  };

  const handleSearch = async (projectId = filters.projectId, searchFilters = filters) => {
    if (!projectId) {
      alert("Please select a project to search");
      return;
    }
    setLoadingReqs(true);
    try {
      const res = await fetch(`/api/contracting/labour/requisitions?projectId=${encodeURIComponent(projectId)}`, { cache: 'no-store' });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.error || 'Unable to load requisitions.');
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        const filtered = data.filter(r => {
          let valid = true;

          if (searchFilters.reqStatus && String(r.status || '').toUpperCase() !== searchFilters.reqStatus) {
            valid = false;
          }
          
          if (searchFilters.taskId && valid) {
            const task = projectTasks.find(item => item.id === searchFilters.taskId);
            if (task && r.purpose !== task.name) valid = false;
          }

          return valid;
        });
        setRequisitions(filtered);
        setSelectedIds([]);
      } else {
        setRequisitions([]);
      }
    } catch (err) {
      alert(err.message || 'Unable to load requisitions.');
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

  const handleSubmissionComplete = ({ projectId }) => {
    setActiveTab('browse');
    setProjectTasks([]);
    setLoadingLabours(Boolean(projectId));
    const searchFilters = {
      ...filters,
      projectId,
      reqStatus: '',
    };
    setFilters(searchFilters);
    if (projectId) handleSearch(projectId, searchFilters);
  };

  const getExportRows = () => requisitions.map((req, index) => ({
    No: index + 1,
    'Requisition No.': req.reqNo || '',
    Date: (req.requiredDate || req.date || req.createdAt)
      ? new Date(req.requiredDate || req.date || req.createdAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })
      : '',
    Task: req.purpose || '',
    Labour: req.designation || '',
    Quantity: Number(req.quantity) || 0,
    Rate: Number(req.rate) || 0,
    Amount: (Number(req.quantity) || 0) * (Number(req.rate) || 0),
    Status: req.status || '',
  }));

  const getExportFilename = extension => {
    const projectName = projects.find(project => project.id === filters.projectId)?.name || 'Labour-Requisitions';
    const safeName = projectName.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'Labour-Requisitions';
    return `${safeName}-requisitions.${extension}`;
  };

  const exportExcel = async () => {
    if (!requisitions.length) {
      alert('Search for requisitions before exporting.');
      return;
    }

    try {
      const excelModule = await import('exceljs');
      const ExcelJS = excelModule.default || excelModule;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Labour Requisitions');
      const rows = getExportRows();
      sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: Math.max(14, key.length + 3) }));
      rows.forEach(row => sheet.addRow(row));
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
      sheet.autoFilter = { from: 'A1', to: `${sheet.getColumn(sheet.columnCount).letter}1` };
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getExportFilename('xlsx');
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export labour requisitions to Excel:', error);
      alert('Could not export the requisitions to Excel.');
    }
  };

  const exportPdf = async () => {
    if (!requisitions.length) {
      alert('Search for requisitions before exporting.');
      return;
    }

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const rows = getExportRows();
      const columns = [
        { key: 'No', label: '#', width: 9 },
        { key: 'Requisition No.', label: 'Req. No.', width: 27 },
        { key: 'Date', label: 'Date', width: 22 },
        { key: 'Task', label: 'Task', width: 40 },
        { key: 'Labour', label: 'Labour', width: 42 },
        { key: 'Quantity', label: 'Qty', width: 20 },
        { key: 'Rate', label: 'Rate (INR)', width: 25 },
        { key: 'Amount', label: 'Amount (INR)', width: 29 },
        { key: 'Status', label: 'Status', width: 25 },
      ];
      const left = 8;
      const bottom = doc.internal.pageSize.getHeight() - 8;
      const projectName = projects.find(project => project.id === filters.projectId)?.name || 'All Projects';

      const drawHeader = () => {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Labour Requisitions', left, 12);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Project: ${projectName}`, left, 18);
        let x = left;
        const y = 23;
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(15, 118, 110);
        doc.setTextColor(255, 255, 255);
        columns.forEach(column => {
          doc.rect(x, y, column.width, 7, 'F');
          doc.text(column.label, x + 1, y + 4.7, { maxWidth: column.width - 2 });
          x += column.width;
        });
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        return y + 7;
      };

      let y = drawHeader();
      rows.forEach(row => {
        const cellLines = columns.map(column => doc.splitTextToSize(String(row[column.key] ?? ''), column.width - 2));
        const rowHeight = Math.max(7, ...cellLines.map(lines => lines.length * 3.5 + 2));
        if (y + rowHeight > bottom) {
          doc.addPage();
          y = drawHeader();
        }
        let x = left;
        columns.forEach((column, index) => {
          doc.rect(x, y, column.width, rowHeight);
          doc.text(cellLines[index], x + 1, y + 4, { maxWidth: column.width - 2 });
          x += column.width;
        });
        y += rowHeight;
      });

      doc.save(getExportFilename('pdf'));
    } catch (error) {
      console.error('Failed to export labour requisitions to PDF:', error);
      alert('Could not export the requisitions to PDF.');
    }
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
          Labour Requisition
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Labour Requisition
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div role="tablist" aria-label="Labour requisition actions" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'browse'}
            onClick={() => setActiveTab('browse')}
            className="btn-cyan"
          >
            <List size={14} /> Browse Requisitions
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'create'}
            onClick={() => setActiveTab('create')}
            className="btn-cyan"
          >
            <Plus size={14} /> Generate Requisition
          </button>
        </div>

        {activeTab === 'create' ? (
          <LabourRequisitionForm embedded onSubmitted={handleSubmissionComplete} />
        ) : (
          <>
        
        {/* Filter Section */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              
              {/* Project */}
              <FormGroup label="Project" required>
                <select
                  className="contracting-input"
                  style={{ width: '100%' }}
                  value={filters.projectId}
                  onChange={e => {
                    const projectId = e.target.value;
                    setProjectTasks([]);
                    setLoadingLabours(Boolean(projectId));
                    setRequisitions([]);
                    setFilters(f => ({ ...f, projectId, taskId: '' }));
                  }}
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
                  onChange={e => setFilters(f => ({ ...f, taskId: e.target.value }))}
                  disabled={!filters.projectId || loadingLabours}
                >
                  <option value="">
                    {!filters.projectId
                      ? 'Select Project'
                      : loadingLabours
                      ? 'Loading...'
                      : projectTasks.length === 0
                      ? 'No tasks found'
                      : '-- All Tasks --'}
                  </option>
                  {projectTasks.map(task => <option key={task.id} value={task.id}>{task.name}</option>)}
                </select>
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
                  <option value="FULFILLED">FULFILLED</option>
                  <option value="CANCELLED">CANCELLED</option>
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
                    <td style={{ padding: '8px 12px' }}>{(req.requiredDate || req.date || req.createdAt) ? new Date(req.requiredDate || req.date || req.createdAt).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{req.purpose || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{req.designation}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>{req.quantity} {req.unit}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>{req.rate?.toFixed(2) || '0.00'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#0ea5e9' }}>{((req.quantity || 0) * (req.rate || 0)).toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                        background: String(req.status || '').toLowerCase() === 'approved' || String(req.status || '').toLowerCase() === 'fulfilled' ? '#dcfce7' : String(req.status || '').toLowerCase() === 'cancelled' ? '#fee2e2' : '#fef9c3',
                        color: String(req.status || '').toLowerCase() === 'approved' || String(req.status || '').toLowerCase() === 'fulfilled' ? '#16a34a' : String(req.status || '').toLowerCase() === 'cancelled' ? '#dc2626' : '#ca8a04'
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-cyan" onClick={exportExcel} disabled={requisitions.length === 0}>
              <FileSpreadsheet size={14} /> Export Excel
            </button>
            <button className="btn-cyan" onClick={exportPdf} disabled={requisitions.length === 0}>
              <FileDown size={14} /> Export PDF
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: '#17a2b8', fontWeight: 600 }}>
            <span>Total Record: {requisitions.length}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Select Status</span>
              <select className="contracting-input" style={{ width: '150px' }} value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                <option value="">Select Status</option>
                <option value="Approved">APPROVE</option>
                <option value="Cancelled">CANCEL</option>
              </select>
            </div>
            <button className="btn-cyan" onClick={applyStatus} disabled={loadingReqs || selectedIds.length === 0}>
              {loadingReqs ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Apply Status
            </button>
          </div>
        </div>

          </>
        )}
      </div>
    </div>
  );
}
