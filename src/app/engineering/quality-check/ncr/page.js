'use client';
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function NCRRegister() {
  const [ncrs, setNcrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/engineering/ncr');
        if (res.ok) setNcrs(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredNcrs = ncrs.filter(ncr => 
    ncr.ncrNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ncr.nonConformanceDescription?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Non-Conformance Reports (NCR)</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Track quality issues and corrective actions</p>
        </div>
        <Link href="/engineering/quality-check/ncr/raise-ncr">
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
            <Plus size={16} /> Raise NCR
          </button>
        </Link>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by NCR# or Description..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
            <Filter size={16} /> Filter
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading NCRs...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.875rem' }}>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>NCR No</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Location</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Non-Conformance</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Severity</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Raised By</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredNcrs.map(ncr => (
                  <tr key={ncr.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '16px 20px', fontWeight: '600', color: '#1e293b' }}>{ncr.ncrNo}</td>
                    <td style={{ padding: '16px 20px', color: '#334155' }}>{new Date(ncr.date).toLocaleDateString()}</td>
                    <td style={{ padding: '16px 20px', color: '#334155' }}>{ncr.location || '-'}</td>
                    <td style={{ padding: '16px 20px', color: '#0f172a', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ncr.nonConformanceDescription}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        background: ncr.severity === 'Critical' ? '#fee2e2' : ncr.severity === 'High' ? '#fed7aa' : ncr.severity === 'Medium' ? '#fef3c7' : '#f1f5f9',
                        color: ncr.severity === 'Critical' ? '#991b1b' : ncr.severity === 'High' ? '#c2410c' : ncr.severity === 'Medium' ? '#b45309' : '#475569',
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' 
                      }}>
                        {ncr.severity}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#334155' }}>{ncr.raisedBy}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        background: ncr.status === 'Closed' ? '#dcfce7' : ncr.status === 'Resolved' ? '#dbeafe' : ncr.status === 'In Progress' ? '#fef3c7' : '#fee2e2',
                        color: ncr.status === 'Closed' ? '#166534' : ncr.status === 'Resolved' ? '#1e40af' : ncr.status === 'In Progress' ? '#b45309' : '#991b1b',
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' 
                      }}>
                        {ncr.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', color: '#3b82f6', cursor: 'pointer', fontWeight: '500' }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredNcrs.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      No NCRs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
