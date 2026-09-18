'use client';
import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, Clock } from 'lucide-react';

export default function ClientCertification() {
  const [mbs, setMbs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMBs();
  }, []);

  const fetchMBs = async () => {
    try {
      const res = await fetch('/api/engineering/billing/mb');
      if (res.ok) setMbs(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const certifyMB = async (id) => {
    if (!confirm('Are you sure you want to certify this MB? It will become available for RA Billing.')) return;
    try {
      const res = await fetch(`/api/engineering/billing/mb/${id}/certify`, { method: 'POST' });
      if (res.ok) {
        fetchMBs();
      } else {
        alert('Failed to certify MB');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Client Certification</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Review and certify drafted Measurement Books</p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.875rem' }}>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>MB No & Date</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Project</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Total Amount</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                  <th style={{ padding: '12px 20px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {mbs.map(mb => {
                  const totalAmt = mb.items?.reduce((sum, item) => sum + item.amount, 0) || 0;
                  return (
                    <tr key={mb.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{mb.mbNo}</div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{new Date(mb.date).toLocaleDateString()}</div>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#0f172a' }}>{mb.project?.name}</td>
                      <td style={{ padding: '16px 20px', fontWeight: '500', color: '#0f172a' }}>{formatCurrency(totalAmt)}</td>
                      <td style={{ padding: '16px 20px' }}>
                        {mb.status === 'Draft' ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b45309', fontSize: '0.875rem', fontWeight: '500' }}>
                            <Clock size={14} /> Pending Review
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '0.875rem', fontWeight: '500' }}>
                            <CheckCircle size={14} /> Certified
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        {mb.status === 'Draft' && (
                          <button onClick={() => certifyMB(mb.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#10b981', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', color: '#fff', cursor: 'pointer', fontWeight: '500' }}>
                            <CheckCircle size={14} /> Certify MB
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
