'use client';
import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock } from 'lucide-react';

export default function ExtraItems() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => {
    async function loadProjects() {
      const res = await fetch('/api/engineering/projects');
      if (res.ok) setProjects(await res.json());
    }
    loadProjects();
  }, []);

  const dummyExtras = [
    { variationNo: 'VAR-001', desc: 'Additional Rock Excavation', qty: 150, unit: 'Cum', rate: 1200, amount: 180000, status: 'Approved' },
    { variationNo: 'VAR-002', desc: 'Premium Paint Upgrade', qty: 500, unit: 'Sqm', rate: 250, amount: 125000, status: 'Pending Approval' }
  ];

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Extra Items / Variation Orders</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Request and track approval for work outside the original BOQ</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#7c3aed', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
          <Plus size={16} /> Request Extra Item
        </button>
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
              <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.875rem' }}>
                <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Variation No</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Description</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Qty & Unit</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Amount (₹)</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {dummyExtras.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px', fontWeight: '500', color: '#0f172a' }}>{item.variationNo}</td>
                  <td style={{ padding: '16px', color: '#334155' }}>{item.desc}</td>
                  <td style={{ padding: '16px', color: '#334155' }}>{item.qty} {item.unit}</td>
                  <td style={{ padding: '16px', fontWeight: '500', color: '#0f172a' }}>{formatCurrency(item.amount)}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      background: item.status === 'Approved' ? '#dcfce7' : '#fef3c7', 
                      color: item.status === 'Approved' ? '#166534' : '#b45309', 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500',
                      display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }}>
                      {item.status === 'Approved' ? <CheckCircle size={12} /> : <Clock size={12} />} {item.status}
                    </span>
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
