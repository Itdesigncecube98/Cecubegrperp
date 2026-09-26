'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, PackageCheck, Plus, Search, RefreshCw } from 'lucide-react';

const STATUS_STYLES = {
  Draft: { background: '#f3f4f6', color: '#374151' },
  Received: { background: '#dbeafe', color: '#1e40af' },
  Accepted: { background: '#d1fae5', color: '#065f46' },
  Rejected: { background: '#fee2e2', color: '#991b1b' },
};

export default function SiteGRNListPage() {
  const router = useRouter();
  const [grns, setGrns] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ projectId: '', status: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchGRNs = async (projectId, status) => {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (status) params.set('status', status);
    const response = await fetch(`/api/engineering/site/grn?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to load GRNs');
    return Array.isArray(data) ? data : [];
  };

  const loadGRNs = async () => {
    setLoading(true);
    setError('');
    try {
      setGrns(await fetchGRNs(filters.projectId, filters.status));
    } catch (loadError) {
      console.error('Error fetching site GRNs:', loadError);
      setError(loadError.message);
      setGrns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/engineering/projects')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load projects');
        return response.json();
      })
      .then(data => {
        if (!cancelled) setProjects(Array.isArray(data) ? data : []);
      })
      .catch(loadError => {
        console.error('Error fetching engineering projects:', loadError);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchGRNs(filters.projectId, filters.status)
      .then(data => {
        if (!cancelled) {
          setError('');
          setGrns(data);
        }
      })
      .catch(loadError => {
        if (!cancelled) {
          console.error('Error fetching site GRNs:', loadError);
          setError(loadError.message);
          setGrns([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.projectId, filters.status]);

  const filteredGRNs = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    if (!search) return grns;
    return grns.filter(grn => [
      grn.grnNo,
      grn.project?.name,
      grn.supplierName,
      grn.poNo,
      grn.challanNo,
      grn.gtn?.gtnNo,
    ].some(value => value?.toLowerCase().includes(search)));
  }, [filters.search, grns]);

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.5rem', color: '#1e293b', margin: 0 }}>
            <PackageCheck size={22} color="#0284c7" /> Goods Receipt Note (GRN)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '4px 0 0' }}>
            Material receipts recorded against engineering projects
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => router.push('/site/grn/new')} title="Create GRN" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', border: 0, borderRadius: 6, background: '#0284c7', color: '#fff', cursor: 'pointer' }}>
            <Plus size={15} /> Create GRN
          </button>
          <button type="button" onClick={loadGRNs} title="Refresh GRNs" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', border: '1px solid #bae6fd', borderRadius: 6, background: '#f0f9ff', color: '#0369a1', cursor: 'pointer' }}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 2fr) repeat(2, minmax(180px, 1fr))', gap: 16, padding: 20, marginBottom: 24, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <div style={{ position: 'relative' }}>
          <label htmlFor="grn-search" style={{ display: 'block', marginBottom: 6, color: '#475569', fontSize: 12, fontWeight: 600 }}>Search</label>
          <Search size={16} style={{ position: 'absolute', left: 12, bottom: 11, color: '#94a3b8' }} />
          <input id="grn-search" value={filters.search} onChange={event => setFilters(prev => ({ ...prev, search: event.target.value }))} placeholder="GRN, project, supplier, PO..." style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 38px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }} />
        </div>
        <div>
          <label htmlFor="grn-project" style={{ display: 'block', marginBottom: 6, color: '#475569', fontSize: 12, fontWeight: 600 }}>Engineering Project</label>
          <select id="grn-project" value={filters.projectId} onChange={event => setFilters(prev => ({ ...prev, projectId: event.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }}>
            <option value="">All Projects</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="grn-status" style={{ display: 'block', marginBottom: 6, color: '#475569', fontSize: 12, fontWeight: 600 }}>Status</label>
          <select id="grn-status" value={filters.status} onChange={event => setFilters(prev => ({ ...prev, status: event.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14 }}>
            <option value="">All Statuses</option>
            {['Draft', 'Received', 'Accepted', 'Rejected'].map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
      </div>

      {error && <div style={{ padding: 14, marginBottom: 16, borderRadius: 6, background: '#fee2e2', color: '#991b1b', fontSize: 14 }}>{error}</div>}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}><div style={{ display: 'inline-block', width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /><p>Loading GRNs...</p></div>
      ) : filteredGRNs.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#64748b' }}>
          <PackageCheck size={44} color="#cbd5e1" />
          <p style={{ margin: '14px 0 0' }}>No GRNs found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredGRNs.map(grn => (
            <div key={grn.id} style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>{grn.grnNo || 'GRN'}</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 10, color: '#475569', fontSize: 13 }}>
                    <span><strong>Project:</strong> {grn.project?.name || 'N/A'}</span>
                    <span><strong>Supplier:</strong> {grn.supplierName || 'N/A'}</span>
                    <span><strong>Date:</strong> {grn.grnDate ? new Date(grn.grnDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                    {grn.gtn?.gtnNo && <span><strong>GTN:</strong> {grn.gtn.gtnNo}</span>}
                  </div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, ...(STATUS_STYLES[grn.status] || STATUS_STYLES.Draft) }}>{grn.status || 'Draft'}</span>
              </div>
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9', color: '#64748b', fontSize: 13 }}>
                {grn.items?.length || 0} material item{grn.items?.length === 1 ? '' : 's'} received
                {grn.challanNo && ` | Challan: ${grn.challanNo}`}
                {grn.poNo && ` | PO: ${grn.poNo}`}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button type="button" onClick={() => router.push(`/site/material/grn/${grn.id}`)} title="View GRN details" aria-label={`View details for ${grn.grnNo || 'GRN'}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', border: '1px solid #bae6fd', borderRadius: 6, background: '#f0f9ff', color: '#0369a1', cursor: 'pointer', fontSize: 13 }}>
                  <Eye size={15} /> View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
