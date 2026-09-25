'use client';
import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, CheckCircle, Clock } from 'lucide-react';

export default function BillingDashboard() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => {
    async function loadProjects() {
      const res = await fetch('/api/engineering/projects');
      if (res.ok) setProjects(await res.json());
    }
    loadProjects();
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Billing Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Track project financial health, executed vs billed value, and cash flow</p>
        </div>
      </div>

      <div style={{ maxWidth: '400px', marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>Select Project *</label>
        <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <option value="">-- Choose Project --</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.projectId} - {p.name}</option>)}
        </select>
      </div>

      {selectedProjectId && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '8px' }}>Total Contract Value</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b' }}>{formatCurrency(50000000)}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '8px' }}>Executed Value (MBs)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#3b82f6' }}>{formatCurrency(32000000)}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '8px' }}>Billed Value (RA Bills)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#8b5cf6' }}>{formatCurrency(28000000)}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: '#ecfdf5', borderRadius: '8px', padding: '20px', border: '1px solid #10b981' }}>
              <div style={{ fontSize: '0.875rem', color: '#047857', marginBottom: '8px' }}>Certified Value</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#065f46' }}>{formatCurrency(25000000)}</div>
            </div>
            <div style={{ background: '#fefce8', borderRadius: '8px', padding: '20px', border: '1px solid #eab308' }}>
              <div style={{ fontSize: '0.875rem', color: '#a16207', marginBottom: '8px' }}>Received Value</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#854d0e' }}>{formatCurrency(20000000)}</div>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: '8px', padding: '20px', border: '1px solid #ef4444' }}>
              <div style={{ fontSize: '0.875rem', color: '#b91c1c', marginBottom: '8px' }}>Outstanding / Unpaid</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#991b1b' }}>{formatCurrency(5000000)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
