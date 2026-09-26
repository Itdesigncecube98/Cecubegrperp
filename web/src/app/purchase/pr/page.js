'use client';
import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, X, Save, Trash2 } from 'lucide-react';
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

  const updateSelectedPr = (field, value) => {
    setSelectedPr(previous => ({ ...previous, [field]: value }));
  };

  const updateSelectedItem = (index, field, value) => {
    setSelectedPr(previous => ({
      ...previous,
      items: (previous.items || []).map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)
    }));
  };

  const addSelectedItem = () => {
    setSelectedPr(previous => ({
      ...previous,
      items: [...(previous.items || []), { item: '', specification: '', unit: 'Nos', quantity: 1 }]
    }));
  };

  const removeSelectedItem = (index) => {
    setSelectedPr(previous => ({
      ...previous,
      items: (previous.items || []).filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const saveSelectedPr = async () => {
    if (!selectedPr || selectedPr.status === 'Approved') return;
    const response = await fetch('/api/purchase/pr', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedPr.id,
        project: selectedPr.project,
        site: selectedPr.site,
        requiredDate: selectedPr.requiredDate,
        priority: selectedPr.priority,
        purpose: selectedPr.purpose,
        remarks: selectedPr.remarks,
        requestedById: selectedPr.requestedById,
        items: selectedPr.items
      })
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || 'Failed to save purchase indent');
      return;
    }
    setPrs(previous => previous.map(pr => pr.id === result.id ? result : pr));
    setSelectedPr(result);
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
                      {pr.status === 'Approved' && (
                        <Link href={`/purchase/enquiry/generation?indentId=${pr.id}`} className="pur-btn pur-btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem', marginRight: '8px', backgroundColor: '#10b981', color: 'white' }}>
                          Generate Enquiry
                        </Link>
                      )}
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#fff', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch' }}>
          <div style={{ width: '100vw', height: '100vh', overflowY: 'auto', background: '#fff' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fbfdff' }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem' }}>{selectedPr.prNo}</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.8rem' }}>Purchase requisition details</p>
              </div>
              <button type="button" onClick={() => setSelectedPr(null)} style={{ width: '34px', height: '34px', border: '1px solid #dbe4ee', borderRadius: '9px', background: '#fff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div><div className="pur-text-xs pur-text-muted">Project</div>{selectedPr.status === 'Approved' ? <strong>{selectedPr.project || '-'}</strong> : <input className="pur-input" value={selectedPr.project || ''} onChange={e => updateSelectedPr('project', e.target.value)} />}</div>
                <div><div className="pur-text-xs pur-text-muted">PR Date</div><strong>{selectedPr.prDate ? new Date(selectedPr.prDate).toLocaleDateString() : '-'}</strong></div>
                <div><div className="pur-text-xs pur-text-muted">Status</div><strong>{selectedPr.status}</strong></div>
                <div><div className="pur-text-xs pur-text-muted">Priority</div>{selectedPr.status === 'Approved' ? <strong>{selectedPr.priority || 'Normal'}</strong> : <select className="pur-select" value={selectedPr.priority || 'Normal'} onChange={e => updateSelectedPr('priority', e.target.value)}><option>Normal</option><option>Urgent</option><option>Critical</option></select>}</div>
                <div><div className="pur-text-xs pur-text-muted">Required Date</div>{selectedPr.status === 'Approved' ? <strong>{selectedPr.requiredDate ? new Date(selectedPr.requiredDate).toLocaleDateString() : '-'}</strong> : <input type="date" className="pur-input" value={selectedPr.requiredDate ? String(selectedPr.requiredDate).slice(0, 10) : ''} onChange={e => updateSelectedPr('requiredDate', e.target.value)} />}</div>
                <div><div className="pur-text-xs pur-text-muted">Purpose</div>{selectedPr.status === 'Approved' ? <strong>{selectedPr.purpose || '-'}</strong> : <textarea className="pur-textarea" rows="2" value={selectedPr.purpose || ''} onChange={e => updateSelectedPr('purpose', e.target.value)} />}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}>Requested Materials</h3>
                {selectedPr.status !== 'Approved' && <button type="button" className="pur-btn pur-btn-outline" onClick={addSelectedItem}><Plus size={14} /> Add Item</button>}
              </div>
              <div className="pur-table-wrapper">
                <table className="pur-table">
                  <thead><tr><th>#</th><th>Material</th><th>Specification</th><th>Unit</th><th>Quantity</th>{selectedPr.status !== 'Approved' && <th></th>}</tr></thead>
                  <tbody>
                    {(selectedPr.items || []).map((item, index) => <tr key={item.id || index}><td>{index + 1}</td><td className="pur-font-medium">{selectedPr.status === 'Approved' ? item.item : <input className="pur-input" value={item.item || ''} onChange={e => updateSelectedItem(index, 'item', e.target.value)} />}</td><td>{selectedPr.status === 'Approved' ? (item.specification || '-') : <input className="pur-input" value={item.specification || ''} onChange={e => updateSelectedItem(index, 'specification', e.target.value)} />}</td><td>{selectedPr.status === 'Approved' ? item.unit : <input className="pur-input" value={item.unit || ''} onChange={e => updateSelectedItem(index, 'unit', e.target.value)} />}</td><td>{selectedPr.status === 'Approved' ? item.quantity : <input type="number" className="pur-input" value={item.quantity || ''} onChange={e => updateSelectedItem(index, 'quantity', e.target.value)} />}</td>{selectedPr.status !== 'Approved' && <td><button type="button" className="pur-icon-btn pur-text-danger" onClick={() => removeSelectedItem(index)}><Trash2 size={15} /></button></td>}</tr>)}
                    {(!selectedPr.items || selectedPr.items.length === 0) && <tr><td colSpan={selectedPr.status === 'Approved' ? 5 : 6} className="pur-text-center pur-text-muted">No material items found.</td></tr>}
                  </tbody>
                </table>
              </div>
              {selectedPr.status !== 'Approved' && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}><button type="button" className="pur-btn pur-btn-primary" onClick={saveSelectedPr}><Save size={16} /> Save Changes</button></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
