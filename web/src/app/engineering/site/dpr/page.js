'use client';
import React, { useState } from 'react';
import { FileText, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function DPRRegister() {
  const [dprs, setDprs] = useState([
    { id: 1, date: '2026-09-09', project: 'Solar Plant EPC', preparedBy: 'Ramesh K', status: 'Submitted', activities: 2, manpower: 45 },
    { id: 2, date: '2026-09-08', project: 'Solar Plant EPC', preparedBy: 'Ramesh K', status: 'Approved', activities: 3, manpower: 50 },
  ]);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Daily Progress Reports (DPR)</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Track daily site execution and manpower</p>
        </div>
        <Link href="/engineering/site/dpr/new-dpr" style={{ textDecoration: 'none' }}>
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
              {dprs.map(dpr => (
                <tr key={dpr.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 20px', fontWeight: '600', color: '#1e293b' }}>{dpr.date}</td>
                  <td style={{ padding: '16px 20px', color: '#0f172a' }}>{dpr.project}</td>
                  <td style={{ padding: '16px 20px', color: '#334155' }}>{dpr.activities} Items</td>
                  <td style={{ padding: '16px 20px', color: '#334155' }}>{dpr.manpower}</td>
                  <td style={{ padding: '16px 20px', color: '#334155' }}>{dpr.preparedBy}</td>
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
                    <button style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', color: '#3b82f6', cursor: 'pointer', fontWeight: '500' }}>
                      View
                    </button>
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
