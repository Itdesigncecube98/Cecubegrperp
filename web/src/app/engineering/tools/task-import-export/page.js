'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowDownUp, Home, ChevronRight, Layers, Building2, Download, 
  Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Plus, 
  Trash2, Eye, HelpCircle, FileSpreadsheet, Check, X, ShieldAlert
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function TaskImportExportPage() {
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [stats, setStats] = useState({ totalTasks: 0, approvedTotal: 0, estimateTotal: 0, importHistoryCount: 0 });
  const [loading, setLoading] = useState(true);

  // Active tab: 'IMPORT' | 'EXPORT' | 'HISTORY'
  const [activeTab, setActiveTab] = useState('IMPORT');

  // Import state
  const [importText, setImportText] = useState('');
  const [previewTasks, setPreviewTasks] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importedByName, setImportedByName] = useState('Planning Lead');

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async (projectIdToFetch = selectedProjectId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/engineering/tools/task-import-export?projectId=${projectIdToFetch || ''}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        setProjects(data.projects || []);
        setTasks(data.tasks || []);
        setHistory(data.history || []);
        setIsLocked(Boolean(data.isLocked));
        setStats(data.stats || { totalTasks: 0, approvedTotal: 0, estimateTotal: 0, importHistoryCount: 0 });

        if (!selectedProjectId && data.selectedProjectId) {
          setSelectedProjectId(data.selectedProjectId);
        }
      } else {
        showToast('Failed to load project task data', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to task import/export service', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedProjectId);
  }, [selectedProjectId]);

  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const filteredProjects = useMemo(() => {
    if (selectedCompany === 'ALL') return projects;
    return projects.filter(p => p.company?.toLowerCase() === selectedCompany.toLowerCase());
  }, [projects, selectedCompany]);

  const handleCompanyChange = (companyName) => {
    setSelectedCompany(companyName);
    if (companyName === 'ALL') {
      if (projects.length > 0) setSelectedProjectId(projects[0].id);
    } else {
      const matching = projects.filter(p => p.company?.toLowerCase() === companyName.toLowerCase());
      if (matching.length > 0) setSelectedProjectId(matching[0].id);
    }
  };

  // Parse CSV or JSON text
  const handleParseInput = (rawText) => {
    setImportText(rawText);
    if (!rawText.trim()) {
      setPreviewTasks([]);
      return;
    }

    try {
      // Try parsing as JSON first
      if (rawText.trim().startsWith('[') || rawText.trim().startsWith('{')) {
        const parsed = JSON.parse(rawText);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        setPreviewTasks(arr);
        return;
      }

      // Parse as CSV
      const lines = rawText.trim().split('\n');
      if (lines.length < 2) {
        setPreviewTasks([]);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const parsedItems = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const vals = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = vals[idx] !== undefined ? vals[idx] : '';
        });
        parsedItems.push(obj);
      }

      setPreviewTasks(parsedItems);
    } catch (err) {
      console.warn('Parsing error:', err);
      setPreviewTasks([]);
    }
  };

  // File upload reader (.csv, .json)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text === 'string') {
        handleParseInput(text);
      }
    };
    reader.readAsText(file);
  };

  // Download Sample Import Template
  const handleDownloadTemplate = () => {
    const sampleCsv = `Task Name,Category,Built Up Area,Approved Rate,Approved Amount,Estimate Rate,Estimate Amount,Remarks
Substation Foundation Concrete,Civil & Structural,120,4500,540000,4650,558000,Foundation works for 33kv yard
HT Cable Trenching and Laying,Electrical Works,250,850,212500,890,222500,Trenching along eastern boundary
Transformer Erection & Bushing,Substation Equipment,1,185000,185000,195000,195000,10MVA Power Transformer
GI Earthing Grid Installation,Safety & Protection,80,620,49600,650,52000,40mm GI earthing electrode with bentonite`;

    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + sampleCsv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Task_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded sample task template!');
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (previewTasks.length === 0) {
      showToast('No tasks to import. Please upload a CSV file or paste task data.', 'error');
      return;
    }

    if (isLocked) {
      showToast('Project budget is locked. Unlock it in Set Budget Lock before importing.', 'error');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/engineering/tools/task-import-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'IMPORT_TASKS',
          projectId: selectedProjectId,
          tasksToImport: previewTasks,
          fileName: 'Manual_Upload.csv',
          importedBy: importedByName
        })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Successfully imported ${data.importedCount} tasks into project!`);
        setImportText('');
        setPreviewTasks([]);
        fetchData(selectedProjectId);
        setActiveTab('EXPORT');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Import failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error during task import', 'error');
    } finally {
      setImporting(false);
    }
  };

  // Export Tasks to CSV
  const handleExportTasksCSV = () => {
    if (tasks.length === 0) {
      showToast('No tasks available to export', 'error');
      return;
    }

    const headers = ['Task Name', 'Category', 'Built-Up Area', 'Approved Rate', 'Approved Amount', 'Allocated Rate', 'Allocated Amount', 'Estimate Rate', 'Estimate Amount', 'Expended Amount', 'Remarks'];
    const rows = tasks.map(t => [
      `"${t.taskName || ''}"`,
      `"${t.budgetHeadCategory || ''}"`,
      t.approvedBuiltUpArea || 1,
      t.approvedRate || 0,
      t.approvedAmount || 0,
      t.allocatedRate || 0,
      t.allocatedAmount || 0,
      t.estimateRate || 0,
      t.estimateAmount || 0,
      t.expendedAmount || 0,
      `"${t.remark || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WBS_Tasks_${currentProject?.name?.replace(/\s+/g, '_') || 'Export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported tasks to CSV!');
  };

  const formatRate = (val) => {
    return Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="custom-horizontal-scrollbar" style={{ padding: '1.5rem 2rem', background: '#f8fafc', minHeight: 'calc(100vh - 60px)', color: '#0f172a', overflowX: 'auto', minWidth: 0 }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          background: toast.type === 'error' ? '#ef4444' : '#0d9488',
          color: 'white',
          fontSize: '0.9rem',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <Home size={14} /> Home <ChevronRight size={14} /> Tools <ChevronRight size={14} /> <span style={{ color: '#0d9488', fontWeight: 600 }}>Task Import Export</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ccfbf1', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownUp size={24} color="#0d9488" />
            </div>
            Task Import & Export Master
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Bulk upload WBS tasks from Excel / CSV templates or export active project schedules directly into procurement and planning modules.
          </p>
        </div>

        {/* Dual Selectors: Company Library + Project */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Building2 size={16} color="#059669" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Company:</span>
            <select
              value={selectedCompany}
              onChange={(e) => handleCompanyChange(e.target.value)}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '13px', fontWeight: 600, padding: '0.35rem 0.65rem', borderRadius: '8px', outline: 'none', minWidth: '180px', cursor: 'pointer' }}
            >
              <option value="ALL">All Companies</option>
              {companies.map(c => (
                <option key={c.id || c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Layers size={16} color="#0d9488" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '13px', fontWeight: 600, padding: '0.35rem 0.65rem', borderRadius: '8px', outline: 'none', minWidth: '220px', cursor: 'pointer' }}
            >
              {filteredProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchData(selectedProjectId)}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="#0d9488" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ccfbf1', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Active Project Tasks</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{stats.totalTasks}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Approved Budget Ceiling</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>₹ {formatRate(stats.approvedTotal)}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Estimate Budget Total</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7c3aed' }}>₹ {formatRate(stats.estimateTotal)}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: isLocked ? '#fee2e2' : '#e0f2fe', color: isLocked ? '#dc2626' : '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Budget Lock State</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isLocked ? '#dc2626' : '#0284c7' }}>
              {isLocked ? 'Locked (Protected)' : 'Open for Changes'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => setActiveTab('IMPORT')}
              style={{
                border: 'none',
                background: activeTab === 'IMPORT' ? '#ffffff' : 'transparent',
                color: activeTab === 'IMPORT' ? '#0d9488' : '#64748b',
                fontWeight: activeTab === 'IMPORT' ? 700 : 500,
                fontSize: '13px',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeTab === 'IMPORT' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <Upload size={14} />
              <span>Import Tasks (CSV / JSON)</span>
            </button>

            <button
              onClick={() => setActiveTab('EXPORT')}
              style={{
                border: 'none',
                background: activeTab === 'EXPORT' ? '#ffffff' : 'transparent',
                color: activeTab === 'EXPORT' ? '#0d9488' : '#64748b',
                fontWeight: activeTab === 'EXPORT' ? 700 : 500,
                fontSize: '13px',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeTab === 'EXPORT' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <Download size={14} />
              <span>Export Active Tasks ({tasks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              style={{
                border: 'none',
                background: activeTab === 'HISTORY' ? '#ffffff' : 'transparent',
                color: activeTab === 'HISTORY' ? '#0d9488' : '#64748b',
                fontWeight: activeTab === 'HISTORY' ? 700 : 500,
                fontSize: '13px',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeTab === 'HISTORY' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <FileText size={14} />
              <span>Import History ({history.length})</span>
            </button>
          </div>

          <button
            onClick={handleDownloadTemplate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#16a34a',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span>Download CSV Template</span>
          </button>
        </div>

        {/* TAB 1: IMPORT TASKS */}
        {activeTab === 'IMPORT' && (
          <div style={{ padding: '1.5rem' }}>
            
            {isLocked && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#991b1b' }}>
                <ShieldAlert size={20} />
                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                  This project budget is currently locked. Task additions and imports are blocked until the lock is released in <strong>Tools &gt; Set Budget Lock</strong>.
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
              
              {/* Left: Upload and Input Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Drag and Drop Box */}
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'border 0.2s'
                }}>
                  <input
                    type="file"
                    accept=".csv,.json,.txt"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="task-file-upload"
                  />
                  <label htmlFor="task-file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ccfbf1', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                      <Upload size={24} />
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                      Click to upload CSV or JSON file
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Supports standard WBS task format (Task Name, Category, Built Up Area, Approved Rate, etc.)
                    </div>
                  </label>
                </div>

                {/* Paste Textarea */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Or Paste CSV / JSON Data Directly:
                  </label>
                  <textarea
                    rows={6}
                    placeholder={`Task Name,Category,Built Up Area,Approved Rate,Approved Amount,Estimate Rate,Estimate Amount\nExcavation for Foundation,Civil,100,450,45000,480,48000\nPVC Conduit Laying,Electrical,350,85,29750,90,31500`}
                    value={importText}
                    onChange={(e) => handleParseInput(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Imported By</label>
                    <input
                      type="text"
                      value={importedByName}
                      onChange={(e) => setImportedByName(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>

                  <button
                    onClick={handleExecuteImport}
                    disabled={importing || previewTasks.length === 0 || isLocked}
                    style={{
                      marginTop: '18px',
                      padding: '8px 20px',
                      background: isLocked ? '#94a3b8' : '#0d9488',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'white',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(13, 148, 136, 0.25)'
                    }}
                  >
                    {importing ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                    <span>Commit Import ({previewTasks.length} Tasks)</span>
                  </button>
                </div>

              </div>

              {/* Right: Validation & Live Preview */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    Parsed Preview ({previewTasks.length} Detected)
                  </h3>
                  {previewTasks.length > 0 && (
                    <button
                      onClick={() => { setImportText(''); setPreviewTasks([]); }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Clear Preview
                    </button>
                  )}
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', maxHeight: '380px', overflowY: 'auto' }}>
                  {previewTasks.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      No tasks uploaded or pasted yet. Use the upload box or template to preview tasks here before saving.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Task Name</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Category</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Rate</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Total Amt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewTasks.map((pt, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                              {pt.taskName || pt['Task Name'] || pt.name || 'Unnamed Task'}
                            </td>
                            <td style={{ padding: '8px 12px', color: '#64748b' }}>
                              {pt.budgetHeadCategory || pt['Category'] || 'Civil'}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                              ₹ {formatRate(pt.approvedRate || pt['Approved Rate'] || 0)}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0d9488' }}>
                              ₹ {formatRate(pt.approvedAmount || pt['Approved Amount'] || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: EXPORT ACTIVE TASKS */}
        {activeTab === 'EXPORT' && (
          <div>
            <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  Current Project Tasks ({tasks.length})
                </span>
                <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                  Project: <strong>{currentProject?.name}</strong>
                </span>
              </div>

              <button
                onClick={handleExportTasksCSV}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#0d9488',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(13, 148, 136, 0.25)'
                }}
              >
                <Download size={14} />
                <span>Download Active Tasks CSV</span>
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>Task Description</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '140px' }}>Category</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '90px' }}>Area/Qty</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '130px' }}>Approved Rate</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a', width: '150px' }}>Approved Amount</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#7c3aed', width: '150px' }}>Estimate Amount</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: '#64748b' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        No tasks found in this project. Use the Import tab to bulk add tasks.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                          {t.taskName}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>
                          <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
                            {t.budgetHeadCategory || 'General'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>
                          {t.approvedBuiltUpArea || 1}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 600 }}>
                          ₹ {formatRate(t.approvedRate)}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 700 }}>
                          ₹ {formatRate(t.approvedAmount)}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#7c3aed', fontWeight: 700 }}>
                          ₹ {formatRate(t.estimateAmount)}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                          {t.remark || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: IMPORT HISTORY */}
        {activeTab === 'HISTORY' && (
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Past Import Sessions for {currentProject?.name}
            </h3>

            {history.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                No past task import history recorded for this project.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {history.map((h, i) => (
                  <div
                    key={h.id || i}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ccfbf1', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Upload size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                          {h.fileName} • {h.count} Tasks Imported
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Imported by: <strong>{h.importedBy}</strong> on {h.formattedDate || h.importedAt}
                        </div>
                      </div>
                    </div>

                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '3px 10px', borderRadius: '12px' }}>
                      {h.status || 'Successful'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
