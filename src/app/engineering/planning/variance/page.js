'use client';
import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, Filter, CheckCircle } from 'lucide-react';

export default function ProgressVariance() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => {
    async function loadProjects() {
      const res = await fetch('/api/engineering/projects');
      if (res.ok) setProjects(await res.json());
    }
    loadProjects();
  }, []);

  const activities = [
    { id: 1, name: 'Site Clearing', planned: 100, actual: 100, variance: 0, status: 'Completed' },
    { id: 2, name: 'Foundation', planned: 80, actual: 65, variance: -15, status: 'Delayed' },
    { id: 3, name: 'Control Room Slab', planned: 40, actual: 30, variance: -10, status: 'Delayed' },
    { id: 4, name: 'Transformer Erection', planned: 10, actual: 15, variance: 5, status: 'Ahead' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Progress & Variance</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Compare Planned vs Actual progress and monitor delays</p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <div style={{ maxWidth: '400px', marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Select Project *</label>
          <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <option value="">-- Choose Project --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.projectId} - {p.name}</option>)}
          </select>
        </div>

        {selectedProjectId && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.875rem' }}>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>WBS / Activity</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Planned % (Baseline)</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Actual % (Site)</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Variance %</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Alert</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {activities.map(act => (
                <tr key={act.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 20px', fontWeight: '500', color: '#0f172a' }}>{act.name}</td>
                  <td style={{ padding: '16px 20px', color: '#334155' }}>{act.planned}%</td>
                  <td style={{ padding: '16px 20px', color: '#334155' }}>{act.actual}%</td>
                  <td style={{ padding: '16px 20px', fontWeight: '600', color: act.variance < 0 ? '#ef4444' : act.variance > 0 ? '#10b981' : '#64748b' }}>
                    {act.variance > 0 ? `+${act.variance}` : act.variance}%
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {act.variance < 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '0.875rem', fontWeight: '500' }}>
                        <AlertTriangle size={14} /> Delay Alert
                      </span>
                    ) : act.status === 'Completed' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.875rem', fontWeight: '500' }}>
                        <CheckCircle size={14} /> On Track
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.875rem' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    {act.variance < 0 && (
                      <button style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500', cursor: 'pointer' }}>
                        Log Delay Root Cause
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
