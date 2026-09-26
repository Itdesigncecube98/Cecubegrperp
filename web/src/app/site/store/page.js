'use client';

import { useEffect, useState } from 'react';
import { Package, RefreshCw, Search } from 'lucide-react';

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', fontSize: 14 };

export default function SiteStorePage() {
  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({ lines: 0, quantity: 0 });
  const [filters, setFilters] = useState({ projectId: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStore = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.search) params.set('search', filters.search);
      const response = await fetch(`/api/site/store?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load site store');
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotals(data.totals || { lines: 0, quantity: 0 });
    } catch (loadError) {
      setError(loadError.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/engineering/projects').then(response => response.json()).then(data => setProjects(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (filters.projectId) params.set('projectId', filters.projectId);
    if (filters.search) params.set('search', filters.search);
    fetch(`/api/site/store?${params}`)
      .then(response => response.json().then(data => ({ response, data })))
      .then(({ response, data }) => {
        if (cancelled) return;
        if (!response.ok) throw new Error(data.error || 'Failed to load site store');
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotals(data.totals || { lines: 0, quantity: 0 });
        setError('');
      })
      .catch(loadError => {
        if (!cancelled) {
          setError(loadError.message);
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filters.projectId, filters.search]);

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div><h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: '#1e293b', fontSize: '1.5rem' }}><Package size={22} color="#0284c7" /> Site Store</h1><p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Material available after GRN and successful GTN testing</p></div>
        <button type="button" onClick={loadStore} title="Refresh store" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', border: '1px solid #bae6fd', borderRadius: 6, background: '#f0f9ff', color: '#0369a1', cursor: 'pointer' }}><RefreshCw size={15} /> Refresh</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, 240px))', gap: 12, marginBottom: 20 }}><div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}><div style={{ color: '#64748b', fontSize: 12 }}>Stock Lines</div><strong style={{ display: 'block', marginTop: 5, color: '#0f172a', fontSize: 22 }}>{totals.lines}</strong></div><div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}><div style={{ color: '#64748b', fontSize: 12 }}>Available Quantity</div><strong style={{ display: 'block', marginTop: 5, color: '#0f172a', fontSize: 22 }}>{totals.quantity.toLocaleString('en-IN')}</strong></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(240px, 2fr)', gap: 12, padding: 18, marginBottom: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}><select aria-label="Filter by engineering project" value={filters.projectId} onChange={event => setFilters(previous => ({ ...previous, projectId: event.target.value }))} style={inputStyle}><option value="">All Engineering Projects</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select><div style={{ position: 'relative' }}><Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} /><input aria-label="Search site store" value={filters.search} onChange={event => setFilters(previous => ({ ...previous, search: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') loadStore(); }} placeholder="Search material..." style={{ ...inputStyle, paddingLeft: 38 }} /></div></div>
      {error && <div style={{ padding: 14, marginBottom: 16, background: '#fee2e2', color: '#991b1b', borderRadius: 6 }}>{error}</div>}
      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>{loading ? <div style={{ padding: 50, textAlign: 'center', color: '#64748b' }}>Loading site store...</div> : <table style={{ width: '100%', minWidth: 1150, borderCollapse: 'collapse' }}><thead><tr style={{ background: '#f1f5f9' }}>{['Project', 'Material', 'Quantity', 'Unit', 'Store', 'Brand', 'GRN / GTN', 'PO', 'Purchase Bill', 'Received'].map(header => <th key={header} style={{ padding: '11px 12px', textAlign: 'left', fontSize: 12, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{header}</th>)}</tr></thead><tbody>{items.map(item => <tr key={item.id}><td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{item.project?.name || '-'}</td><td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>{item.materialName}</td><td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{item.quantity}</td><td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{item.unit || '-'}</td><td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{item.storeName || '-'}</td><td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{item.brand || '-'}</td><td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{item.sourceType} {item.gtnId ? '(GTN)' : '(GRN)'}</td><td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{item.poNo || '-'}</td><td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{item.purchaseBillNo || 'Pending'}</td><td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{new Date(item.receivedAt).toLocaleDateString('en-IN')}</td></tr>)}{!items.length && !loading && <tr><td colSpan="10" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No material is available in the site store yet.</td></tr>}</tbody></table>}</div>
    </div>
  );
}
