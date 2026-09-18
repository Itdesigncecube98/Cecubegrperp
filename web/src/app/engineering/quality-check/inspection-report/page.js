'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileCheck, Home, ChevronRight, Layers, Building2, Search, 
  RefreshCw, Plus, CheckCircle2, AlertTriangle, FileText, 
  Download, Printer, X, ShieldCheck
} from 'lucide-react';
import '../../../../app/accounts/company/company.css';

export default function InspectionReportPage() {
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ totalChecklists: 0, passedCount: 0, pendingCount: 0, totalReports: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    inspector: '',
    result: 'Approved',
    clientRepresentative: '',
    punchPointText: ''
  });

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchReports = async (projectIdToFetch = selectedProjectId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/engineering/quality-check?projectId=${projectIdToFetch || ''}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        setProjects(data.projects || []);
        setReports(data.inspectionReports || []);
        setStats(data.stats || {});

        if (!selectedProjectId && data.selectedProjectId) {
          setSelectedProjectId(data.selectedProjectId);
        }
      } else {
        showToast('Failed to load inspection reports', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to inspection report service', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(selectedProjectId);
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

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const m1 = r.title?.toLowerCase().includes(q);
        const m2 = r.reportNumber?.toLowerCase().includes(q);
        const m3 = r.inspector?.toLowerCase().includes(q);
        const m4 = r.clientRepresentative?.toLowerCase().includes(q);
        if (!m1 && !m2 && !m3 && !m4) return false;
      }
      return true;
    });
  }, [reports, searchQuery]);

  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (!form.title) {
      showToast('Title is required', 'error');
      return;
    }

    const punchList = form.punchPointText.trim()
      ? form.punchPointText.split('\n').map(p => ({ point: p.trim(), status: 'Open' })).filter(p => p.point)
      : [];

    try {
      const res = await fetch('/api/engineering/quality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'NEW_INSPECTION_REPORT',
          projectId: selectedProjectId,
          title: form.title,
          inspector: form.inspector,
          result: form.result,
          clientRepresentative: form.clientRepresentative,
          punchPoints: punchList,
          signedOff: form.result !== 'Action Required'
        })
      });

      if (res.ok) {
        showToast('Inspection report generated successfully!');
        setShowAddModal(false);
        setForm({ title: '', inspector: '', result: 'Approved', clientRepresentative: '', punchPointText: '' });
        fetchReports(selectedProjectId);
      }
    } catch (err) {
      console.error(err);
      showToast('Error creating inspection report', 'error');
    }
  };

  return (
    <div className="custom-horizontal-scrollbar" style={{ padding: '1.5rem 2rem', background: '#f8fafc', minHeight: 'calc(100vh - 60px)', color: '#0f172a', overflowX: 'auto', minWidth: 0 }}>
      
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px',
          borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          background: toast.type === 'error' ? '#ef4444' : '#059669',
          color: 'white', fontSize: '0.9rem', fontWeight: 600
        }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <Home size={14} /> Home <ChevronRight size={14} /> Quality Check <ChevronRight size={14} /> <span style={{ color: '#059669', fontWeight: 600 }}>Inspection Report</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#d1fae5', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileCheck size={24} color="#059669" />
            </div>
            Inspection & Clearance Reports
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Official QA inspection reports, client clearance sign-offs, punch point tracking, and handover certificates.
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
            <Layers size={16} color="#059669" />
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
            onClick={() => fetchReports(selectedProjectId)}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.55rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="#059669" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Reports Card */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <input
              type="text"
              placeholder="Search reports, IR#, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
            />
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#059669', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)' }}
          >
            <Plus size={16} />
            <span>New Inspection Report</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" color="#059669" style={{ margin: '0 auto 10px auto' }} />
            <div>Loading Inspection Reports...</div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No inspection reports filed for this project yet.
          </div>
        ) : (
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredReports.map(rep => (
              <div
                key={rep.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  background: '#ffffff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: '6px' }}>
                        {rep.reportNumber}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                        {rep.title}
                      </h3>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Inspected By: <strong>{rep.inspector}</strong> • Client Rep: <strong>{rep.clientRepresentative}</strong> • Date: <strong>{new Date(rep.inspectionDate).toLocaleDateString('en-GB')}</strong>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: rep.result.includes('Approved') ? '#dcfce7' : '#fef3c7',
                    color: rep.result.includes('Approved') ? '#15803d' : '#b45309'
                  }}>
                    {rep.result}
                  </span>
                </div>

                {/* Punch Points List */}
                {rep.punchPoints && rep.punchPoints.length > 0 && (
                  <div style={{ marginTop: '10px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Inspection Punch Points ({rep.punchPoints.length}):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {rep.punchPoints.map((pp, pi) => (
                        <div key={pi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: '#334155' }}>• {pp.point}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: pp.status === 'Closed' ? '#16a34a' : '#ea580c' }}>
                            [{pp.status}]
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Modal: New Inspection Report */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1.5rem'
        }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>File Inspection Report</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateReport} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Report Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Transformer Foundation Clearance Audit"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Result / Verdict</label>
                  <select
                    value={form.result}
                    onChange={(e) => setForm({ ...form, result: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  >
                    <option value="Approved">Approved</option>
                    <option value="Conditional Clearance">Conditional Clearance</option>
                    <option value="Action Required">Action Required</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Inspector Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh QA"
                    value={form.inspector}
                    onChange={(e) => setForm({ ...form, inspector: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Client Representative</label>
                <input
                  type="text"
                  placeholder="e.g. Mr. Khurana (Client QA Head)"
                  value={form.clientRepresentative}
                  onChange={(e) => setForm({ ...form, clientRepresentative: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Punch Points (one per line)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Identification tag pending&#10;Clean debris around pit #2"
                  value={form.punchPointText}
                  onChange={(e) => setForm({ ...form, punchPointText: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', background: '#059669', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: 'white', cursor: 'pointer' }}>File Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
