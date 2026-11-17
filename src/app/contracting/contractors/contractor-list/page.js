'use client';
import React, { useState } from 'react';
import { Search, Plus, UserPlus, Users, Edit2, Home, ChevronRight, Trash2, Clock3, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import '../../contracting.css';

export default function ContractorList() {
  const router = useRouter();
  
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyContractor, setHistoryContractor] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [loadingStatusHistory, setLoadingStatusHistory] = useState(false);
  const [statusHistoryError, setStatusHistoryError] = useState('');

  React.useEffect(() => {
    fetchContractors();
  }, []);

  async function fetchContractors() {
    try {
      const res = await fetch('/api/contractors');
      if (res.ok) {
        const data = await res.json();
        setContractors(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (id) => {
    router.push(`/contracting/contractors/add-contractor?id=${id}`);
  };

  const openStatusHistory = async contractor => {
    setHistoryContractor(contractor);
    setStatusHistory([]);
    setStatusHistoryError('');
    setLoadingStatusHistory(true);
    try {
      const params = new URLSearchParams({ entity: 'contractor', id: contractor.id });
      const response = await fetch(`/api/master-status-history?${params}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load status history.');
      setStatusHistory(Array.isArray(result) ? result : []);
    } catch (error) {
      setStatusHistoryError(error.message || 'Unable to load status history.');
    } finally {
      setLoadingStatusHistory(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this contractor?")) return;
    
    try {
      const res = await fetch(`/api/contractors/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchContractors();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to delete contractor");
      }
    } catch (error) {
      console.error("Error deleting contractor:", error);
      alert("An error occurred while deleting");
    }
  };

  return (
    <div className="contracting-container">
      
      <div className="contracting-header">
        <div className="contracting-header-title">
          <Users size={18} />
          Contractor List ( Total : {contractors.length} )
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Contractor List
        </div>
      </div>

      <div className="contracting-actions-bar">
        <div className="contracting-filters">
          <div className="search-icon-wrapper">
            <Search size={16} />
          </div>
          <input type="text" className="contracting-input" placeholder="Search by Name..." />
          <input type="text" className="contracting-input" placeholder="PAN/PIN No." />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => router.push('/contracting/contractors/registered-suppliers')}>
            <Users size={16} /> Registered Suppliers
          </button>
          <button className="btn-secondary" onClick={() => router.push('/contracting/contractors/add-group')}>
            <Users size={16} /> Groups
          </button>
          <button className="btn-primary" onClick={() => router.push('/contracting/contractors/add-contractor')}>
            <UserPlus size={16} /> Add Contractor
          </button>
        </div>
      </div>

      <div className="contracting-table-wrapper">
        <table className="contracting-table">
          <thead>
            <tr>
              <th>Contractor Name</th>
              <th>Group</th>
              <th style={{ width: '120px' }}>Phone No</th>
              <th style={{ width: '120px' }}>Mobile No</th>
              <th style={{ width: '140px' }}>PAN/PIN No</th>
              <th style={{ width: '80px' }}>Status</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{textAlign: 'center', padding: '20px'}}>Loading...</td></tr>
            ) : contractors.length === 0 ? (
              <tr><td colSpan="7" style={{textAlign: 'center', padding: '20px'}}>No contractors found.</td></tr>
            ) : (
              contractors.map((c, index) => (
                <tr key={c.id}>
                  <td>
                    <div className="contractor-name">
                      <div className="contractor-avatar">
                        {c.companyName ? c.companyName.substring(0, 2).toUpperCase() : 'CO'}
                      </div>
                      {c.companyName}
                    </div>
                  </td>
                  <td>
                    {c.groups && c.groups.length > 0 ? (
                      <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: '#64748b', fontWeight: 500 }}>
                        {c.groups[0].name} {c.groups.length > 1 && `+${c.groups.length - 1}`}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>None</span>
                    )}
                  </td>
                  <td>{c.phone || '-'}</td>
                  <td>{c.phone || '-'}</td>
                  <td>{c.panNumber || '-'}</td>
                  <td>
                    <span className={`status-badge ${['Active', 'Approved', 'Regular'].includes(c.status) ? 'status-active' : c.status === 'Blacklisted' ? 'status-blacklisted' : 'status-inactive'}`}>
                      {c.status || 'Active'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Clock3 size={16} className="action-icon" onClick={() => openStatusHistory(c)} title="Status History" style={{ marginRight: '8px', cursor: 'pointer', color: '#64748b' }} />
                    <Edit2 size={16} className="action-icon" onClick={() => handleEdit(c.id)} title="Edit Contractor" style={{ marginRight: '8px', cursor: 'pointer', color: '#3b82f6' }} />
                    <Trash2 size={16} className="action-icon" onClick={() => handleDelete(c.id)} title="Delete Contractor" style={{ cursor: 'pointer', color: '#ef4444' }} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {historyContractor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div role="dialog" aria-modal="true" aria-labelledby="contractor-status-history-title" style={{ width: 'min(560px, 100%)', maxHeight: '80vh', overflowY: 'auto', background: '#fff', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 id="contractor-status-history-title" style={{ margin: 0, fontSize: '1.1rem' }}>Status History — {historyContractor.companyName}</h2>
              <button type="button" aria-label="Close status history" onClick={() => setHistoryContractor(null)} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {loadingStatusHistory ? <p>Loading status history...</p>
              : statusHistoryError ? <p role="alert" style={{ color: '#b91c1c' }}>{statusHistoryError}</p>
                : statusHistory.length === 0 ? <p style={{ color: '#64748b' }}>No status history recorded.</p>
                  : statusHistory.map(entry => (
                    <div key={entry.id} style={{ borderLeft: '2px solid #0891b2', padding: '2px 0 12px 12px', marginLeft: '4px', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 600 }}>{entry.fromStatus || '—'} → {entry.toStatus || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(entry.changedAt).toLocaleString()} · {entry.changedBy}</div>
                    </div>
                  ))}
          </div>
        </div>
      )}

    </div>
  );
}
