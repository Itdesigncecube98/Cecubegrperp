'use client';
import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, FileText, Download } from 'lucide-react';
import Link from 'next/link';

export default function PORegister() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/purchase/po');
        if (res.ok) setPos(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  const filteredPos = pos.filter(po => {
    const matchesSearch = 
      po.poNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.project?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const approvePO = async (id) => {
    const res = await fetch('/api/purchase/po', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'approve' }) });
    if (res.ok) setPos(current => current.map(po => po.id === id ? { ...po, status: 'Approved' } : po));
  };

  return (
    <div className="pur-page-container">
      <div className="pur-header">
        <div>
          <h1 className="pur-title">Purchase Order Register</h1>
          <p className="pur-subtitle">Manage POs and delivery schedules</p>
        </div>
        <Link href="/purchase/po/create" className="pur-btn pur-btn-primary" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
          <Plus size={16} /> New PO
        </Link>
      </div>

      <div className="pur-card">
        <div className="pur-toolbar">
          <div className="pur-search">
            <Search className="pur-search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search by PO No, Vendor, Project..." 
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
              <option value="Draft">Draft</option>
              <option value="Approved">Approved</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Delivered">Delivered</option>
              <option value="Paid">Paid</option>
              <option value="Closed">Closed</option>
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
                  <th>PO No & Date</th>
                  <th>Vendor</th>
                  <th>Project / PR Ref</th>
                  <th>Value</th>
                  <th>Exp. Delivery</th>
                  <th>Status</th>
                  <th className="pur-text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPos.map(po => (
                  <tr key={po.id}>
                    <td>
                      <div className="pur-font-semibold">{po.poNo}</div>
                      <div className="pur-text-xs pur-text-muted">{new Date(po.poDate).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <div className="pur-font-medium">{po.vendor?.name}</div>
                      <div className="pur-text-xs pur-text-muted">{po.vendor?.vendorCode}</div>
                    </td>
                    <td>
                      <div>{po.project || '-'}</div>
                      <div className="pur-text-xs pur-text-muted">PR: {po.indent?.prNo || 'Direct'}</div>
                    </td>
                    <td className="pur-font-semibold">{formatCurrency(po.totalValue)}</td>
                    <td>{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className={`pur-badge ${po.status === 'Approved' ? 'pur-badge-emerald' : po.status === 'Draft' ? 'pur-badge-slate' : 'pur-badge-amber'}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="pur-text-right pur-flex" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                      {po.status === 'Draft' && <button className="pur-btn pur-btn-outline" onClick={() => approvePO(po.id)}>Approve</button>}
                      <button className="pur-icon-btn pur-text-indigo-600" title="Download PDF">
                        <Download size={16} />
                      </button>
                      <button className="pur-btn pur-btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPos.length === 0 && (
                  <tr>
                    <td colSpan="7" className="pur-text-center pur-text-muted pur-py-8">
                      No purchase orders found.
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
