'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Edit2, PackageSearch, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function MaterialRequisition() {
  const [projects, setProjects] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projectResponse, requisitionResponse] = await Promise.all([
        fetch('/api/engineering/projects'),
        fetch(selectedProjectId ? `/api/engineering/requisitions?projectId=${selectedProjectId}` : '/api/engineering/requisitions')
      ]);
      if (projectResponse.ok) setProjects(await projectResponse.json());
      if (requisitionResponse.ok) setRequisitions(await requisitionResponse.json());
    } catch (error) {
      console.error('Failed to load material requisitions', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    void (async () => {
      await loadData();
    })();
  }, [loadData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this requisition?')) return;
    const response = await fetch('/api/engineering/requisitions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (response.ok) loadData();
    else alert('Failed to delete requisition');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}><PackageSearch size={22} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Material Requisition</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Request materials needed at site against engineering projects.</p>
        </div>
        <Link href="/engineering/site/material/new-requisition" style={{ textDecoration: 'none' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#7c3aed', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}><Plus size={16} /> Raise Requisition</button>
        </Link>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', maxWidth: '520px' }}>
          <Search size={16} color="#64748b" />
          <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <option value="">All Engineering Projects</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.projectId} - {project.name}</option>)}
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead><tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.8rem' }}>
              {['S.No.', 'Req ID', 'Req Date', 'Project', 'Task Name', 'Material Name', 'Unit', 'Quantity', 'PO Rate', 'Status', 'Actions'].map(header => <th key={header} style={{ padding: '12px 10px', borderBottom: '1px solid #e2e8f0' }}>{header}</th>)}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="11" style={{ padding: '30px', textAlign: 'center' }}>Loading requisitions...</td></tr> : requisitions.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 10px' }}>{req.serialNo}</td>
                  <td style={{ padding: '12px 10px', fontWeight: 600 }}>{req.reqNo}</td>
                  <td style={{ padding: '12px 10px' }}>{req.reqDate ? new Date(req.reqDate).toLocaleDateString() : '-'}</td>
                  <td style={{ padding: '12px 10px' }}>{req.project?.name || '-'}</td>
                  <td style={{ padding: '12px 10px' }}>{req.taskName || req.activity?.name || '-'}</td>
                  <td style={{ padding: '12px 10px' }}>{req.materialName || req.itemDescription}</td>
                  <td style={{ padding: '12px 10px' }}>{req.unit || '-'}</td>
                  <td style={{ padding: '12px 10px' }}>{req.quantityReq}</td>
                  <td style={{ padding: '12px 10px' }}>{Number(req.poRate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '12px 10px' }}>{req.status}</td>
                  <td style={{ padding: '12px 10px' }}><div style={{ display: 'flex', gap: '8px' }}>
                    <Link href={`/engineering/site/material/new-requisition?id=${req.id}`} title="Edit"><Edit2 size={16} color="#2563eb" /></Link>
                    <button type="button" onClick={() => handleDelete(req.id)} title="Delete" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><Trash2 size={16} color="#dc2626" /></button>
                  </div></td>
                </tr>
              ))}
              {!loading && requisitions.length === 0 && <tr><td colSpan="11" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No material requisitions found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
