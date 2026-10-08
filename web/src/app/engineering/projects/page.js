'use client';
import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Building2, Eye, Pencil, Trash2, X, ChevronRight, Home, Layers } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/context/PermissionsContext';
import { employeeToolCode } from '@/lib/employeeToolCatalog';

const STATUS_STYLES = {
  Planning:    { bg: '#f1f5f9', color: '#475569' },
  'In Progress': { bg: '#dbeafe', color: '#1d4ed8' },
  Active:      { bg: '#dcfce7', color: '#166534' },
  'On Hold':   { bg: '#fef3c7', color: '#92400e' },
  Completed:   { bg: '#e0e7ff', color: '#3730a3' },
  Cancelled:   { bg: '#fee2e2', color: '#991b1b' },
};

export default function ProjectMaster() {
  const router = useRouter();
  const { activeEmployee, activeProject, hasRight } = usePermissions();
  const can = name => !activeEmployee || (!!activeProject && hasRight(employeeToolCode('Engineering', name)));
  const canOnProject = (name, projectId) => !activeEmployee || hasRight(employeeToolCode('Engineering', name), projectId);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/projects', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = new Error(data.error || `Unable to fetch projects (${res.status}).`);
        error.status = res.status;
        throw error;
      }
      if (!Array.isArray(data)) throw new Error('The projects API returned an invalid response.');
      setProjects(data);
    } catch (err) {
      const status = err.status || 0;
      if (status !== 401) console.error(err);
      setLoadError({
        message: status === 401
          ? 'Your sign-in session has expired. Sign in again to load your assigned projects.'
          : err.message || 'Unable to fetch projects.',
        status,
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredProjects = projects.filter(p => {
    const canSeeProject = !activeEmployee || ['Project View', 'Project Edit'].some(name => canOnProject(name, p.id));
    if (!canSeeProject) return false;
    return p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.status?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
        showToast('Project deleted successfully');
      } else {
        showToast('Failed to delete project', 'error');
      }
    } catch {
      showToast('Error deleting project', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const statusStyle = (status) => STATUS_STYLES[status] || { bg: '#f1f5f9', color: '#475569' };

  return (
    <div style={{ padding: '28px', background: '#f8f7f2', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 9999,
          background: toast.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: toast.type === 'error' ? '#991b1b' : '#166534',
          border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
          padding: '12px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.8rem', color: '#8b7355' }}>
            <Home size={13} /> <span>Home</span> <ChevronRight size={13} /> <span>Engineering</span> <ChevronRight size={13} /> <span style={{ color: '#7c2d12', fontWeight: 600 }}>Project Master</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'linear-gradient(135deg, #7c2d12, #b45309)', borderRadius: '10px', padding: '10px', display: 'flex' }}>
              <Layers size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1c1917', margin: 0, letterSpacing: '-0.02em' }}>Project Master</h1>
              <p style={{ color: '#78716c', fontSize: '0.85rem', margin: '3px 0 0 0' }}>Manage all active and completed projects</p>
            </div>
          </div>
        </div>
        {can('New Project') && <Link href="/engineering/projects/add-project" style={{ textDecoration: 'none' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'linear-gradient(135deg, #7c2d12, #b45309)',
            color: '#fff', padding: '10px 20px', borderRadius: '8px',
            fontSize: '0.875rem', fontWeight: 700, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(124,45,18,0.35)', transition: 'all 0.2s',
          }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Plus size={16} /> New Project
          </button>
        </Link>}
      </div>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e7e5e4', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f5f5f4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafaf9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} color="#a8a29e" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search by name, company or status..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px 8px 34px', borderRadius: '8px',
                  border: '1px solid #e7e5e4', fontSize: '0.85rem',
                  width: '300px', background: '#fff', color: '#1c1917',
                  outline: 'none',
                }}
              />
            </div>
            <span style={{ fontSize: '0.8rem', color: '#78716c', fontWeight: 500 }}>
              {loadError ? 'Projects unavailable' : `${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''}`}
            </span>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#fff', border: '1px solid #e7e5e4',
            padding: '8px 14px', borderRadius: '8px',
            fontSize: '0.85rem', color: '#57534e', cursor: 'pointer', fontWeight: 500,
          }}>
            <Filter size={14} /> Filter
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#a8a29e' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
              Loading projects...
            </div>
          ) : loadError ? (
            <div role="alert" style={{ padding: '52px 24px', textAlign: 'center', color: '#991b1b' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 8 }}>Projects could not be fetched</div>
              <div style={{ fontSize: '0.85rem', marginBottom: 16 }}>{loadError.message}</div>
              {loadError.status === 401 && (
                <div style={{ fontSize: '0.8rem', marginBottom: 16, color: '#64748b' }}>
                  Your sign-in session may have expired. Sign in again, then return to Project Master.
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                <button onClick={loadData} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e7e5e4', background: '#fff', cursor: 'pointer' }}>Retry</button>
                {loadError.status === 401 && <button onClick={() => window.location.assign('/login')} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#7c2d12', color: '#fff', cursor: 'pointer' }}>Sign in</button>}
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#fafaf9' }}>
                  {['#', 'Project Name', 'Company', 'Library', 'Category', 'Status', 'Start Date', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '11px 16px', fontWeight: 700, fontSize: '0.72rem',
                      color: '#7c2d12', textTransform: 'uppercase', letterSpacing: '0.05em',
                      borderBottom: '2px solid #fde8d8', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((proj, idx) => {
                  const ss = statusStyle(proj.status);
                  return (
                    <tr key={proj.id}
                      style={{ borderBottom: '1px solid #f5f5f4', transition: 'background 0.15s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#fafaf9'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '13px 16px', color: '#a8a29e', fontSize: '0.8rem', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#1c1917', fontSize: '0.9rem' }}>{proj.name}</div>
                        {proj.state && <div style={{ fontSize: '0.75rem', color: '#a8a29e', marginTop: '2px' }}>{proj.state}</div>}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: '#44403c' }}>
                          <Building2 size={13} color="#b45309" /> {proj.company || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '0.85rem', color: '#57534e' }}>{proj.library || '—'}</td>
                      <td style={{ padding: '13px 16px', fontSize: '0.85rem', color: '#57534e' }}>{proj.category1 || '—'}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{
                          background: ss.bg, color: ss.color,
                          padding: '4px 10px', borderRadius: '20px',
                          fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                        }}>{proj.status || 'Planning'}</span>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '0.85rem', color: '#57534e', whiteSpace: 'nowrap' }}>
                        {proj.startDate ? proj.startDate.split(' ')[0] : '—'}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {/* View */}
                          {canOnProject('Project View', proj.id) && <button
                            onClick={() => router.push(`/engineering/projects/add-project?id=${proj.id}`)}
                            title="View"
                            style={{
                              background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb',
                              borderRadius: '6px', padding: '5px 8px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '4px',
                              fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.15s',
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#dbeafe'}
                            onMouseOut={e => e.currentTarget.style.background = '#eff6ff'}
                          >
                            <Eye size={13} /> View
                          </button>}
                          {/* Edit */}
                          {canOnProject('Project Edit', proj.id) && <button
                            onClick={() => router.push(`/engineering/projects/add-project?id=${proj.id}&edit=true`)}
                            title="Edit"
                            style={{
                              background: '#fefce8', border: '1px solid #fde68a', color: '#92400e',
                              borderRadius: '6px', padding: '5px 8px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '4px',
                              fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.15s',
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#fef9c3'}
                            onMouseOut={e => e.currentTarget.style.background = '#fefce8'}
                          >
                            <Pencil size={13} /> Edit
                          </button>}
                          {/* Delete */}
                          {canOnProject('Project Delete', proj.id) && <button
                            onClick={() => setDeleteTarget(proj)}
                            title="Delete"
                            style={{
                              background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
                              borderRadius: '6px', padding: '5px 8px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '4px',
                              fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.15s',
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                            onMouseOut={e => e.currentTarget.style.background = '#fef2f2'}
                          >
                            <Trash2 size={13} /> Delete
                          </button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '60px', textAlign: 'center', color: '#a8a29e' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📁</div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {activeEmployee && projects.length === 0 ? 'No projects assigned to this employee' : 'No projects found'}
                      </div>
                      <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                        {activeEmployee && projects.length === 0
                          ? 'Ask an administrator to grant at least one tool for the required project in Employee Access.'
                          : 'Try a different search or add a new project'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(28,25,23,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '32px',
            maxWidth: '420px', width: '90%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ background: '#fee2e2', borderRadius: '10px', padding: '10px' }}>
                <Trash2 size={22} color="#dc2626" />
              </div>
              <button onClick={() => setDeleteTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8a29e' }}>
                <X size={20} />
              </button>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#1c1917' }}>Delete Project?</h3>
            <p style={{ margin: '0 0 24px 0', color: '#78716c', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  background: '#fff', border: '1px solid #e7e5e4', color: '#57534e',
                  padding: '9px 20px', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.875rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: '#dc2626', color: '#fff', border: 'none',
                  padding: '9px 20px', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.875rem', opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
