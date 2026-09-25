'use client';
import React, { useState } from 'react';
import { Search, Plus, UserPlus, Users, Edit2, Home, ChevronRight, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import '../../contracting.css';

export default function ContractorList() {
  const router = useRouter();
  
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
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
  };

  const handleEdit = (id) => {
    router.push(`/contracting/contractors/add-contractor?id=${id}`);
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
              <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
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
                    <span className={`status-badge ${c.status === 'Active' ? 'status-active' : c.status === 'Blacklisted' ? 'status-blacklisted' : 'status-inactive'}`}>
                      {c.status || 'Active'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Edit2 size={16} className="action-icon" onClick={() => handleEdit(c.id)} title="Edit Contractor" style={{ marginRight: '8px', cursor: 'pointer', color: '#3b82f6' }} />
                    <Trash2 size={16} className="action-icon" onClick={() => handleDelete(c.id)} title="Delete Contractor" style={{ cursor: 'pointer', color: '#ef4444' }} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
