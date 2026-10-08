'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Shield, CheckSquare, Square, Search, Save, ArrowLeft,
  CheckCheck, X, Users, FolderOpen, ChevronRight, Zap,
  RefreshCw, UserCheck, Layers, Database
} from 'lucide-react';
import Link from 'next/link';
import { PROJECT_TOOL_MODULES } from '@/lib/employeeToolCatalog';

const MODULE_COLORS = {
  Contracting: { color: '#0891b2', bg: '#ecfeff' },
  Engineering: { color: '#7c3aed', bg: '#f5f3ff' },
  Purchase: { color: '#f59e0b', bg: '#fffbeb' },
  Site: { color: '#ef4444', bg: '#fef2f2' },
  Marketing: { color: '#f97316', bg: '#fff7ed' },
};

const MODULES = Object.keys(PROJECT_TOOL_MODULES);
const STEP_EMPLOYEE = 0;
const STEP_PROJECT = 1;
const STEP_TOOLS = 2;

export default function EmployeeToolsPage() {
  const [step, setStep] = useState(STEP_EMPLOYEE);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dbTools, setDbTools] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [granted, setGranted] = useState(new Set());
  const [activeModule, setActiveModule] = useState(MODULES[0]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [empSearch, setEmpSearch] = useState('');
  const [projSearch, setProjSearch] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectLoadError, setProjectLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const mountedRef = useRef(false);
  const catalogSyncRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const syncCatalog = useCallback(async (force = false) => {
    if (catalogSyncRef.current && !force) return catalogSyncRef.current;
    const syncRequest = (async () => {
      const response = await fetch('/api/admin/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to sync employee tool permissions.');
      return result;
    })();
    catalogSyncRef.current = syncRequest;
    try { return await syncRequest; }
    catch (error) { catalogSyncRef.current = null; throw error; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSeeding(true);
    syncCatalog()
      .then(result => {
        if (!cancelled && result.purged) setSaveMsg(`Permissions synced; ${result.migratedEmployeeGrants || 0} previous grants kept as View.`);
      })
      .catch(error => { if (!cancelled) { console.error(error); alert(error.message); } })
      .finally(() => { if (!cancelled && mountedRef.current) setSeeding(false); });
    return () => { cancelled = true; };
  }, [syncCatalog]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/employees')
      .then(r => r.json())
      .then(d => { if (!cancelled) setEmployees(Array.isArray(d) ? d : (d.data || d.employees || [])); })
      .catch(() => { });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setProjectsLoading(true);
    setProjectLoadError('');
    fetch('/api/admin/employee-tools/projects', { cache: 'no-store' })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Unable to load projects (${response.status}).`);
        return data;
      })
      .then(data => { if (!cancelled) setProjects(Array.isArray(data) ? data : (data.projects || [])); })
      .catch(error => { if (!cancelled) { setProjects([]); setProjectLoadError(error.message || 'Unable to load projects.'); } })
      .finally(() => { if (!cancelled) setProjectsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const loadGrants = useCallback(async (empId, projId) => {
    setLoading(true);
    try {
      await syncCatalog();
      const res = await fetch(`/api/admin/employee-tools?employeeId=${empId}&projectId=${projId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load employee permissions.');
      if (mountedRef.current && Array.isArray(data)) {
        setDbTools(data);
        setGranted(new Set(data.filter(t => t.isGranted).map(t => t.id)));
      }
    } catch (e) { console.error(e); }
    if (mountedRef.current) setLoading(false);
  }, [syncCatalog]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const data = await syncCatalog(true);
      alert(`✅ Synced ${data.seeded} tools. Preserved ${data.migratedEmployeeGrants || 0} employee grants as view access; removed ${data.purged ?? 0} stale tool entries.`);
      if (selectedEmp && selectedProject) await loadGrants(selectedEmp.id, selectedProject.id);
    } catch (e) { console.error(e); }
    if (mountedRef.current) setSeeding(false);
  };

  const handleSave = async () => {
    if (!selectedEmp || !selectedProject) return;
    setSaving(true);
    try {
      await fetch('/api/admin/employee-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmp.id,
          projectId: selectedProject.id,
          toolIds: Array.from(granted),
        }),
      });
      if (mountedRef.current) {
        setSaveMsg('Saved!');
        setTimeout(() => { if (mountedRef.current) setSaveMsg(''); }, 2500);
      }
    } catch (e) { console.error(e); }
    if (mountedRef.current) setSaving(false);
  };

  const toggleTool = (toolId) => {
    setGranted(prev => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId); else next.add(toolId);
      return next;
    });
  };

  const toggleModuleAll = (module, grant) => {
    const ids = dbTools.filter(t => t.module === module).map(t => t.id);
    setGranted(prev => {
      const next = new Set(prev);
      ids.forEach(id => { if (grant) next.add(id); else next.delete(id); });
      return next;
    });
  };

  const grantAll = () => setGranted(new Set(dbTools.map(t => t.id)));
  const revokeAll = () => setGranted(new Set());

  const moduleGrantedCount = (module) =>
    dbTools.filter(t => t.module === module && granted.has(t.id)).length;

  const filteredTools = useMemo(() => {
    const sq = search.toLowerCase();
    return dbTools.filter(t => {
      if (t.module !== activeModule) return false;
      const matchSearch = !sq || t.name.toLowerCase().includes(sq);
      const isGranted = granted.has(t.id);
      const matchFilter = filterMode === 'all'
        || (filterMode === 'granted' && isGranted)
        || (filterMode === 'denied' && !isGranted);
      return matchSearch && matchFilter;
    });
  }, [dbTools, activeModule, search, filterMode, granted]);

  const filteredEmployees = employees.filter(e =>
    (e.name || '').toLowerCase().includes(empSearch.toLowerCase()) ||
    (e.empId || '').toLowerCase().includes(empSearch.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(empSearch.toLowerCase())
  );

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(projSearch.toLowerCase())
  );

  const { color: mc, bg: mb } = MODULE_COLORS[activeModule] || { color: '#6366f1', bg: '#eef2ff' };
  const notSeeded = dbTools.length === 0;

  const breadcrumbs = [
    { label: '1. Employee', active: step >= STEP_EMPLOYEE },
    { label: '2. Project', active: step >= STEP_PROJECT },
    { label: '3. Tools', active: step >= STEP_TOOLS },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 80, fontFamily: "'Inter', sans-serif" }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link href="/admin-dashboard/tools" style={iconBtnStyle}>
          <ArrowLeft size={18} />
        </Link>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #0891b2, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(8,145,178,0.35)' }}>
          <UserCheck size={24} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
            Project-wise Employee Tool Access
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            Assign page-level permissions to an employee for a specific project
          </p>
        </div>
        <button onClick={handleSeed} disabled={seeding}
          style={{ ...btnStyle, background: seeding ? '#e2e8f0' : '#f97316', color: seeding ? '#64748b' : '#fff', border: 'none' }}>
          <Database size={14} /> {seeding ? 'Syncing…' : 'Sync & Re-Seed Tools'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={b.label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step === i ? '#0891b2' : step > i ? '#10b981' : '#f1f5f9',
                color: step >= i ? '#fff' : '#94a3b8', fontSize: 13, fontWeight: 700
              }}>
                {step > i ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: step >= i ? '#0f172a' : '#94a3b8' }}>
                {b.label}
              </span>
              {selectedEmp && i === 0 && (
                <span style={{ fontSize: 12, color: '#0891b2', fontWeight: 600 }}>({selectedEmp.name})</span>
              )}
              {selectedProject && i === 1 && (
                <span style={{ fontSize: 12, color: '#0891b2', fontWeight: 600 }}>({selectedProject.name})</span>
              )}
            </div>
            {i < 2 && <ChevronRight size={16} color="#cbd5e1" style={{ margin: '0 16px' }} />}
          </React.Fragment>
        ))}
      </div>

      {step === STEP_EMPLOYEE && (
        <div style={cardStyle}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={20} color="#0891b2" />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Select Employee</span>
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>{employees.length} employees</span>
          </div>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
            <input value={empSearch} onChange={e => setEmpSearch(e.target.value)}
              placeholder="Search by name, ID or department…"
              style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
            {empSearch && <button onClick={() => setEmpSearch('')} style={clearBtnStyle}><X size={13} /></button>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
            {filteredEmployees.map(emp => (
              <div key={emp.id}
                onClick={() => { setSelectedEmp(emp); setStep(STEP_PROJECT); }}
                style={{ padding: '14px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#fafafa', transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 12 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0891b2'; e.currentTarget.style.background = '#ecfeff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fafafa'; }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #0891b2, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                  {(emp.name || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {emp.empId && <span style={{ marginRight: 6 }}>#{emp.empId}</span>}
                    {emp.department}
                  </div>
                </div>
                <ChevronRight size={14} color="#94a3b8" />
              </div>
            ))}
            {filteredEmployees.length === 0 && (
              <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: '#94a3b8' }}>No employees found.</div>
            )}
          </div>
        </div>
      )}

      {step === STEP_PROJECT && (
        <div style={cardStyle}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FolderOpen size={20} color="#0891b2" />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Select Project</span>
              <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>{projectsLoading ? 'Loading projects…' : `${projects.length} projects`}</span>
            </div>
            <button onClick={() => { setStep(STEP_EMPLOYEE); setSelectedEmp(null); }}
              style={{ ...smallBtnStyle, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
              <ArrowLeft size={12} /> Back
            </button>
          </div>
          {projectLoadError && (
            <div role="alert" style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 9, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>
              <strong>Projects could not be loaded.</strong> {projectLoadError}
              {projectLoadError.toLowerCase().includes('sign-in') || projectLoadError.includes('401') ? (
                <span> Sign in again with an administrator account, then reopen Employee Access.</span>
              ) : null}
            </div>
          )}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
            <input value={projSearch} onChange={e => setProjSearch(e.target.value)}
              placeholder="Search projects…"
              style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
            {projSearch && <button onClick={() => setProjSearch('')} style={clearBtnStyle}><X size={13} /></button>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
            {!projectLoadError && !projectsLoading && filteredProjects.map(proj => (
              <div key={proj.id}
                onClick={() => { setSelectedProject(proj); loadGrants(selectedEmp.id, proj.id); setStep(STEP_TOOLS); }}
                style={{ padding: '14px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#fafafa', transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 12 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0891b2'; e.currentTarget.style.background = '#ecfeff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fafafa'; }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                  <FolderOpen size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{proj.company || proj.status || ''}</div>
                </div>
                <ChevronRight size={14} color="#94a3b8" />
              </div>
            ))}
            {!projectLoadError && (projectsLoading || filteredProjects.length === 0) && (
              <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                {projectsLoading ? 'Loading projects…' : 'No projects found.'}
              </div>
            )}
          </div>
        </div>
      )}

      {step === STEP_TOOLS && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ ...chipStyle, background: '#ecfeff', borderColor: '#a5f3fc', color: '#0891b2' }}>
              <Users size={13} /> {selectedEmp?.name}
              <button onClick={() => { setStep(STEP_EMPLOYEE); setSelectedEmp(null); setSelectedProject(null); setGranted(new Set()); setDbTools([]); }} style={chipXStyle}><X size={11} /></button>
            </div>
            <div style={{ ...chipStyle, background: '#ecfdf5', borderColor: '#6ee7b7', color: '#059669' }}>
              <FolderOpen size={13} /> {selectedProject?.name}
              <button onClick={() => { setStep(STEP_PROJECT); setSelectedProject(null); setGranted(new Set()); setDbTools([]); }} style={chipXStyle}><X size={11} /></button>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              {saveMsg && <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>✅ {saveMsg}</span>}
              <button onClick={() => loadGrants(selectedEmp.id, selectedProject.id)}
                style={{ ...smallBtnStyle, background: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>

          {notSeeded && (
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#92400e', fontWeight: 600 }}>
              <Zap size={16} color="#f59e0b" />
              Tools are not seeded yet. Click &ldquo;Sync &amp; Re-Seed Tools&rdquo; at the top to load the latest page-wise permissions.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Total Pages', value: dbTools.length, color: '#6366f1', bg: '#eef2ff', icon: Shield },
              { label: 'Granted', value: granted.size, color: '#10b981', bg: '#ecfdf5', icon: CheckCheck },
              { label: 'Not Granted', value: dbTools.length - granted.size, color: '#ef4444', bg: '#fef2f2', icon: X },
            ].map(s => (
              <div key={s.label} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={20} color={s.color} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14 }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 4px', marginBottom: 4 }}>Modules</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <button onClick={grantAll} style={{ flex: 1, padding: '6px 0', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 7, fontSize: 11, fontWeight: 700, color: '#065f46', cursor: 'pointer' }}>✅ All</button>
                <button onClick={revokeAll} style={{ flex: 1, padding: '6px 0', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, fontSize: 11, fontWeight: 700, color: '#991b1b', cursor: 'pointer' }}>❌ None</button>
              </div>
              {MODULES.map(module => {
                const { color, bg } = MODULE_COLORS[module];
                const cnt = moduleGrantedCount(module);
                const total = dbTools.filter(t => t.module === module).length;
                const isActive = activeModule === module;
                const full = cnt === total && total > 0;
                const partial = cnt > 0 && cnt < total;
                return (
                  <button key={module} onClick={() => setActiveModule(module)}
                    style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${isActive ? color : '#e2e8f0'}`, background: isActive ? bg : '#fff', cursor: 'pointer', transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: full ? '#10b981' : partial ? '#f59e0b' : '#e2e8f0', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? color : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{module}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{cnt}/{total} granted</div>
                    </div>
                    <div style={{ background: isActive ? color : '#f1f5f9', color: isActive ? '#fff' : '#64748b', borderRadius: 12, padding: '1px 7px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{cnt}</div>
                  </button>
                );
              })}
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: mb, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={15} color={mc} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{activeModule}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {moduleGrantedCount(activeModule)} of {dbTools.filter(t => t.module === activeModule).length} pages granted
                  </div>
                </div>
                <button onClick={() => toggleModuleAll(activeModule, true)} style={{ ...smallBtnStyle, background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7' }}><CheckCheck size={12} /> Grant All</button>
                <button onClick={() => toggleModuleAll(activeModule, false)} style={{ ...smallBtnStyle, background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}><X size={12} /> Revoke</button>
                <div style={{ position: 'relative' }}>
                  <Search size={12} style={{ position: 'absolute', left: 9, top: 9, color: '#94a3b8' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                    style={{ padding: '7px 10px 7px 28px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', width: 160 }} />
                  {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={11} /></button>}
                </div>
                <select value={filterMode} onChange={e => setFilterMode(e.target.value)}
                  style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, background: '#f8fafc', cursor: 'pointer', outline: 'none' }}>
                  <option value="all">All</option>
                  <option value="granted">Granted</option>
                  <option value="denied">Denied</option>
                </select>
              </div>

              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading permissions…</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 'calc(100vh - 430px)', overflowY: 'auto', paddingRight: 2 }}>
                  {filteredTools.length === 0 && (
                    <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      {notSeeded
                        ? '⚠️ Click "Sync & Re-Seed Tools" at the top to load permissions.'
                        : search ? `No pages matching "${search}"` : 'No pages for this module.'}
                    </div>
                  )}
                  {filteredTools.map(tool => {
                    const isGranted = granted.has(tool.id);
                    return (
                      <div key={tool.id} onClick={() => toggleTool(tool.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                          borderRadius: 9, cursor: 'pointer', transition: 'all 0.1s',
                          background: isGranted ? `${mc}08` : 'transparent',
                          border: `1px solid ${isGranted ? mc + '30' : '#f1f5f9'}`,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = isGranted ? `${mc}15` : '#f8fafc'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isGranted ? `${mc}08` : 'transparent'; }}
                      >
                        {isGranted
                          ? <CheckSquare size={16} color={mc} style={{ flexShrink: 0 }} />
                          : <Square size={16} color="#cbd5e1" style={{ flexShrink: 0 }} />
                        }
                        <span style={{ fontSize: 13, fontWeight: isGranted ? 600 : 400, color: isGranted ? '#0f172a' : '#64748b', flex: 1 }}>
                          {tool.name}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: isGranted ? `${mc}20` : '#f1f5f9', color: isGranted ? mc : '#94a3b8' }}>
                          {isGranted ? 'GRANTED' : 'DENIED'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {step === STEP_TOOLS && selectedEmp && selectedProject && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid #e2e8f0', padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50 }}>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{granted.size}</span> of {dbTools.length} pages granted to{' '}
            <span style={{ fontWeight: 700, color: '#0891b2' }}>{selectedEmp.name}</span> on{' '}
            <span style={{ fontWeight: 700, color: '#059669' }}>{selectedProject.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {saveMsg && <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>✅ {saveMsg}</span>}
            <button onClick={revokeAll} style={{ ...btnStyle, background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' }}>Revoke All</button>
            <button onClick={grantAll} style={{ ...btnStyle, background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7' }}>Grant All</button>
            <button onClick={handleSave} disabled={saving}
              style={{ ...btnStyle, background: saving ? '#e2e8f0' : 'linear-gradient(135deg, #0891b2, #0ea5e9)', color: saving ? '#64748b' : '#fff', border: 'none' }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Access Config'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle = { background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' };
const btnStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' };
const smallBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: 'pointer', border: 'none' };
const iconBtnStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', textDecoration: 'none' };
const chipStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: '1px solid', fontSize: 12, fontWeight: 600 };
const chipXStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', opacity: 0.7 };
const clearBtnStyle = { position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' };
