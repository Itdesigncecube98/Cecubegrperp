'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Shield, ChevronDown, Check, X, User } from 'lucide-react';
import { LEGACY_PERMISSION_ALIASES } from '@/lib/employeeToolCatalog';

const PermissionsContext = createContext({
  activeEmployee: null,
  activeProject: null,
  grantedTools: [],
  hasRight: () => false,
  setActiveEmployee: () => {},
  setActiveProject: () => {}
});

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function PermissionsProvider({ children }) {
  const [activeEmployee, setActiveEmployee] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [grantedTools, setGrantedTools] = useState([]);
  const [projectGrantedTools, setProjectGrantedTools] = useState({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [isAdminSession, setIsAdminSession] = useState(false);
  
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [isOpen, setIsOpen] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    let cancelled = false;
    const adminSession = sessionStorage.getItem('isAdmin') === 'true';
    setIsAdminSession(adminSession);
    const savedEmp = localStorage.getItem('activeEmp');
    const savedProj = localStorage.getItem('activeProj');
    const employeeData = localStorage.getItem('employeeData');
    if (employeeData && sessionStorage.getItem('isAdmin') !== 'true') {
      try {
        const employee = JSON.parse(employeeData);
        if (employee?.id) {
          setActiveEmployee(employee);
          localStorage.setItem('activeEmp', JSON.stringify(employee));
        }
      } catch { /* Ignore invalid cached employee data. */ }
    } else if (sessionStorage.getItem('isAdmin') !== 'true' && savedEmp) setActiveEmployee(JSON.parse(savedEmp));
    if (savedProj) setActiveProject(JSON.parse(savedProj));

    // Fetch lists
    if (adminSession) {
      fetch('/api/employees').then(res => res.json()).then(data => {
        if (!cancelled) setEmployees(Array.isArray(data) ? data : []);
      }).catch(() => {});
    }
    fetch('/api/projects').then(res => res.json()).then(data => {
      if (cancelled || !Array.isArray(data)) return;
      setProjects(data);
      const cachedProject = savedProj ? JSON.parse(savedProj) : null;
      if (cachedProject?.id && !data.some(project => project.id === cachedProject.id)) {
        if (employeeData && !adminSession && data.length > 0) {
          setActiveProject(data[0]);
          localStorage.setItem('activeProj', JSON.stringify(data[0]));
        } else {
          localStorage.removeItem('activeProj');
          setActiveProject(null);
        }
      } else if (!cachedProject && employeeData && !adminSession && data.length > 0) {
        setActiveProject(data[0]);
        localStorage.setItem('activeProj', JSON.stringify(data[0]));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load permissions across every project assigned to the active employee.
  useEffect(() => {
    let cancelled = false;
    if (activeEmployee?.id) {
      setPermissionsLoaded(false);
      fetch(`/api/admin/employee-tools?employeeId=${encodeURIComponent(activeEmployee.id)}&allProjects=true`)
        .then(res => res.json())
        .then(data => {
          if (cancelled || !Array.isArray(data)) return;
          const byProject = {};
          for (const grant of data) {
            if (!grant.projectId || !grant.code) continue;
            (byProject[grant.projectId] ||= []).push(grant.code);
          }
          setProjectGrantedTools(byProject);
          setGrantedTools([...new Set(Object.values(byProject).flat())]);
        })
        .catch(error => { if (!cancelled) console.error(error); })
        .finally(() => { if (!cancelled) setPermissionsLoaded(true); });
    } else {
      setGrantedTools([]);
      setProjectGrantedTools({});
      setPermissionsLoaded(false);
    }
    return () => { cancelled = true; };
  }, [activeEmployee]);

  const handleSetEmp = (emp) => {
    setActiveEmployee(emp);
    localStorage.setItem('activeEmp', JSON.stringify(emp));
  };

  const handleSetProj = (proj) => {
    setActiveProject(proj);
    localStorage.setItem('activeProj', JSON.stringify(proj));
  };

  const openProjectSelector = useCallback(() => setIsOpen(true), []);

  const hasRight = (toolCode, projectId = null) => {
    if (!activeEmployee) return false;
    const codes = projectId
      ? (projectGrantedTools[projectId] || [])
      : (isAdminSession && activeProject?.id ? projectGrantedTools[activeProject.id] || [] : grantedTools);
    if (Array.isArray(toolCode)) return toolCode.some(code => hasRight(code, projectId));
    const aliases = LEGACY_PERMISSION_ALIASES[toolCode];
    return aliases ? aliases.some(code => codes.includes(code)) : codes.includes(toolCode);
  };

  return (
    <PermissionsContext.Provider value={{ activeEmployee, activeProject, grantedTools, projectGrantedTools, permissionsLoaded, hasRight, openProjectSelector, setActiveEmployee: handleSetEmp, setActiveProject: handleSetProj }}>
      {children}

      {/* Floating Active Context Widget */}
      <div style={{ display: 'none', position: 'fixed', bottom: 20, right: 20, zIndex: 9999, fontFamily: 'var(--font-inter)' }}>
        {!isOpen && (
          <button 
            onClick={() => setIsOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            <Shield size={16} color="#6366f1" />
            Active Session
            {activeEmployee && activeProject && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />}
          </button>
        )}

        {isOpen && (
          <div style={{ width: 320, background: '#fff', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13 }}>
                <Shield size={14} color="#6366f1" /> {isAdminSession ? 'Session Simulator' : 'Employee Workspace'}
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16, lineHeight: 1.4 }}>
                {isAdminSession ? 'Select an employee and project to simulate project-wise permissions.' : 'Your assigned projects and permissions load automatically.'}
              </p>

              {isAdminSession && <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>ACT AS EMPLOYEE</label>
                <select 
                  value={activeEmployee?.id || ''} 
                  onChange={e => handleSetEmp(employees.find(x => x.id === e.target.value) || null)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#f8fafc' }}
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name || e.firstName}</option>)}
                </select>
              </div>}

              {isAdminSession ? <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>ACTIVE PROJECT</label>
                <select 
                  value={activeProject?.id || ''} 
                  onChange={e => handleSetProj(projects.find(x => x.id === e.target.value) || null)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#f8fafc' }}
                >
                  <option value="">-- Select Project --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div> : <div style={{ marginBottom: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#475569' }}>
                {projects.length} assigned project{projects.length === 1 ? '' : 's'} · access is checked separately for each project
              </div>}
              
              <div style={{ marginTop: 16, padding: '10px 12px', background: (activeEmployee && activeProject) ? '#ecfdf5' : '#f1f5f9', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                {(activeEmployee && activeProject) ? (
                  <><Check size={14} color="#10b981" /> <strong>{grantedTools.length}</strong> permissions loaded.</>
                ) : (
                  <><User size={14} color="#64748b" /> No session active.</>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </PermissionsContext.Provider>
  );
}
