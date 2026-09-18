'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, Home, ChevronRight, Layers, Building2, Search, 
  RefreshCw, Plus, ArrowUpDown, Filter, Download, Edit3, Save, 
  X, Check, AlertCircle, Percent, RotateCcw, Trash2, Package, 
  Users, Sparkles, CheckCircle2, TrendingUp, TrendingDown
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function ProjectWiseRatePage() {
  // Master data
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  
  // Rate items and stats
  const [rates, setRates] = useState([]);
  const [stats, setStats] = useState({ totalItems: 0, materialCount: 0, labourCount: 0, customRateCount: 0 });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'MATERIAL' | 'LABOUR' | 'CUSTOM'
  const [searchQuery, setSearchQuery] = useState('');

  // Inline editing state: { [id]: projectRate }
  const [editedRates, setEditedRates] = useState({});

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    type: 'Material',
    unit: 'Nos',
    standardRate: '',
    projectRate: '',
    remarks: ''
  });

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    percentChange: 5,
    applyTo: 'ALL'
  });

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch Projects & Initial Data
  const fetchRates = async (projectIdToFetch = selectedProjectId, sync = false) => {
    setLoading(true);
    try {
      const url = `/api/engineering/tools/project-wise-rate?projectId=${projectIdToFetch || ''}${sync ? '&sync=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        setProjects(data.projects || []);
        setRates(data.rates || []);
        setStats(data.stats || { totalItems: 0, materialCount: 0, labourCount: 0, customRateCount: 0 });

        if (!selectedProjectId && data.projectId) {
          setSelectedProjectId(data.projectId);
        }
        if (sync) {
          showToast('Project rates synced successfully!');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to load project rates', 'error');
      }
    } catch (err) {
      console.error('Error fetching rates', err);
      showToast('Error connecting to project rates service', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates(selectedProjectId);
  }, [selectedProjectId]);

  // Current selected project
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Filtered projects by selectedCompany
  const filteredProjects = useMemo(() => {
    if (selectedCompany === 'ALL') return projects;
    return projects.filter(p => p.company?.toLowerCase() === selectedCompany.toLowerCase());
  }, [projects, selectedCompany]);

  // Handle company change: update selected project to first project of that company
  const handleCompanyChange = (companyName) => {
    setSelectedCompany(companyName);
    if (companyName === 'ALL') {
      if (projects.length > 0) setSelectedProjectId(projects[0].id);
    } else {
      const matching = projects.filter(p => p.company?.toLowerCase() === companyName.toLowerCase());
      if (matching.length > 0) {
        setSelectedProjectId(matching[0].id);
      }
    }
  };

  // Filtered rates based on activeTab and search
  const filteredRates = useMemo(() => {
    return rates.filter(item => {
      // Tab filter
      if (activeTab === 'MATERIAL' && item.type !== 'Material') return false;
      if (activeTab === 'LABOUR' && item.type !== 'Labour') return false;
      if (activeTab === 'CUSTOM' && Number(item.projectRate) === Number(item.standardRate)) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name?.toLowerCase().includes(q);
        const matchCode = item.itemCode?.toLowerCase().includes(q);
        const matchUnit = item.unit?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchUnit) return false;
      }

      return true;
    });
  }, [rates, activeTab, searchQuery]);

  // Inline rate change handler
  const handleRateInputChange = (id, value) => {
    setEditedRates(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Save single rate
  const handleSaveRate = async (item) => {
    const newRate = editedRates[item.id] !== undefined ? editedRates[item.id] : item.projectRate;
    if (newRate === '' || isNaN(newRate) || Number(newRate) < 0) {
      showToast('Please enter a valid rate greater than or equal to 0', 'error');
      return;
    }

    setSavingId(item.id);
    try {
      const res = await fetch('/api/engineering/tools/project-wise-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_RATE',
          projectId: selectedProjectId,
          id: item.id,
          projectRate: parseFloat(newRate),
          effectiveDate: new Date().toISOString().split('T')[0]
        })
      });

      const resData = await res.json();
      if (res.ok) {
        showToast(resData.message || 'Rate updated successfully!');
        setRates(resData.rates || []);
        setEditedRates(prev => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      } else {
        showToast(resData.error || 'Failed to update rate', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving project rate', 'error');
    } finally {
      setSavingId(null);
    }
  };

  // Bulk rate adjustment
  const handleBulkAdjust = async () => {
    const pct = parseFloat(bulkForm.percentChange);
    if (isNaN(pct)) {
      showToast('Please enter a valid percentage', 'error');
      return;
    }

    try {
      const res = await fetch('/api/engineering/tools/project-wise-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BULK_ADJUST',
          projectId: selectedProjectId,
          percentChange: pct,
          applyTo: bulkForm.applyTo
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Bulk adjustment applied!');
        setRates(data.rates || []);
        setShowBulkModal(false);
      } else {
        showToast(data.error || 'Bulk adjustment failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error applying bulk adjustment', 'error');
    }
  };

  // Reset to Standard Master Rates
  const handleResetToMaster = async () => {
    if (!window.confirm(`Are you sure you want to reset all rates in "${currentProject?.name}" to the master library rates?`)) {
      return;
    }

    try {
      const res = await fetch('/api/engineering/tools/project-wise-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_TO_MASTER',
          projectId: selectedProjectId,
          applyTo: activeTab === 'MATERIAL' ? 'MATERIAL' : activeTab === 'LABOUR' ? 'LABOUR' : 'ALL'
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Reset to standard rates!');
        setRates(data.rates || []);
      } else {
        showToast(data.error || 'Reset failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error resetting rates', 'error');
    }
  };

  // Add new custom rate item
  const handleAddNewItem = async (e) => {
    e.preventDefault();
    if (!newItemForm.name.trim()) {
      showToast('Please enter an item name', 'error');
      return;
    }
    const pRate = parseFloat(newItemForm.projectRate);
    if (isNaN(pRate) || pRate < 0) {
      showToast('Please enter a valid Project Rate', 'error');
      return;
    }

    try {
      const res = await fetch('/api/engineering/tools/project-wise-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_RATE_ITEM',
          projectId: selectedProjectId,
          name: newItemForm.name.trim(),
          type: newItemForm.type,
          unit: newItemForm.unit,
          standardRate: parseFloat(newItemForm.standardRate) || pRate,
          projectRate: pRate,
          remarks: newItemForm.remarks
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Item added successfully!');
        setRates(data.rates || []);
        setShowAddModal(false);
        setNewItemForm({ name: '', type: 'Material', unit: 'Nos', standardRate: '', projectRate: '', remarks: '' });
      } else {
        showToast(data.error || 'Failed to add item', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error adding rate item', 'error');
    }
  };

  // Delete rate item
  const handleDeleteItem = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from this project's rate list?`)) {
      return;
    }

    try {
      const res = await fetch('/api/engineering/tools/project-wise-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_RATE_ITEM',
          projectId: selectedProjectId,
          id
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Item removed');
        setRates(data.rates || []);
      } else {
        showToast(data.error || 'Failed to delete item', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting item', 'error');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (rates.length === 0) {
      showToast('No rates to export', 'error');
      return;
    }

    const headers = ['Item Code', 'Item Description', 'Type', 'Unit', 'Master Benchmark Rate (INR)', 'Project Rate (INR)', 'Variance (%)', 'Status', 'Effective Date', 'Remarks'];
    const rows = filteredRates.map(r => {
      const std = Number(r.standardRate) || 0;
      const proj = Number(r.projectRate) || 0;
      const variance = std > 0 ? (((proj - std) / std) * 100).toFixed(2) + '%' : '0%';
      return [
        r.itemCode,
        `"${r.name.replace(/"/g, '""')}"`,
        r.type,
        r.unit,
        std,
        proj,
        variance,
        r.status,
        r.effectiveDate,
        `"${(r.remarks || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Project_Rates_${currentProject?.name?.replace(/\s+/g, '_') || 'Export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported rate card to CSV!');
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
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
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
            <Home size={14} /> Home <ChevronRight size={14} /> Tools <ChevronRight size={14} /> <span style={{ color: '#059669', fontWeight: 600 }}>Project Wise Rate</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#d1fae5', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={24} color="#059669" />
            </div>
            Project Wise Rate Master
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Configure and calibrate project-specific material procurement and labour contract rates by Company & Project.
          </p>
        </div>

        {/* Dual Selectors: Company Library + Project */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* Company Selector */}
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

          {/* Project Selector */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Layers size={16} color="#0284c7" />
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
            onClick={() => fetchRates(selectedProjectId, true)}
            disabled={loading}
            title="Reload rates"
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
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="#059669" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Rate Items</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{rates.length}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Material Items</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{stats.materialCount}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Labour Designations</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{stats.labourCount}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Custom Overrides</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{stats.customRateCount}</div>
          </div>
        </div>
      </div>

      {/* Active Selection Context Banner */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} color="#059669" />
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Company (from Library)</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                {currentProject?.company || (selectedCompany !== 'ALL' ? selectedCompany : 'All Companies')}
              </div>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#0284c7" />
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Project</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                {currentProject?.name || 'No Project Selected'}
              </div>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }} />

          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Linked Library</span>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
              {currentProject?.library || 'Standard Master Library'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Status:</span>
          <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px' }}>
            Active Rate Schedule
          </span>
        </div>
      </div>

      {/* Main Container Card */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        
        {/* Controls Bar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#ffffff' }}>
          
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => setActiveTab('ALL')}
              style={{
                border: 'none',
                background: activeTab === 'ALL' ? '#ffffff' : 'transparent',
                color: activeTab === 'ALL' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'ALL' ? 700 : 500,
                fontSize: '13px',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: activeTab === 'ALL' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              All Items ({rates.length})
            </button>

            <button
              onClick={() => setActiveTab('MATERIAL')}
              style={{
                border: 'none',
                background: activeTab === 'MATERIAL' ? '#ffffff' : 'transparent',
                color: activeTab === 'MATERIAL' ? '#7c3aed' : '#64748b',
                fontWeight: activeTab === 'MATERIAL' ? 700 : 500,
                fontSize: '13px',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: activeTab === 'MATERIAL' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Materials ({stats.materialCount})
            </button>

            <button
              onClick={() => setActiveTab('LABOUR')}
              style={{
                border: 'none',
                background: activeTab === 'LABOUR' ? '#ffffff' : 'transparent',
                color: activeTab === 'LABOUR' ? '#d97706' : '#64748b',
                fontWeight: activeTab === 'LABOUR' ? 700 : 500,
                fontSize: '13px',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: activeTab === 'LABOUR' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Labour ({stats.labourCount})
            </button>

            <button
              onClick={() => setActiveTab('CUSTOM')}
              style={{
                border: 'none',
                background: activeTab === 'CUSTOM' ? '#ffffff' : 'transparent',
                color: activeTab === 'CUSTOM' ? '#0284c7' : '#64748b',
                fontWeight: activeTab === 'CUSTOM' ? 700 : 500,
                fontSize: '13px',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: activeTab === 'CUSTOM' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Custom Overrides ({stats.customRateCount})
            </button>
          </div>

          {/* Right Action Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Bulk Escalation / Discount */}
            <button
              onClick={() => setShowBulkModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              <Percent size={15} color="#059669" />
              <span>Bulk Adjust %</span>
            </button>

            {/* Reset to Master Benchmark */}
            <button
              onClick={handleResetToMaster}
              title="Reset rates to standard master prices"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={14} color="#64748b" />
              <span>Reset Standard</span>
            </button>

            {/* Add New Rate Item */}
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#059669',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
              }}
            >
              <Plus size={16} />
              <span>Add Rate Item</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              <Download size={14} color="#0284c7" />
              <span>Export CSV</span>
            </button>

          </div>
        </div>

        {/* Rates Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '100px' }}>Code</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>Item Description</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '110px' }}>Category</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '90px' }}>Unit</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#64748b', width: '150px' }}>Master Benchmark</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#059669', width: '170px' }}>Project Rate (₹)</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '120px' }}>Variance</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '150px' }}>Effective Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', textAlign: 'center', width: '100px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={22} className="animate-spin" color="#059669" style={{ margin: '0 auto 8px auto' }} />
                    <div>Loading Project Rates...</div>
                  </td>
                </tr>
              ) : filteredRates.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No rate items found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRates.map((r) => {
                  const isMaterial = r.type === 'Material';
                  const stdRate = Number(r.standardRate) || 0;
                  const currentProjRate = editedRates[r.id] !== undefined ? editedRates[r.id] : r.projectRate;
                  const projRateNum = Number(currentProjRate) || 0;
                  const diffPct = stdRate > 0 ? (((projRateNum - stdRate) / stdRate) * 100).toFixed(1) : 0;
                  const isDirty = editedRates[r.id] !== undefined && Number(editedRates[r.id]) !== Number(r.projectRate);
                  const isCustom = projRateNum !== stdRate;

                  return (
                    <tr 
                      key={r.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isDirty ? '#fefce8' : isCustom ? '#f0fdf4' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      {/* Code */}
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#64748b', fontSize: '12px' }}>
                        {r.itemCode}
                      </td>

                      {/* Name & Remarks */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.name}</div>
                        {r.remarks && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            {r.remarks}
                          </div>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isMaterial ? '#ede9fe' : '#fef3c7',
                          color: isMaterial ? '#7c3aed' : '#b45309'
                        }}>
                          {r.type}
                        </span>
                      </td>

                      {/* Unit */}
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>
                        {r.unit}
                      </td>

                      {/* Master Benchmark Rate */}
                      <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: 500 }}>
                        ₹ {stdRate.toLocaleString('en-IN')}
                      </td>

                      {/* Project Rate (Editable) */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>₹</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={currentProjRate ?? ''}
                            onChange={(e) => handleRateInputChange(r.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRate(r);
                            }}
                            style={{
                              width: '100px',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: isDirty ? '2px solid #eab308' : '1px solid #cbd5e1',
                              fontWeight: 700,
                              fontSize: '13px',
                              color: '#0f172a',
                              background: 'white',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </td>

                      {/* Variance Indicator */}
                      <td style={{ padding: '12px 16px' }}>
                        {diffPct == 0 ? (
                          <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                            Standard
                          </span>
                        ) : diffPct > 0 ? (
                          <span style={{ fontSize: '11px', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <TrendingUp size={12} /> +{diffPct}%
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <TrendingDown size={12} /> {diffPct}%
                          </span>
                        )}
                      </td>

                      {/* Effective Date */}
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                        {r.effectiveDate || '—'}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          {isDirty ? (
                            <button
                              type="button"
                              onClick={() => handleSaveRate(r)}
                              disabled={savingId === r.id}
                              title="Save Rate"
                              style={{
                                background: '#059669',
                                color: 'white',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {savingId === r.id ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                              <span>Save</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(r.id, r.name)}
                              title="Delete Item"
                              style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ========================================================
          MODAL: ADD NEW RATE ITEM
          ======================================================== */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  Add Project Rate Item
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddNewItem} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Copper Wire 4.0mm, Tower Crane Operator"
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Category *</label>
                  <select
                    value={newItemForm.type}
                    onChange={(e) => setNewItemForm({ ...newItemForm, type: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  >
                    <option value="Material">Material</option>
                    <option value="Labour">Labour</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Unit *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nos, Mtr, Bag, Manday"
                    value={newItemForm.unit}
                    onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Standard Master Rate (₹)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 500"
                    value={newItemForm.standardRate}
                    onChange={(e) => setNewItemForm({ ...newItemForm, standardRate: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Project Rate (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="e.g. 550"
                    value={newItemForm.projectRate}
                    onChange={(e) => setNewItemForm({ ...newItemForm, projectRate: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Remarks / Contract Note</label>
                <input
                  type="text"
                  placeholder="e.g. Site agreement rate"
                  value={newItemForm.remarks}
                  onChange={(e) => setNewItemForm({ ...newItemForm, remarks: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', background: '#059669', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)' }}
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: BULK PERCENTAGE ADJUSTMENT
          ======================================================== */}
      {showBulkModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '460px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Percent size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  Bulk Rate Escalation / Adjustment
                </h3>
              </div>
              <button onClick={() => setShowBulkModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Adjust project rates by a percentage markup (e.g. +5% inflation escalation) or discount (e.g. -3%).
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Apply Adjustment To:</label>
                <select
                  value={bulkForm.applyTo}
                  onChange={(e) => setBulkForm({ ...bulkForm, applyTo: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}
                >
                  <option value="ALL">All Materials and Labour</option>
                  <option value="MATERIAL">Materials Only</option>
                  <option value="LABOUR">Labour Only</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Percentage Change (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    step="any"
                    value={bulkForm.percentChange}
                    onChange={(e) => setBulkForm({ ...bulkForm, percentChange: e.target.value })}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>%</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Use positive numbers (e.g. 5) to increase, or negative (e.g. -5) to discount.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkAdjust}
                  style={{ padding: '8px 20px', background: '#059669', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)' }}
                >
                  Apply Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding Line */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', fontSize: '0.78rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
        <span>Powered by Kanix Infotech Pvt. Ltd.</span>
        <span style={{ color: '#059669', fontWeight: 600 }}>CeCube Engineering Suite • Project Wise Rate v1.0</span>
      </div>

    </div>
  );
}
