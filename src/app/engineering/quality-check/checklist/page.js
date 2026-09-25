'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ThumbsUp, Home, ChevronRight, Layers, Building2, Search, 
  RefreshCw, Plus, CheckCircle2, AlertCircle, Clock, Check, 
  X, ShieldCheck, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function QualityChecklistPage() {
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [checklists, setChecklists] = useState([]);
  const [stats, setStats] = useState({ totalChecklists: 0, passedCount: 0, pendingCount: 0, totalReports: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'Civil & Foundation',
    taskName: '',
    inspector: ''
  });

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchQuality = async (projectIdToFetch = selectedProjectId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/engineering/quality-check?projectId=${projectIdToFetch || ''}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        setProjects(data.projects || []);
        setChecklists(data.checklists || []);
        setStats(data.stats || { totalChecklists: 0, passedCount: 0, pendingCount: 0, totalReports: 0 });

        if (!selectedProjectId && data.selectedProjectId) {
          setSelectedProjectId(data.selectedProjectId);
        }

        if (data.checklists?.length > 0 && !expandedId) {
          setExpandedId(data.checklists[0].id);
        }
      } else {
        showToast('Failed to load quality checklists', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to quality service', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuality(selectedProjectId);
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

  const filteredChecklists = useMemo(() => {
    return checklists.filter(c => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const m1 = c.title?.toLowerCase().includes(q);
        const m2 = c.category?.toLowerCase().includes(q);
        const m3 = c.inspector?.toLowerCase().includes(q);
        if (!m1 && !m2 && !m3) return false;
      }
      return true;
    });
  }, [checklists, searchQuery]);

  const handleToggleCheckItem = async (checklistId, itemId, currentVal) => {
    try {
      const res = await fetch('/api/engineering/quality-check', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          checklistId,
          itemId,
          passed: !currentVal
        })
      });

      if (res.ok) {
        showToast('Checklist item updated!');
        fetchQuality(selectedProjectId);
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating item', 'error');
    }
  };

  const handleCreateChecklist = async (e) => {
    e.preventDefault();
    if (!form.title) {
      showToast('Title is required', 'error');
      return;
    }

    try {
      const res = await fetch('/api/engineering/quality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'NEW_CHECKLIST',
          projectId: selectedProjectId,
          ...form
        })
      });

      if (res.ok) {
        showToast('Checklist created successfully!');
        setShowAddModal(false);
        setForm({ title: '', category: 'Civil & Foundation', taskName: '', inspector: '' });
        fetchQuality(selectedProjectId);
      }
    } catch (err) {
      console.error(err);
      showToast('Error creating checklist', 'error');
    }
  };

  return (
    <div className="custom-horizontal-scrollbar" style={{ padding: '1.5rem 2rem', background: '#f8fafc', minHeight: 'calc(100vh - 60px)', color: '#0f172a', overflowX: 'auto', minWidth: 0 }}>
      
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px',
          borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          background: toast.type === 'error' ? '#ef4444' : '#16a34a',
          color: 'white', fontSize: '0.9rem', fontWeight: 600
        }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <Home size={14} /> Home <ChevronRight size={14} /> Quality Check <ChevronRight size={14} /> <span style={{ color: '#16a34a', fontWeight: 600 }}>Quality Checklist</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#dcfce7', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} color="#16a34a" />
            </div>
            Quality Inspection Checklists
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Audit and verify engineering standards, pre-pour concrete approvals, conduit testing, and site execution parameters.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Building2 size={16} color="#059669" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Company:</span>
            <select
              value={selectedCompany}
              onChange={(e) => handleCompanyChange(e.target.value)}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '13px', fontWeight: 600, padding: '0.35rem 0.65rem', borderRadius: '8px', outline: 'none' }}
            >
              <option value="ALL">All Companies</option>
              {companies.map(c => (
                <option key={c.id || c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={16} color="#16a34a" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '13px', fontWeight: 600, padding: '0.35rem 0.65rem', borderRadius: '8px', outline: 'none', minWidth: '220px' }}
            >
              {filteredProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchQuality(selectedProjectId)}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.55rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="#16a34a" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ThumbsUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Checklists Configured</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{stats.totalChecklists}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Checklists Passed</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>{stats.passedCount}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Action Required / Open</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706' }}>{stats.pendingCount}</div>
          </div>
        </div>
      </div>

      {/* Main Checklist Container */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <input
              type="text"
              placeholder="Search checklist title, inspector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
            />
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#16a34a', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)' }}
          >
            <Plus size={16} />
            <span>New Quality Checklist</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" color="#16a34a" style={{ margin: '0 auto 10px auto' }} />
            <div>Loading Checklists...</div>
          </div>
        ) : filteredChecklists.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No checklists recorded for this project.
          </div>
        ) : (
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredChecklists.map(chk => {
              const isExpanded = expandedId === chk.id;
              const passedTotal = (chk.items || []).filter(i => i.passed).length;
              const totalItems = (chk.items || []).length;
              const isAllPassed = chk.status === 'Passed';

              return (
                <div key={chk.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : chk.id)}
                    style={{
                      padding: '1rem 1.25rem',
                      background: isExpanded ? '#f8fafc' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px' }}>
                          {chk.id}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                          {chk.title}
                        </h3>
                        <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                          {chk.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        Inspector: <strong>{chk.inspector}</strong> • Items Verified: <strong>{passedTotal} of {totalItems}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: isAllPassed ? '#dcfce7' : '#fef3c7',
                        color: isAllPassed ? '#15803d' : '#b45309'
                      }}>
                        {chk.status}
                      </span>
                      {isExpanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '1rem 1.5rem', background: '#fafafa' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(chk.items || []).map(item => (
                          <div
                            key={item.id}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '10px 14px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input
                                type="checkbox"
                                checked={item.passed}
                                onChange={() => handleToggleCheckItem(chk.id, item.id, item.passed)}
                                style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }}
                              />
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: item.passed ? '#0f172a' : '#b45309' }}>
                                  {item.check}
                                </div>
                                {item.remarks && (
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    Note: {item.remarks}
                                  </div>
                                )}
                              </div>
                            </div>

                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: item.passed ? '#dcfce7' : '#fee2e2',
                              color: item.passed ? '#15803d' : '#dc2626'
                            }}>
                              {item.passed ? 'VERIFIED / PASS' : 'OPEN / PENDING'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Modal: New Checklist */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1.5rem'
        }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>New Quality Checklist</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateChecklist} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Checklist Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Earthing Grid Inspection, Column Reinforcement"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  >
                    <option value="Civil & Foundation">Civil & Foundation</option>
                    <option value="Electrical Works">Electrical Works</option>
                    <option value="Mechanical & HVAC">Mechanical & HVAC</option>
                    <option value="Safety & Earthing">Safety & Earthing</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Inspector Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh QA"
                    value={form.inspector}
                    onChange={(e) => setForm({ ...form, inspector: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', background: '#16a34a', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: 'white', cursor: 'pointer' }}>Save Checklist</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
