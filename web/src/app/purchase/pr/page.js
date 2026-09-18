'use client';
import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, X } from 'lucide-react';
import Link from 'next/link';

export default function PRRegister() {
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedPr, setSelectedPr] = useState(null);

  const updateStatus = async (id, status) => {
    const response = await fetch('/api/purchase/pr', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    if (response.ok) {
      setPrs(previous => previous.map(pr => pr.id === id ? { ...pr, status } : pr));
    } else {
      alert('Failed to update PR status');
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/purchase/pr');
        if (res.ok) setPrs(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredPrs = prs.filter(pr => {
    const matchesSearch = 
      pr.prNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.project?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || pr.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="pur-page-container">
      <div className="pur-header">
        <div>
          <h1 className="pur-title">Purchase Indent (PR) Register</h1>
          <p className="pur-subtitle">Manage procurement requests</p>
        </div>
        <Link href="/purchase/pr/create" className="pur-btn pur-btn-primary" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
          <Plus size={16} /> New PR
        </Link>
      </div>

      <div className="pur-card">
        <div className="pur-toolbar">
          <div className="pur-search">
            <Search className="pur-search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search by PR No, Project..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pur-search-input"
            />
          </div>
          <div className="pur-flex pur-items-center" style={{ gap: '12px' }}>
            <Filter size={16} className="pur-text-muted" />
            <select 
              className="pur-select" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '0.875rem', width: 'auto' }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="pur-table-wrapper">
          {loading ? (
            <div className="pur-loading"><div className="pur-spinner"></div></div>
          ) : (
            <table className="pur-table">
              <thead>
                <tr>
                  <th>PR No</th>
                  <th>Date</th>
                  <th>Project / Site</th>
                  <th>Items</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th className="pur-text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrs.map(pr => (
                  <tr key={pr.id}>
                    <td className="pur-font-semibold">{pr.prNo}</td>
                    <td>{new Date(pr.prDate).toLocaleDateString()}</td>
                    <td>
                      <div className="pur-font-medium">{pr.project || '-'}</div>
                      <div className="pur-text-xs pur-text-muted">{pr.site || '-'}</div>
                    </td>
                    <td>{pr.items?.length || 0}</td>
                    <td>
                      <span className={`pur-badge ${pr.priority === 'Critical' ? 'pur-badge-red' : pr.priority === 'Urgent' ? 'pur-badge-amber' : 'pur-badge-slate'}`}>
                        {pr.priority}
                      </span>
                    </td>
                    <td>
                      <select
                        className="pur-select"
                        value={pr.status}
                        onChange={(event) => updateStatus(pr.id, event.target.value)}
                        style={{ minWidth: '150px', padding: '5px 8px', fontSize: '0.75rem' }}
                      >
                        <option>Pending Approval</option>
                        <option>Approved</option>
                        <option>Rejected</option>
                        <option>Closed</option>
                      </select>
                    </td>
                    <td className="pur-text-right">
                      <button type="button" onClick={() => setSelectedPr(pr)} className="pur-btn pur-btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPrs.length === 0 && (
                  <tr>
                    <td colSpan="7" className="pur-text-center pur-text-muted pur-py-8">
                      No purchase indents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedPr && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: '16px', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fbfdff' }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem' }}>{selectedPr.prNo}</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.8rem' }}>Purchase requisition details</p>
              </div>
              <button type="button" onClick={() => setSelectedPr(null)} style={{ width: '34px', height: '34px', border: '1px solid #dbe4ee', borderRadius: '9px', background: '#fff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div><div className="pur-text-xs pur-text-muted">Project</div><strong>{selectedPr.project || '-'}</strong></div>
                <div><div className="pur-text-xs pur-text-muted">PR Date</div><strong>{selectedPr.prDate ? new Date(selectedPr.prDate).toLocaleDateString() : '-'}</strong></div>
                <div><div className="pur-text-xs pur-text-muted">Status</div><strong>{selectedPr.status}</strong></div>
                <div><div className="pur-text-xs pur-text-muted">Priority</div><strong>{selectedPr.priority || 'Normal'}</strong></div>
                <div><div className="pur-text-xs pur-text-muted">Required Date</div><strong>{selectedPr.requiredDate ? new Date(selectedPr.requiredDate).toLocaleDateString() : '-'}</strong></div>
                <div><div className="pur-text-xs pur-text-muted">Purpose</div><strong>{selectedPr.purpose || '-'}</strong></div>
              </div>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#1e293b' }}>Requested Materials</h3>
              <div className="pur-table-wrapper">
                <table className="pur-table">
                  <thead><tr><th>#</th><th>Material</th><th>Specification</th><th>Unit</th><th>Quantity</th></tr></thead>
                  <tbody>
                    {(selectedPr.items || []).map((item, index) => <tr key={item.id || index}><td>{index + 1}</td><td className="pur-font-medium">{item.item}</td><td>{item.specification || '-'}</td><td>{item.unit}</td><td>{item.quantity}</td></tr>)}
                    {(!selectedPr.items || selectedPr.items.length === 0) && <tr><td colSpan="5" className="pur-text-center pur-text-muted">No material items found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
