'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Home, ChevronRight, Layers, Building2, 
  Search, RefreshCw, Plus, Filter, Download, Calendar, User, FileText, 
  Clock, ArrowRight, CheckCircle2, AlertCircle, Sparkles, History, 
  Eye, X, ChevronDown, ChevronUp, Package, Users, Activity
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function EstimateChangesPage() {
  // Master data
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  
  // Data state
  const [changes, setChanges] = useState([]);
  const [itemTimelineMap, setItemTimelineMap] = useState({});
  const [stats, setStats] = useState({
    totalChanges: 0,
    itemsChangedCount: 0,
    netAmountVariance: 0,
    latestChangeDate: null
  });
  const [loading, setLoading] = useState(true);

  // View & Filter states
  const [viewMode, setViewMode] = useState('TIMELINE'); // 'TIMELINE' | 'TABLE'
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'WBS Task' | 'Material' | 'Labour'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemForDetail, setSelectedItemForDetail] = useState(null);
  const [expandedItemKeys, setExpandedItemKeys] = useState({});

  // Record change modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    itemName: '',
    itemCategory: 'WBS Task',
    unit: 'Nos',
    previousRate: '',
    newRate: '',
    quantity: 1,
    changedBy: '',
    reason: '',
    status: 'Approved'
  });

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Estimate Changes
  const fetchEstimateChanges = async (projectIdToFetch = selectedProjectId) => {
    setLoading(true);
    try {
      const url = `/api/engineering/tools/estimate-changes?projectId=${projectIdToFetch || ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        setProjects(data.projects || []);
        setChanges(data.changes || []);
        setItemTimelineMap(data.itemTimelineMap || {});
        setStats(data.stats || {
          totalChanges: 0,
          itemsChangedCount: 0,
          netAmountVariance: 0,
          latestChangeDate: null
        });

        if (!selectedProjectId && data.selectedProjectId) {
          setSelectedProjectId(data.selectedProjectId);
        }

        // Default expand first two items in timeline view
        const keys = Object.keys(data.itemTimelineMap || {});
        if (keys.length > 0) {
          setExpandedItemKeys({ [keys[0]]: true, [keys[1]]: true });
        }
      } else {
        showToast('Failed to load estimate changes', 'error');
      }
    } catch (err) {
      console.error('Error loading estimate changes:', err);
      showToast('Error connecting to estimate changes service', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimateChanges(selectedProjectId);
  }, [selectedProjectId]);

  // Selected project object
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Filtered projects by selectedCompany
  const filteredProjects = useMemo(() => {
    if (selectedCompany === 'ALL') return projects;
    return projects.filter(p => p.company?.toLowerCase() === selectedCompany.toLowerCase());
  }, [projects, selectedCompany]);

  // Handle Company switch
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

  // Toggle item expansion
  const toggleItemExpand = (itemName) => {
    setExpandedItemKeys(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  // Filtered change logs for Table View
  const filteredChanges = useMemo(() => {
    return changes.filter(c => {
      if (categoryFilter !== 'ALL' && c.itemCategory !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = c.itemName?.toLowerCase().includes(q);
        const matchBy = c.changedBy?.toLowerCase().includes(q);
        const matchReason = c.reason?.toLowerCase().includes(q);
        const matchRev = c.revisionNo?.toLowerCase().includes(q);
        if (!matchName && !matchBy && !matchReason && !matchRev) return false;
      }
      return true;
    });
  }, [changes, categoryFilter, searchQuery]);

  // Filtered item timelines for "Kab Kab Change Hua" Timeline View
  const filteredItemTimelines = useMemo(() => {
    const list = Object.values(itemTimelineMap);
    return list.filter(item => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = item.itemName?.toLowerCase().includes(q);
        const matchHistory = item.history.some(h => 
          h.changedBy?.toLowerCase().includes(q) || 
          h.reason?.toLowerCase().includes(q) ||
          h.revisionNo?.toLowerCase().includes(q)
        );
        if (!matchName && !matchHistory) return false;
      }
      return true;
    });
  }, [itemTimelineMap, categoryFilter, searchQuery]);

  // Add new Estimate Change handler
  const handleAddEstimateChange = async (e) => {
    e.preventDefault();
    if (!addForm.itemName || addForm.newRate === '') {
      showToast('Item Name and New Rate are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/engineering/tools/estimate-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          ...addForm
        })
      });

      if (res.ok) {
        showToast('Estimate change recorded successfully!');
        setShowAddModal(false);
        setAddForm({
          itemName: '',
          itemCategory: 'WBS Task',
          unit: 'Nos',
          previousRate: '',
          newRate: '',
          quantity: 1,
          changedBy: '',
          reason: '',
          status: 'Approved'
        });
        fetchEstimateChanges(selectedProjectId);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to save estimate change', 'error');
      }
    } catch (err) {
      console.error('Error recording estimate change:', err);
      showToast('Failed to record estimate change', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (changes.length === 0) {
      showToast('No estimate changes to export', 'error');
      return;
    }

    const headers = ['Date & Time', 'Revision', 'Item Name', 'Category', 'Unit', 'Previous Rate', 'New Rate', 'Rate Change (₹)', 'Rate Change (%)', 'Previous Amount', 'New Amount', 'Changed By', 'Reason', 'Status'];
    const rows = changes.map(c => [
      `"${c.formattedDate || c.changedAt}"`,
      `"${c.revisionNo || ''}"`,
      `"${c.itemName || ''}"`,
      `"${c.itemCategory || ''}"`,
      `"${c.unit || ''}"`,
      c.previousRate,
      c.newRate,
      c.rateChange,
      `${c.rateChangePct}%`,
      c.previousAmount,
      c.newAmount,
      `"${c.changedBy || ''}"`,
      `"${c.reason || ''}"`,
      `"${c.status || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Estimate_Changes_History_${currentProject?.name?.replace(/\s+/g, '_') || 'Project'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported estimate change audit log to CSV!');
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
          background: toast.type === 'error' ? '#ef4444' : '#4f46e5',
          color: 'white',
          fontSize: '0.9rem',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <Home size={14} /> Home <ChevronRight size={14} /> Tools <ChevronRight size={14} /> <span style={{ color: '#4f46e5', fontWeight: 600 }}>Estimate Changes</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ede9fe', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} color="#4f46e5" />
            </div>
            Estimate Changes & Revision Audit
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Complete audit trail showing whenever an item&apos;s estimate changed (kb kb item ka estimate change hua h), including rates, variance, and reasons.
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
            <Layers size={16} color="#4f46e5" />
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
            onClick={() => fetchEstimateChanges(selectedProjectId)}
            disabled={loading}
            title="Refresh changes"
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
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="#4f46e5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ede9fe', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <History size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Revisions Logged</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{stats.totalChanges}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Items with Changes</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{stats.itemsChangedCount}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: stats.netAmountVariance >= 0 ? '#fef3c7' : '#dcfce7', color: stats.netAmountVariance >= 0 ? '#b45309' : '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {stats.netAmountVariance >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Net Budget Impact</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stats.netAmountVariance >= 0 ? '#b45309' : '#15803d' }}>
              ₹ {formatRate(stats.netAmountVariance)}
            </div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Latest Change Logged</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
              {stats.latestChangeDate || 'N/A'}
            </div>
          </div>
        </div>

      </div>

      {/* Active Project & Company Context Banner */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} color="#059669" />
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Company Library</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                {currentProject?.company || selectedCompany}
              </div>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#4f46e5" />
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Selected Project</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                {currentProject?.name || 'No Project Selected'}
              </div>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }} />

          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Built-Up Area</span>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
              {currentProject?.builtUpArea || '0'} Sqm
            </div>
          </div>
        </div>

        {/* View Mode Toggle: Timeline vs Table */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
          <button
            onClick={() => setViewMode('TIMELINE')}
            style={{
              border: 'none',
              background: viewMode === 'TIMELINE' ? '#ffffff' : 'transparent',
              color: viewMode === 'TIMELINE' ? '#4f46e5' : '#64748b',
              fontWeight: 700,
              fontSize: '12px',
              padding: '5px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: viewMode === 'TIMELINE' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <History size={14} />
            <span>Item-wise Chronology (Kab Kab Change Hua)</span>
          </button>

          <button
            onClick={() => setViewMode('TABLE')}
            style={{
              border: 'none',
              background: viewMode === 'TABLE' ? '#ffffff' : 'transparent',
              color: viewMode === 'TABLE' ? '#4f46e5' : '#64748b',
              fontWeight: 700,
              fontSize: '12px',
              padding: '5px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: viewMode === 'TABLE' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={14} />
            <span>All Changes Audit Table</span>
          </button>
        </div>
      </div>

      {/* Main Container Card */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        
        {/* Controls Bar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#ffffff' }}>
          
          {/* Category Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            {['ALL', 'WBS Task', 'Material', 'Labour'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  border: 'none',
                  background: categoryFilter === cat ? '#ffffff' : 'transparent',
                  color: categoryFilter === cat ? '#4f46e5' : '#64748b',
                  fontWeight: categoryFilter === cat ? 700 : 500,
                  fontSize: '13px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: categoryFilter === cat ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          {/* Search and Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search item, person, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {/* Record New Change Button */}
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#4f46e5',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)'
              }}
            >
              <Plus size={16} />
              <span>Record Estimate Change</span>
            </button>

            {/* Export CSV Button */}
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

        {/* Content Section */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={26} className="animate-spin" color="#4f46e5" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ fontWeight: 600 }}>Loading Estimate Changes History...</div>
          </div>
        ) : (
          <div>
            {/* VIEW 1: ITEM-WISE CHRONOLOGY ("Kab Kab Change Hua") */}
            {viewMode === 'TIMELINE' && (
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredItemTimelines.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No items found matching the selected filters.
                  </div>
                ) : (
                  filteredItemTimelines.map((item) => {
                    const isExpanded = !!expandedItemKeys[item.itemName];
                    const netDiff = (item.currentRate || 0) - (item.initialRate || 0);
                    const netDiffPct = item.initialRate > 0 ? (((netDiff) / item.initialRate) * 100).toFixed(1) : 0;

                    return (
                      <div 
                        key={item.itemName}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: '#ffffff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                      >
                        {/* Item Card Header */}
                        <div 
                          onClick={() => toggleItemExpand(item.itemName)}
                          style={{
                            padding: '1rem 1.25rem',
                            background: isExpanded ? '#f8fafc' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: item.category === 'Material' ? '#ede9fe' : item.category === 'Labour' ? '#fef3c7' : '#e0f2fe',
                              color: item.category === 'Material' ? '#7c3aed' : item.category === 'Labour' ? '#b45309' : '#0284c7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {item.category === 'Material' ? <Package size={18} /> : item.category === 'Labour' ? <Users size={18} /> : <Layers size={18} />}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{item.itemName}</span>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: item.category === 'Material' ? '#f5f3ff' : item.category === 'Labour' ? '#fefce8' : '#f0f9ff',
                                  color: item.category === 'Material' ? '#6d28d9' : item.category === 'Labour' ? '#a16207' : '#0369a1'
                                }}>
                                  {item.category}
                                </span>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>({item.unit})</span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                Revised <strong style={{ color: '#4f46e5' }}>{item.revisionsCount} time{item.revisionsCount > 1 ? 's' : ''}</strong> • Latest Change: <strong>{item.history[0]?.formattedDate}</strong>
                              </div>
                            </div>
                          </div>

                          {/* Rate Progression & Delta */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Initial ➔ Current Estimate</div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>₹ {formatRate(item.initialRate)}</span>
                                <ArrowRight size={13} color="#94a3b8" />
                                <span style={{ color: '#4f46e5' }}>₹ {formatRate(item.currentRate)}</span>
                              </div>
                            </div>

                            {/* Net Variance Badge */}
                            <div>
                              {netDiff === 0 ? (
                                <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: '#f1f5f9', color: '#64748b', fontWeight: 700 }}>
                                  No Variance
                                </span>
                              ) : netDiff > 0 ? (
                                <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: '#fee2e2', color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <TrendingUp size={13} /> +₹ {formatRate(netDiff)} (+{netDiffPct}%)
                                </span>
                              ) : (
                                <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: '#dcfce7', color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <TrendingDown size={13} /> -₹ {formatRate(Math.abs(netDiff))} ({netDiffPct}%)
                                </span>
                              )}
                            </div>

                            <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
                              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                          </div>
                        </div>

                        {/* Chronological Timeline History: "Kab Kab Change Hua" */}
                        {isExpanded && (
                          <div style={{ padding: '1.25rem 1.5rem', background: '#fafafa' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={14} color="#4f46e5" />
                              <span>Timeline of Estimate Changes for {item.itemName} (Kab Kab Change Hua)</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', paddingLeft: '24px' }}>
                              {/* Vertical Line */}
                              <div style={{ position: 'absolute', left: '8px', top: '10px', bottom: '10px', width: '2px', background: '#cbd5e1' }} />

                              {item.history.map((rev, idx) => {
                                const isLatest = idx === 0;
                                return (
                                  <div 
                                    key={rev.id} 
                                    style={{
                                      position: 'relative',
                                      background: isLatest ? '#ffffff' : '#f8fafc',
                                      border: isLatest ? '1.5px solid #818cf8' : '1px solid #e2e8f0',
                                      borderRadius: '10px',
                                      padding: '12px 16px',
                                      boxShadow: isLatest ? '0 2px 5px rgba(79, 70, 229, 0.08)' : 'none'
                                    }}
                                  >
                                    {/* Timeline Node Dot */}
                                    <div style={{
                                      position: 'absolute',
                                      left: '-20px',
                                      top: '16px',
                                      width: '10px',
                                      height: '10px',
                                      borderRadius: '50%',
                                      background: isLatest ? '#4f46e5' : '#94a3b8',
                                      border: '2px solid white'
                                    }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', background: '#ede9fe', padding: '2px 8px', borderRadius: '6px' }}>
                                            {rev.revisionNo}
                                          </span>
                                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={13} color="#64748b" />
                                            {rev.formattedDate || rev.changedAt}
                                          </span>
                                          {isLatest && (
                                            <span style={{ fontSize: '10px', fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px' }}>
                                              ACTIVE ESTIMATE
                                            </span>
                                          )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '13px' }}>
                                          <div>
                                            <span style={{ color: '#64748b' }}>Rate Changed: </span>
                                            <span style={{ fontWeight: 600, color: '#475569' }}>₹ {formatRate(rev.previousRate)}</span>
                                            <span style={{ margin: '0 6px', color: '#94a3b8' }}>➔</span>
                                            <span style={{ fontWeight: 800, color: '#0f172a' }}>₹ {formatRate(rev.newRate)}</span>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}> /{item.unit}</span>
                                          </div>

                                          <span style={{ color: '#cbd5e1' }}>•</span>

                                          <div style={{ fontWeight: 700, color: rev.rateChange >= 0 ? '#dc2626' : '#15803d' }}>
                                            {rev.rateChange >= 0 ? `+₹ ${formatRate(rev.rateChange)} (+${rev.rateChangePct}%)` : `-₹ ${formatRate(Math.abs(rev.rateChange))} (${rev.rateChangePct}%)`}
                                          </div>
                                        </div>

                                        {/* Reason & Changed By */}
                                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <User size={13} color="#64748b" />
                                            <span>Changed by: <strong>{rev.changedBy}</strong></span>
                                          </div>
                                          {rev.reason && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              <FileText size={13} color="#64748b" />
                                              <span>Reason: <em>&ldquo;{rev.reason}&rdquo;</em></span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>Revised Total Amount</div>
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>₹ {formatRate(rev.newAmount)}</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* VIEW 2: ALL CHANGES MASTER AUDIT TABLE */}
            {viewMode === 'TABLE' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '160px' }}>Date & Time (Kb Hua)</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '80px' }}>Rev #</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>Item Description</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '100px' }}>Category</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: '#64748b', width: '120px' }}>Previous Rate</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4f46e5', width: '120px' }}>New Rate</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '130px' }}>Rate Variance</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '160px' }}>Changed By</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>Reason / Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChanges.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                          No estimate change logs found matching the filter.
                        </td>
                      </tr>
                    ) : (
                      filteredChanges.map((chg) => {
                        const isIncrease = chg.rateChange > 0;
                        const isDecrease = chg.rateChange < 0;

                        return (
                          <tr 
                            key={chg.id}
                            style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={13} color="#4f46e5" />
                                {chg.formattedDate || chg.changedAt}
                              </div>
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', background: '#ede9fe', padding: '2px 8px', borderRadius: '6px' }}>
                                {chg.revisionNo || 'Rev 1'}
                              </span>
                            </td>

                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                              {chg.itemName}
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginLeft: '6px' }}>
                                ({chg.unit})
                              </span>
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: chg.itemCategory === 'Material' ? '#f5f3ff' : chg.itemCategory === 'Labour' ? '#fefce8' : '#f0f9ff',
                                color: chg.itemCategory === 'Material' ? '#6d28d9' : chg.itemCategory === 'Labour' ? '#a16207' : '#0369a1'
                              }}>
                                {chg.itemCategory}
                              </span>
                            </td>

                            <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>
                              ₹ {formatRate(chg.previousRate)}
                            </td>

                            <td style={{ padding: '12px 16px', color: '#4f46e5', fontWeight: 800 }}>
                              ₹ {formatRate(chg.newRate)}
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              {isIncrease ? (
                                <span style={{ fontSize: '11px', color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <TrendingUp size={12} /> +₹{formatRate(chg.rateChange)} (+{chg.rateChangePct}%)
                                </span>
                              ) : isDecrease ? (
                                <span style={{ fontSize: '11px', color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <TrendingDown size={12} /> -₹{formatRate(Math.abs(chg.rateChange))} ({chg.rateChangePct}%)
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                  0.00%
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={13} color="#64748b" />
                                {chg.changedBy}
                              </div>
                            </td>

                            <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                              {chg.reason || 'Estimate revision'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ========================================================
          MODAL: RECORD ESTIMATE CHANGE
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
                <Plus size={20} color="#4f46e5" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  Record New Estimate Change
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddEstimateChange} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Item / Task Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 25mm PVC Conduit Pipe, Substation Structure WBS"
                  value={addForm.itemName}
                  onChange={(e) => setAddForm({ ...addForm, itemName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Category *</label>
                  <select
                    value={addForm.itemCategory}
                    onChange={(e) => setAddForm({ ...addForm, itemCategory: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  >
                    <option value="WBS Task">WBS Task</option>
                    <option value="Material">Material</option>
                    <option value="Labour">Labour</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Unit *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nos, Mtr, Bag, Sqm"
                    value={addForm.unit}
                    onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Previous Estimate Rate (₹)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 400"
                    value={addForm.previousRate}
                    onChange={(e) => setAddForm({ ...addForm, previousRate: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>New Estimate Rate (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="e.g. 430"
                    value={addForm.newRate}
                    onChange={(e) => setAddForm({ ...addForm, newRate: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Changed By (Author / Engineer)</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar (Planning Lead)"
                  value={addForm.changedBy}
                  onChange={(e) => setAddForm({ ...addForm, changedBy: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Reason for Estimate Revision</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Quantity variation after site survey, drawing revision Rev B"
                  value={addForm.reason}
                  onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', resize: 'vertical' }}
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
                  disabled={submitting}
                  style={{ padding: '8px 20px', background: '#4f46e5', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)' }}
                >
                  {submitting ? 'Recording...' : 'Record Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
