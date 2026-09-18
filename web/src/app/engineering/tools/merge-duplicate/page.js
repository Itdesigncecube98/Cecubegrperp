'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  GitMerge, Home, ChevronRight, Layers, ArrowRight, RefreshCw, 
  Search, Check, AlertCircle, Info, Scale, Package, Users, 
  History, Sparkles, HelpCircle, X, ShieldAlert, ArrowLeftRight, CheckCircle2
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function MergeDuplicatePage() {
  // Projects State
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Active Tab: 'units' | 'materials' | 'labour' | 'history'
  const [activeTab, setActiveTab] = useState('units');

  // Project Data State
  const [data, setData] = useState({
    units: [],
    materials: [],
    labours: [],
    masterUnits: [],
    suggestions: [],
    history: [],
    totalTasks: 0
  });
  const [loadingData, setLoadingData] = useState(false);

  // Search queries for tables
  const [searchQuery, setSearchQuery] = useState('');

  // Unit Merge Form
  const [unitForm, setUnitForm] = useState({
    sourceUnit: '',
    targetUnit: '',
    conversionFactor: 1
  });

  // Material Merge Form
  const [materialForm, setMaterialForm] = useState({
    sourceMaterial: '',
    targetMaterial: '',
    combineQuantities: true
  });

  // Labour Merge Form
  const [labourForm, setLabourForm] = useState({
    sourceLabour: '',
    targetLabour: '',
    combineQuantities: true
  });

  // Preview Modal State
  const [previewModal, setPreviewModal] = useState({
    open: false,
    loading: false,
    data: null,
    category: '',
    onConfirm: null
  });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm Merge',
    onConfirm: null
  });

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch Projects on Mount
  useEffect(() => {
    async function fetchProjects() {
      setLoadingProjects(true);
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const list = await res.json();
          const pList = Array.isArray(list) ? list : [];
          setProjects(pList);
          if (pList.length > 0) {
            setSelectedProjectId(pList[0].id);
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

  // 2. Fetch Merge Data when selectedProjectId changes
  const fetchMergeData = async (sync = false) => {
    if (!selectedProjectId) return;
    setLoadingData(true);
    try {
      const res = await fetch(`/api/engineering/tools/merge-duplicate?projectId=${selectedProjectId}${sync ? '&sync=true' : ''}`);
      if (res.ok) {
        const resData = await res.json();
        setData({
          units: resData.units || [],
          materials: resData.materials || [],
          labours: resData.labours || [],
          masterUnits: resData.masterUnits || [],
          suggestions: resData.suggestions || [],
          history: resData.history || [],
          totalTasks: resData.totalTasks || 0
        });

        // Initialize default form selections if available
        if (resData.units?.length >= 2) {
          const bagUnit = resData.units.find(u => u.name.toLowerCase() === 'bag');
          const nosUnit = resData.units.find(u => u.name.toLowerCase() === 'nos');
          if (bagUnit && nosUnit) {
            setUnitForm(prev => ({
              ...prev,
              sourceUnit: prev.sourceUnit || bagUnit.name,
              targetUnit: prev.targetUnit || nosUnit.name
            }));
          } else {
            setUnitForm(prev => ({
              ...prev,
              sourceUnit: prev.sourceUnit || resData.units[1].name,
              targetUnit: prev.targetUnit || resData.units[0].name
            }));
          }
        } else if (resData.units?.length === 1) {
          setUnitForm(prev => ({
            ...prev,
            sourceUnit: prev.sourceUnit || resData.units[0].name,
            targetUnit: prev.targetUnit || 'Nos'
          }));
        }

        if (resData.materials?.length >= 2) {
          setMaterialForm(prev => ({
            ...prev,
            sourceMaterial: prev.sourceMaterial || resData.materials[1].name,
            targetMaterial: prev.targetMaterial || resData.materials[0].name
          }));
        }

        if (resData.labours?.length >= 2) {
          setLabourForm(prev => ({
            ...prev,
            sourceLabour: prev.sourceLabour || resData.labours[1].name,
            targetLabour: prev.targetLabour || resData.labours[0].name
          }));
        }

        if (sync) {
          showToast('Project data synced successfully!');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to load project items', 'error');
      }
    } catch (err) {
      console.error('Failed to load merge data', err);
      showToast('Error loading project merge data', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchMergeData();
  }, [selectedProjectId]);

  // Current selected project object
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Filtered lists based on search
  const filteredUnits = useMemo(() => {
    if (!searchQuery) return data.units;
    const q = searchQuery.toLowerCase();
    return data.units.filter(u => u.name.toLowerCase().includes(q));
  }, [data.units, searchQuery]);

  const filteredMaterials = useMemo(() => {
    if (!searchQuery) return data.materials;
    const q = searchQuery.toLowerCase();
    return data.materials.filter(m => m.name.toLowerCase().includes(q) || (m.unit && m.unit.toLowerCase().includes(q)));
  }, [data.materials, searchQuery]);

  const filteredLabours = useMemo(() => {
    if (!searchQuery) return data.labours;
    const q = searchQuery.toLowerCase();
    return data.labours.filter(l => l.name.toLowerCase().includes(q));
  }, [data.labours, searchQuery]);

  // ========================================================
  // PREVIEW HANDLERS
  // ========================================================
  const handlePreview = async (category) => {
    let sourceItem = '';
    let targetItem = '';
    let conversionFactor = 1;

    if (category === 'UNIT') {
      sourceItem = unitForm.sourceUnit;
      targetItem = unitForm.targetUnit;
      conversionFactor = unitForm.conversionFactor;
      if (!sourceItem || !targetItem) {
        showToast('Please select both Source and Target units', 'error');
        return;
      }
    } else if (category === 'MATERIAL') {
      sourceItem = materialForm.sourceMaterial;
      targetItem = materialForm.targetMaterial;
      if (!sourceItem || !targetItem) {
        showToast('Please select both Source and Target materials', 'error');
        return;
      }
    } else if (category === 'LABOUR') {
      sourceItem = labourForm.sourceLabour;
      targetItem = labourForm.targetLabour;
      if (!sourceItem || !targetItem) {
        showToast('Please select both Source and Target labour items', 'error');
        return;
      }
    }

    if (sourceItem.trim().toLowerCase() === targetItem.trim().toLowerCase()) {
      showToast('Source and Target cannot be identical', 'error');
      return;
    }

    setPreviewModal({
      open: true,
      loading: true,
      data: null,
      category,
      onConfirm: () => {
        setPreviewModal(prev => ({ ...prev, open: false }));
        executeMerge(category);
      }
    });

    try {
      const res = await fetch('/api/engineering/tools/merge-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PREVIEW',
          projectId: selectedProjectId,
          category,
          sourceItem,
          targetItem,
          conversionFactor
        })
      });

      if (res.ok) {
        const previewResult = await res.json();
        setPreviewModal(prev => ({
          ...prev,
          loading: false,
          data: previewResult
        }));
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to generate preview', 'error');
        setPreviewModal(prev => ({ ...prev, open: false }));
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while generating preview', 'error');
      setPreviewModal(prev => ({ ...prev, open: false }));
    }
  };

  // ========================================================
  // EXECUTE MERGE HANDLER
  // ========================================================
  const executeMerge = async (category) => {
    let payload = { projectId: selectedProjectId };

    if (category === 'UNIT') {
      payload.action = 'MERGE_UNITS';
      payload.sourceUnit = unitForm.sourceUnit;
      payload.targetUnit = unitForm.targetUnit;
      payload.conversionFactor = unitForm.conversionFactor;
    } else if (category === 'MATERIAL') {
      payload.action = 'MERGE_MATERIALS';
      payload.sourceMaterial = materialForm.sourceMaterial;
      payload.targetMaterial = materialForm.targetMaterial;
      payload.combineQuantities = materialForm.combineQuantities;
    } else if (category === 'LABOUR') {
      payload.action = 'MERGE_LABOUR';
      payload.sourceLabour = labourForm.sourceLabour;
      payload.targetLabour = labourForm.targetLabour;
      payload.combineQuantities = labourForm.combineQuantities;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/engineering/tools/merge-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (res.ok) {
        showToast(result.message || 'Merge completed successfully!', 'success');
        // Refresh project data
        await fetchMergeData(false);
      } else {
        showToast(result.error || 'Merge failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error executing merge operation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Action: Apply a Smart Suggestion
  const handleApplySuggestion = (sug) => {
    if (sug.type === 'UNIT') {
      setActiveTab('units');
      setUnitForm(prev => ({
        ...prev,
        sourceUnit: sug.source,
        targetUnit: sug.target
      }));
      showToast(`Loaded suggested merge: "${sug.source}" ➔ "${sug.target}"`);
    } else if (sug.type === 'MATERIAL') {
      setActiveTab('materials');
      setMaterialForm(prev => ({
        ...prev,
        sourceMaterial: sug.source,
        targetMaterial: sug.target
      }));
      showToast(`Loaded suggested merge: "${sug.source}" ➔ "${sug.target}"`);
    } else if (sug.type === 'LABOUR') {
      setActiveTab('labour');
      setLabourForm(prev => ({
        ...prev,
        sourceLabour: sug.source,
        targetLabour: sug.target
      }));
      showToast(`Loaded suggested merge: "${sug.source}" ➔ "${sug.target}"`);
    }
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

      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <Home size={14} /> Home <ChevronRight size={14} /> Tools <ChevronRight size={14} /> <span style={{ color: '#0284c7', fontWeight: 600 }}>Merge Duplicate</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#e0f2fe', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GitMerge size={24} color="#0284c7" />
            </div>
            Merge Duplicate Tool
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Consolidate and merge duplicate Units, Materials, and Labour across project activities, tasks & BOQ.
          </p>
        </div>

        {/* Project Selector & Sync Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Layers size={18} color="#0284c7" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Project:</span>
            <select 
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={loadingProjects}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '13px', fontWeight: 600, padding: '0.4rem 0.75rem', borderRadius: '8px', outline: 'none', minWidth: '240px', cursor: 'pointer' }}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchMergeData(true)}
            disabled={loadingData}
            title="Reload and re-sync project data"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 0.9rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loadingData ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} color="#0284c7" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Smart Suggestions Banner (If Any Detected) */}
      {data.suggestions && data.suggestions.length > 0 && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#22c55e', color: 'white', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>
                Smart Duplicate Suggestion:
              </div>
              <div style={{ fontSize: '12.5px', color: '#166534' }}>
                {data.suggestions[0].reason}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleApplySuggestion(data.suggestions[0])}
            style={{
              background: '#16a34a',
              color: 'white',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
            }}
          >
            <span>Load in Merge Console</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Top Stat Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scale size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Distinct Units</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{data.units.length}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Distinct Materials</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{data.materials.length}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Labour Designations</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{data.labours.length}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <History size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Past Merges</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{data.history.length}</div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', background: '#ffffff', padding: '6px 12px 0 12px', borderRadius: '12px 12px 0 0' }}>
        <button
          onClick={() => { setActiveTab('units'); setSearchQuery(''); }}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'units' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'units' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === 'units' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Scale size={16} />
          <span>Merge Units</span>
          <span style={{ fontSize: '11px', background: activeTab === 'units' ? '#e0f2fe' : '#f1f5f9', color: activeTab === 'units' ? '#0284c7' : '#64748b', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
            {data.units.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('materials'); setSearchQuery(''); }}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'materials' ? '3px solid #7c3aed' : '3px solid transparent',
            color: activeTab === 'materials' ? '#7c3aed' : '#64748b',
            fontWeight: activeTab === 'materials' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Package size={16} />
          <span>Merge Materials</span>
          <span style={{ fontSize: '11px', background: activeTab === 'materials' ? '#ede9fe' : '#f1f5f9', color: activeTab === 'materials' ? '#7c3aed' : '#64748b', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
            {data.materials.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('labour'); setSearchQuery(''); }}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'labour' ? '3px solid #d97706' : '3px solid transparent',
            color: activeTab === 'labour' ? '#d97706' : '#64748b',
            fontWeight: activeTab === 'labour' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Users size={16} />
          <span>Merge Labour</span>
          <span style={{ fontSize: '11px', background: activeTab === 'labour' ? '#fef3c7' : '#f1f5f9', color: activeTab === 'labour' ? '#d97706' : '#64748b', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
            {data.labours.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('history'); setSearchQuery(''); }}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'history' ? '3px solid #059669' : '3px solid transparent',
            color: activeTab === 'history' ? '#059669' : '#64748b',
            fontWeight: activeTab === 'history' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: 'auto'
          }}
        >
          <History size={16} />
          <span>Merge Audit History</span>
          <span style={{ fontSize: '11px', background: activeTab === 'history' ? '#d1fae5' : '#f1f5f9', color: activeTab === 'history' ? '#059669' : '#64748b', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
            {data.history.length}
          </span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: MERGE UNITS
          ======================================================== */}
      {activeTab === 'units' && (
        <div>
          {/* Active Merge Console Card */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
              <Scale size={20} color="#0284c7" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Unit Merge Console
              </h2>
              <span style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>
                Consolidate duplicate units (e.g. merge <b>Bag</b> into <b>Nos</b>)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center', background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              
              {/* Source Unit */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: '6px' }}>
                  1. Source Unit (To be Replaced / Merged)
                </label>
                <select
                  value={unitForm.sourceUnit}
                  onChange={(e) => setUnitForm({ ...unitForm, sourceUnit: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: 600, background: 'white', color: '#1e293b' }}
                >
                  <option value="">-- Select Source Unit --</option>
                  {data.units.map(u => (
                    <option key={u.name} value={u.name}>
                      {u.name} ({u.totalUsage} occurrences in project)
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  This unit will be merged and replaced across project tasks & materials.
                </div>
              </div>

              {/* Arrow Indicator */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0284c7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)' }}>
                  <ArrowRight size={20} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', marginTop: '4px' }}>
                  Merges Into
                </span>
              </div>

              {/* Target Unit */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '6px' }}>
                  2. Target Unit (To Keep / Standardize)
                </label>
                <select
                  value={unitForm.targetUnit}
                  onChange={(e) => setUnitForm({ ...unitForm, targetUnit: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: 600, background: 'white', color: '#1e293b' }}
                >
                  <option value="">-- Select Target Unit --</option>
                  <optgroup label="Units in Current Project">
                    {data.units.map(u => (
                      <option key={`p-${u.name}`} value={u.name}>{u.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Standard Master Units">
                    {data.masterUnits.filter(mu => !data.units.some(u => u.name === mu)).map(mu => (
                      <option key={`m-${mu}`} value={mu}>{mu}</option>
                    ))}
                  </optgroup>
                </select>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  All occurrences will be standardized to this unit name.
                </div>
              </div>

              {/* Conversion Factor */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                    Conversion Factor:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>1 {unitForm.sourceUnit || 'Source'} =</span>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={unitForm.conversionFactor}
                      onChange={(e) => setUnitForm({ ...unitForm, conversionFactor: e.target.value })}
                      style={{ width: '70px', border: 'none', outline: 'none', fontWeight: 700, fontSize: '14px', color: '#0f172a' }}
                    />
                    <span style={{ fontSize: '13px', color: '#0284c7', fontWeight: 600 }}>{unitForm.targetUnit || 'Target'}</span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    (Leave 1.0 for direct 1:1 name change, or specify ratio to automatically adjust quantities)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handlePreview('UNIT')}
                    disabled={submitting || !unitForm.sourceUnit || !unitForm.targetUnit}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  >
                    <span>Preview Impact</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePreview('UNIT')}
                    disabled={submitting || !unitForm.sourceUnit || !unitForm.targetUnit}
                    style={{
                      background: '#0284c7',
                      border: 'none',
                      padding: '0.6rem 1.5rem',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'white',
                      cursor: submitting || !unitForm.sourceUnit || !unitForm.targetUnit ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(2, 132, 199, 0.3)',
                      opacity: submitting || !unitForm.sourceUnit || !unitForm.targetUnit ? 0.6 : 1
                    }}
                  >
                    <GitMerge size={16} />
                    <span>Merge Units Now</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Project Units Table Card */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Units Currently Used in Project "{currentProject?.name}"
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Click "Set as Source" or "Set as Target" to instantly load units into the merge console.
                </p>
              </div>

              <div style={{ position: 'relative', width: '260px' }}>
                <input
                  type="text"
                  placeholder="Filter units..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '6px 12px 6px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Unit Name</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Total Occurrences</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Tasks</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Materials</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Labour</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Sample Items Using Unit</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                        No matching units found in project.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((u) => {
                      const isSelectedSource = unitForm.sourceUnit === u.name;
                      const isSelectedTarget = unitForm.targetUnit === u.name;

                      return (
                        <tr 
                          key={u.name}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isSelectedSource ? '#fef2f2' : isSelectedTarget ? '#ecfdf5' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{u.name}</span>
                              {isSelectedSource && (
                                <span style={{ fontSize: '10px', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  SOURCE
                                </span>
                              )}
                              {isSelectedTarget && (
                                <span style={{ fontSize: '10px', background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  TARGET
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0284c7' }}>
                            {u.totalUsage}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#475569' }}>
                            {u.tasksCount}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#475569' }}>
                            {u.materialsCount}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#475569' }}>
                            {u.laboursCount}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12px' }}>
                            {u.sampleItems && u.sampleItems.length > 0 ? u.sampleItems.join(', ') : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setUnitForm(prev => ({ ...prev, sourceUnit: u.name }))}
                                style={{
                                  background: isSelectedSource ? '#ef4444' : '#fee2e2',
                                  color: isSelectedSource ? 'white' : '#991b1b',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                As Source
                              </button>
                              <button
                                type="button"
                                onClick={() => setUnitForm(prev => ({ ...prev, targetUnit: u.name }))}
                                style={{
                                  background: isSelectedTarget ? '#10b981' : '#d1fae5',
                                  color: isSelectedTarget ? 'white' : '#065f46',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                As Target
                              </button>
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
        </div>
      )}

      {/* ========================================================
          TAB 2: MERGE MATERIALS
          ======================================================== */}
      {activeTab === 'materials' && (
        <div>
          {/* Active Merge Console Card */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
              <Package size={20} color="#7c3aed" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Material Merge Console
              </h2>
              <span style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>
                Consolidate duplicate materials across project estimates and tasks
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center', background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              
              {/* Source Material */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: '6px' }}>
                  1. Source Material (To be Merged & Removed)
                </label>
                <select
                  value={materialForm.sourceMaterial}
                  onChange={(e) => setMaterialForm({ ...materialForm, sourceMaterial: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'white', color: '#1e293b' }}
                >
                  <option value="">-- Select Source Material --</option>
                  {data.materials.map(m => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.taskCount} tasks, {m.totalQty} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Arrow Indicator */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#7c3aed', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(124, 58, 237, 0.3)' }}>
                  <ArrowRight size={20} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', marginTop: '4px' }}>
                  Merges Into
                </span>
              </div>

              {/* Target Material */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '6px' }}>
                  2. Target Material (To Retain as Master)
                </label>
                <select
                  value={materialForm.targetMaterial}
                  onChange={(e) => setMaterialForm({ ...materialForm, targetMaterial: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'white', color: '#1e293b' }}
                >
                  <option value="">-- Select Target Material --</option>
                  {data.materials.map(m => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.taskCount} tasks, {m.totalQty} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Options & Action */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={materialForm.combineQuantities}
                    onChange={(e) => setMaterialForm({ ...materialForm, combineQuantities: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#7c3aed' }}
                  />
                  <span>Combine and sum quantities if both materials exist in the same task</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handlePreview('MATERIAL')}
                    disabled={submitting || !materialForm.sourceMaterial || !materialForm.targetMaterial}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>Preview Impact</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePreview('MATERIAL')}
                    disabled={submitting || !materialForm.sourceMaterial || !materialForm.targetMaterial}
                    style={{
                      background: '#7c3aed',
                      border: 'none',
                      padding: '0.6rem 1.5rem',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'white',
                      cursor: submitting || !materialForm.sourceMaterial || !materialForm.targetMaterial ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(124, 58, 237, 0.3)',
                      opacity: submitting || !materialForm.sourceMaterial || !materialForm.targetMaterial ? 0.6 : 1
                    }}
                  >
                    <GitMerge size={16} />
                    <span>Merge Materials Now</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Project Materials Table */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Materials in Project Tasks
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  All materials associated with the tasks in this project.
                </p>
              </div>

              <div style={{ position: 'relative', width: '260px' }}>
                <input
                  type="text"
                  placeholder="Filter materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '6px 12px 6px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Material Name</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Unit</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Total Project Qty</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Task Count</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Sample Tasks</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                        No materials found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMaterials.map((m) => {
                      const isSelectedSource = materialForm.sourceMaterial === m.name;
                      const isSelectedTarget = materialForm.targetMaterial === m.name;

                      return (
                        <tr 
                          key={m.name}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isSelectedSource ? '#fef2f2' : isSelectedTarget ? '#ede9fe' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{m.name}</span>
                              {isSelectedSource && (
                                <span style={{ fontSize: '10px', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  SOURCE
                                </span>
                              )}
                              {isSelectedTarget && (
                                <span style={{ fontSize: '10px', background: '#7c3aed', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  TARGET
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#0284c7', fontWeight: 600 }}>
                            {m.unit}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>
                            {m.totalQty}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#475569' }}>
                            {m.taskCount}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12px' }}>
                            {m.tasks && m.tasks.length > 0 ? m.tasks.slice(0, 2).join(', ') : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setMaterialForm(prev => ({ ...prev, sourceMaterial: m.name }))}
                                style={{
                                  background: isSelectedSource ? '#ef4444' : '#fee2e2',
                                  color: isSelectedSource ? 'white' : '#991b1b',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                As Source
                              </button>
                              <button
                                type="button"
                                onClick={() => setMaterialForm(prev => ({ ...prev, targetMaterial: m.name }))}
                                style={{
                                  background: isSelectedTarget ? '#7c3aed' : '#ede9fe',
                                  color: isSelectedTarget ? 'white' : '#6d28d9',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                As Target
                              </button>
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
        </div>
      )}

      {/* ========================================================
          TAB 3: MERGE LABOUR
          ======================================================== */}
      {activeTab === 'labour' && (
        <div>
          {/* Active Merge Console Card */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
              <Users size={20} color="#d97706" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Labour Merge Console
              </h2>
              <span style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>
                Consolidate duplicate labour designations across project tasks
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center', background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              
              {/* Source Labour */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: '6px' }}>
                  1. Source Labour (To be Merged & Removed)
                </label>
                <select
                  value={labourForm.sourceLabour}
                  onChange={(e) => setLabourForm({ ...labourForm, sourceLabour: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'white', color: '#1e293b' }}
                >
                  <option value="">-- Select Source Labour --</option>
                  {data.labours.map(l => (
                    <option key={l.name} value={l.name}>
                      {l.name} ({l.taskCount} tasks, {l.totalQty} {l.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Arrow Indicator */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#d97706', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)' }}>
                  <ArrowRight size={20} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', marginTop: '4px' }}>
                  Merges Into
                </span>
              </div>

              {/* Target Labour */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '6px' }}>
                  2. Target Labour (To Retain as Standard)
                </label>
                <select
                  value={labourForm.targetLabour}
                  onChange={(e) => setLabourForm({ ...labourForm, targetLabour: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'white', color: '#1e293b' }}
                >
                  <option value="">-- Select Target Labour --</option>
                  {data.labours.map(l => (
                    <option key={l.name} value={l.name}>
                      {l.name} ({l.taskCount} tasks, {l.totalQty} {l.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Options & Action */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={labourForm.combineQuantities}
                    onChange={(e) => setLabourForm({ ...labourForm, combineQuantities: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#d97706' }}
                  />
                  <span>Combine and sum quantities if both labour types exist in the same task</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handlePreview('LABOUR')}
                    disabled={submitting || !labourForm.sourceLabour || !labourForm.targetLabour}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>Preview Impact</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePreview('LABOUR')}
                    disabled={submitting || !labourForm.sourceLabour || !labourForm.targetLabour}
                    style={{
                      background: '#d97706',
                      border: 'none',
                      padding: '0.6rem 1.5rem',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'white',
                      cursor: submitting || !labourForm.sourceLabour || !labourForm.targetLabour ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(217, 119, 6, 0.3)',
                      opacity: submitting || !labourForm.sourceLabour || !labourForm.targetLabour ? 0.6 : 1
                    }}
                  >
                    <GitMerge size={16} />
                    <span>Merge Labour Now</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Project Labour Table */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Labour Types in Project Tasks
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  All labour classifications assigned to tasks in this project.
                </p>
              </div>

              <div style={{ position: 'relative', width: '260px' }}>
                <input
                  type="text"
                  placeholder="Filter labour..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '6px 12px 6px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Labour Designation</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Unit</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Total Project Qty</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Task Count</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Sample Tasks</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLabours.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                        No labour types found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLabours.map((l) => {
                      const isSelectedSource = labourForm.sourceLabour === l.name;
                      const isSelectedTarget = labourForm.targetLabour === l.name;

                      return (
                        <tr 
                          key={l.name}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isSelectedSource ? '#fef2f2' : isSelectedTarget ? '#fef3c7' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{l.name}</span>
                              {isSelectedSource && (
                                <span style={{ fontSize: '10px', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  SOURCE
                                </span>
                              )}
                              {isSelectedTarget && (
                                <span style={{ fontSize: '10px', background: '#d97706', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  TARGET
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#0284c7', fontWeight: 600 }}>
                            {l.unit}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>
                            {l.totalQty}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#475569' }}>
                            {l.taskCount}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12px' }}>
                            {l.tasks && l.tasks.length > 0 ? l.tasks.slice(0, 2).join(', ') : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setLabourForm(prev => ({ ...prev, sourceLabour: l.name }))}
                                style={{
                                  background: isSelectedSource ? '#ef4444' : '#fee2e2',
                                  color: isSelectedSource ? 'white' : '#991b1b',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                As Source
                              </button>
                              <button
                                type="button"
                                onClick={() => setLabourForm(prev => ({ ...prev, targetLabour: l.name }))}
                                style={{
                                  background: isSelectedTarget ? '#d97706' : '#fef3c7',
                                  color: isSelectedTarget ? 'white' : '#b45309',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                As Target
                              </button>
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
        </div>
      )}

      {/* ========================================================
          TAB 4: MERGE AUDIT HISTORY
          ======================================================== */}
      {activeTab === 'history' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
            <History size={20} color="#059669" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Merge Audit Log for "{currentProject?.name}"
            </h2>
            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>
              Permanent record of all merges and conversions executed for this project
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '180px' }}>Date & Time</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '110px' }}>Category</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Source ➔ Target</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '120px' }}>Items Affected</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '140px' }}>Performed By</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.history.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No merge operations recorded yet for this project.
                    </td>
                  </tr>
                ) : (
                  data.history.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12px' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: log.category === 'UNIT' ? '#e0f2fe' : log.category === 'MATERIAL' ? '#ede9fe' : '#fef3c7',
                          color: log.category === 'UNIT' ? '#0369a1' : log.category === 'MATERIAL' ? '#6d28d9' : '#b45309'
                        }}>
                          {log.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#ef4444' }}>{log.source}</span>
                          <ArrowRight size={14} color="#94a3b8" />
                          <span style={{ color: '#10b981' }}>{log.target}</span>
                          {log.conversionFactor && log.conversionFactor !== 1 && (
                            <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                              x{log.conversionFactor}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0284c7' }}>
                        {log.itemsAffected} records
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {log.performedBy || 'Project Engineer'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12px' }}>
                        {log.summary}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          PREVIEW IMPACT MODAL
          ======================================================== */}
      {previewModal.open && (
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
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GitMerge size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                    Merge Impact Preview
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Review every task and item that will be updated
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPreviewModal(prev => ({ ...prev, open: false }))}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {previewModal.loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={24} className="animate-spin" color="#0284c7" style={{ margin: '0 auto 12px auto' }} />
                  <div>Analyzing affected tasks and quantities...</div>
                </div>
              ) : previewModal.data ? (
                <div>
                  {/* Summary Banner */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>PROPOSED MERGE</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#ef4444' }}>{previewModal.data.sourceItem}</span>
                        <ArrowRight size={16} color="#94a3b8" />
                        <span style={{ color: '#10b981' }}>{previewModal.data.targetItem}</span>
                        {previewModal.data.conversionFactor !== 1 && (
                          <span style={{ fontSize: '12px', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                            Factor: x{previewModal.data.conversionFactor}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>TASKS AFFECTED</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0284c7' }}>
                        {previewModal.data.totalTasksAffected}
                      </div>
                    </div>
                  </div>

                  {/* Impacted Tasks List */}
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', margin: '0 0 10px 0' }}>
                    Affected Task Activities ({previewModal.data.affectedTasks?.length || 0})
                  </h4>

                  {(!previewModal.data.affectedTasks || previewModal.data.affectedTasks.length === 0) ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                      No tasks in this project currently use "{previewModal.data.sourceItem}".
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {previewModal.data.affectedTasks.map((t, idx) => (
                        <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px', marginBottom: '6px' }}>
                            {t.taskName}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {t.changes?.map((ch, cIdx) => (
                              <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
                                <span style={{ fontWeight: 600, color: '#475569', minWidth: '90px' }}>
                                  {ch.itemType}:
                                </span>
                                <span style={{ color: '#ef4444', textDecoration: 'line-through' }}>
                                  {ch.oldValue}
                                </span>
                                <ArrowRight size={13} color="#94a3b8" />
                                <span style={{ color: '#10b981', fontWeight: 700 }}>
                                  {ch.newValue}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setPreviewModal(prev => ({ ...prev, open: false }))}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submitting || previewModal.loading}
                onClick={previewModal.onConfirm}
                style={{
                  background: '#10b981',
                  border: 'none',
                  padding: '0.6rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'white',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                }}
              >
                {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                <span>Confirm & Execute Merge</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding Line */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', fontSize: '0.78rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
        <span>Powered by Kanix Infotech Pvt. Ltd.</span>
        <span style={{ color: '#0284c7', fontWeight: 600 }}>CeCube Engineering Suite • Merge Duplicate v1.0</span>
      </div>

    </div>
  );
}
