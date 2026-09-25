'use client';
import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Plus, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function QualitySafety() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [activeTab, setActiveTab] = useState('Quality');

  useEffect(() => {
    async function loadProjects() {
      const res = await fetch('/api/engineering/projects');
      if (res.ok) setProjects(await res.json());
    }
    loadProjects();
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Quality & Safety</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Log inspections, NCRs, safety incidents, and toolbox talks</p>
        </div>
        <Link href={activeTab === 'Quality' ? '/engineering/quality-check/ncr' : '/engineering/site/quality/incident'} style={{ textDecoration: 'none' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#7c3aed', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
            <Plus size={16} /> Raise {activeTab === 'Quality' ? 'NCR' : 'Incident'}
          </button>
        </Link>
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
          <>
            <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <button 
                onClick={() => setActiveTab('Quality')}
                style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'Quality' ? '2px solid #7c3aed' : '2px solid transparent', color: activeTab === 'Quality' ? '#7c3aed' : '#64748b', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} /> Quality Control (NCRs)
              </button>
              <button 
                onClick={() => setActiveTab('Safety')}
                style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'Safety' ? '2px solid #7c3aed' : '2px solid transparent', color: activeTab === 'Safety' ? '#7c3aed' : '#64748b', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={16} /> Health & Safety (HSE)
              </button>
            </div>

            {activeTab === 'Quality' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.875rem' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>NCR No</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Description</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Target Closure</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '16px', fontWeight: '500', color: '#0f172a' }}>NCR-2023-001</td>
                    <td style={{ padding: '16px', color: '#334155' }}>Concrete slump test failed</td>
                    <td style={{ padding: '16px', color: '#475569' }}>2023-11-25</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ background: '#fef2f2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' }}>Open</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {activeTab === 'Safety' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.875rem' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Description</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '16px', color: '#475569' }}>2023-11-20</td>
                    <td style={{ padding: '16px', fontWeight: '500', color: '#0f172a' }}>Observation</td>
                    <td style={{ padding: '16px', color: '#334155' }}>Workers missing hard hats in Sector B</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' }}>Medium</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
