'use client';
import React, { useState, useEffect } from 'react';
import { Home, ChevronRight, Search, MessageSquare, Eye, Trash2, X } from 'lucide-react';
import '../../contracting.css';

const STATUS_COLORS = {
  Open:      { bg: '#dbeafe', color: '#1d4ed8' },
  Closed:    { bg: '#dcfce7', color: '#166534' },
  Cancelled: { bg: '#fee2e2', color: '#991b1b' },
};

export default function EnquiryBrowse() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewEnquiry, setViewEnquiry] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch('/api/contracting/enquiry')
      .then(r => r.json())
      .then(data => setEnquiries(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this enquiry?')) return;
    try {
      const res = await fetch('/api/contracting/enquiry', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setEnquiries(prev => prev.filter(e => e.id !== id));
        showToast('Enquiry deleted.');
      } else {
        showToast('Failed to delete.', 'error');
      }
    } catch {
      showToast('Error deleting.', 'error');
    }
  };

  const filtered = enquiries.filter(e =>
    e.enquiryNo?.toLowerCase().includes(search.toLowerCase()) ||
    e.projectName?.toLowerCase().includes(search.toLowerCase()) ||
    e.status?.toLowerCase().includes(search.toLowerCase())
  );

  const statusStyle = (status) => STATUS_COLORS[status] || { bg: '#f1f5f9', color: '#475569' };

  return (
    <div className="contracting-container">
      <div className="contracting-header">
        <div className="contracting-header-title"><MessageSquare size={18} /> Enquiry Browse</div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Enquiry Browse
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {toast && (
          <div style={{ background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`, borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', color: toast.type === 'success' ? '#166534' : '#991b1b', fontSize: '0.85rem' }}>
            {toast.msg}
          </div>
        )}

        {/* Search & Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="contracting-input"
              placeholder="Search by enquiry no, project, status..."
              style={{ paddingLeft: '36px', width: '100%' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['Open', 'Closed', 'Cancelled'].map(s => {
              const st = statusStyle(s);
              const count = enquiries.filter(e => e.status === s).length;
              return (
                <div key={s} style={{ background: st.bg, color: st.color, padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 }}>
                  {s}: {count}
                </div>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Enquiry No.</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Project</th>
                <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Tasks</th>
                <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Contractors</th>
                <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Quotations</th>
                <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Loading enquiries...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>No enquiries found.</td></tr>
              ) : filtered.map((e, idx) => {
                const st = statusStyle(e.status);
                return (
                  <tr key={e.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#17a2b8' }}>{e.enquiryNo}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>{e.projectName || '—'}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#64748b' }}>
                      {new Date(e.enquiryDate).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 600 }}>{e.tasks?.length || 0}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 600 }}>{e.contractors?.length || 0}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 600, color: e.quotations?.length > 0 ? '#16a34a' : '#94a3b8' }}>{e.quotations?.length || 0}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>{e.status}</span>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button title="View" onClick={() => setViewEnquiry(e)} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }}>
                          <Eye size={14} />
                        </button>
                        <button title="Delete" onClick={() => handleDelete(e.id)} style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {viewEnquiry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '700px', maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#17a2b8' }}>{viewEnquiry.enquiryNo}</h3>
              <button onClick={() => setViewEnquiry(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
                <div><span style={{ color: '#64748b' }}>Project:</span> <strong>{viewEnquiry.projectName}</strong></div>
                <div><span style={{ color: '#64748b' }}>Status:</span> <strong>{viewEnquiry.status}</strong></div>
                <div><span style={{ color: '#64748b' }}>Date:</span> <strong>{new Date(viewEnquiry.enquiryDate).toLocaleDateString('en-IN')}</strong></div>
                <div><span style={{ color: '#64748b' }}>Due Date:</span> <strong>{viewEnquiry.dueDate ? new Date(viewEnquiry.dueDate).toLocaleDateString('en-IN') : '—'}</strong></div>
                <div><span style={{ color: '#64748b' }}>Payment Terms:</span> <strong>{viewEnquiry.paymentTerms || '—'}</strong></div>
                <div><span style={{ color: '#64748b' }}>Quotations:</span> <strong>{viewEnquiry.quotations?.length || 0}</strong></div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155', marginBottom: '8px' }}>Tasks ({viewEnquiry.tasks?.length || 0})</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead><tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>#</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>Task</th>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>Unit</th>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>Qty</th>
                  </tr></thead>
                  <tbody>
                    {(viewEnquiry.tasks || []).map((t, i) => (
                      <tr key={t.id}><td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>{i + 1}</td><td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontWeight: 500 }}>{t.taskName}</td><td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>{t.unit || '—'}</td><td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>{t.qty}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155', marginBottom: '8px' }}>Contractors ({viewEnquiry.contractors?.length || 0})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(viewEnquiry.contractors || []).map(c => (
                    <span key={c.id} style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem' }}>{c.contractorName}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
