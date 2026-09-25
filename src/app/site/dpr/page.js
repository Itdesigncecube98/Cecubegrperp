'use client';
import React, { useEffect, useState } from 'react';
import { FileText, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function DPRRegister() {
  const [dprs, setDprs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/engineering/dpr', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Failed to load DPRs');
        return response.json();
      })
      .then(data => setDprs(Array.isArray(data) ? data : []))
      .catch(fetchError => setError(fetchError.message || 'Failed to load DPRs'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Daily Progress Reports (DPR)</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Track daily site execution and manpower</p>
        </div>
        <Link href="/site/dpr/new-dpr" style={{ textDecoration: 'none' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#7c3aed', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
            <Plus size={16} /> New DPR
          </button>
        </Link>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by Project or Date..." 
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
            <Filter size={16} /> Filter
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.875rem' }}>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Project</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Activities Executed</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Total Manpower</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Prepared By</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading DPRs...</td></tr> : error ? <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#b91c1c' }}>{error}</td></tr> : dprs.length === 0 ? <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No DPRs found.</td></tr> : dprs.map(dpr => (
                <tr key={dpr.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 20px', fontWeight: '600', color: '#1e293b' }}>{dpr.date ? new Date(dpr.date).toLocaleDateString('en-GB') : '-'}</td>
                  <td style={{ padding: '16px 20px', color: '#0f172a' }}>{dpr.project?.name || '-'}</td>
                  <td style={{ padding: '16px 20px', color: '#334155' }}>{dpr.activitiesExecuted ? `${dpr.activitiesExecuted.split('\n').filter(Boolean).length} Items` : '0 Items'}</td>
                  <td style={{ padding: '16px 20px', color: '#334155' }}>{dpr.totalLabour ?? 0}</td>
                  <td style={{ padding: '16px 20px', color: '#334155' }}>{dpr.preparedByName || '-'}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      background: dpr.status === 'Approved' ? '#dcfce7' : '#e0e7ff', 
                      color: dpr.status === 'Approved' ? '#166534' : '#3730a3', 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' 
                    }}>
                      {dpr.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <Link href={`/site/dpr/${dpr.id}`} style={{ display: 'inline-block', background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', color: '#3b82f6', cursor: 'pointer', fontWeight: '500', textDecoration: 'none' }}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
