'use client';
import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Truck, AlertCircle, FileCheck } from 'lucide-react';

export default function SiteDashboard() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/engineering/projects'); // the actual projects api used everywhere else
        if (res.ok) setProjects(await res.json());
      } catch(e) {}
    }
    loadProjects();
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Site Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Real-time snapshot of site activity, manpower, material, and issues</p>
        </div>
      </div>

      <div style={{ maxWidth: '400px', marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Select Project/Site *</label>
        <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}>
          <option value="">-- Choose Project --</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectId || p.name} - {p.name}</option>)}
        </select>
      </div>

      {selectedProjectId && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '50%' }}><FileCheck size={24} color="#10b981" /></div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '4px' }}>DPR Status (Today)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>Submitted</div>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '50%' }}><Users size={24} color="#3b82f6" /></div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '4px' }}>Manpower Present</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>45</div>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '50%' }}><Truck size={24} color="#f59e0b" /></div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '4px' }}>Equipment in Use</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>3</div>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '50%' }}><AlertCircle size={24} color="#ef4444" /></div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '4px' }}>Open NCRs / Issues</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>2</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Recent Activity / Issues</h3>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                <li style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px' }}>
                  <ShieldAlert size={16} color="#ef4444" style={{ marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1e293b' }}>NCR-045: Concrete slump test failed</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Status: Open | Action Required: Demolish and repour</div>
                  </div>
                </li>
                <li style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px' }}>
                  <ShieldAlert size={16} color="#f59e0b" style={{ marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1e293b' }}>Safety Observation: Workers missing hard hats</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Status: Resolved | Toolbox talk conducted</div>
                  </div>
                </li>
              </ul>
            </div>

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Site Photos (Today)</h3>
              </div>
              <div style={{ padding: '20px', display: 'flex', gap: '16px', overflowX: 'auto' }}>
                <div style={{ width: '150px', height: '100px', background: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>Img1.jpg</div>
                <div style={{ width: '150px', height: '100px', background: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>Img2.jpg</div>
                <div style={{ width: '150px', height: '100px', background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer' }}>+ Upload</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
