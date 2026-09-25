'use client';
import React, { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function TenderRegister() {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/tender');
        if (res.ok) setTenders(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (val) => {
    if (!val) return '-';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const filteredTenders = tenders.filter(t => {
    const matchesSearch = 
      t.tenderNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.projectName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="tnd-page-container">
      <div className="tnd-header">
        <div>
          <h1 className="tnd-title">Tender Register</h1>
          <p className="tnd-subtitle">Master list of all tenders and bids</p>
        </div>
        <Link href="/tender/create" className="tnd-btn tnd-btn-primary">
          + New Tender
        </Link>
      </div>

      <div className="tnd-card">
        <div className="tnd-toolbar">
          <div className="tnd-search">
            <Search className="tnd-search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search by Tender No, Client, Project..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="tnd-search-input"
            />
          </div>
          <div className="tnd-flex tnd-items-center" style={{ gap: '12px' }}>
            <Filter size={16} className="tnd-text-muted" />
            <select 
              className="tnd-select" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '0.875rem', width: 'auto' }}
            >
              <option value="All">All Statuses</option>
              <option value="Evaluation">Evaluation</option>
              <option value="Bid Preparation">Bid Preparation</option>
              <option value="Approval Pending">Approval Pending</option>
              <option value="Submitted">Submitted</option>
              <option value="Opening">Opening</option>
              <option value="Awarded">Awarded</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
        </div>

        <div className="tnd-table-wrapper">
          {loading ? (
            <div className="tnd-loading"><div className="tnd-spinner"></div></div>
          ) : (
            <table className="tnd-table">
              <thead>
                <tr>
                  <th>Tender No</th>
                  <th>Client / Authority</th>
                  <th>Project</th>
                  <th>Value</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th className="tnd-text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenders.map(t => (
                  <tr key={t.id}>
                    <td className="tnd-font-semibold">{t.tenderNo || '-'}</td>
                    <td>
                      <div className="tnd-font-medium">{t.clientName || '-'}</div>
                      <div className="tnd-text-xs tnd-text-muted">{t.authority}</div>
                    </td>
                    <td>
                      <div className="tnd-font-medium">{t.projectName || '-'}</div>
                      <div className="tnd-text-xs tnd-text-muted">{t.tenderType}</div>
                    </td>
                    <td className="tnd-font-medium">{formatCurrency(t.tenderValue)}</td>
                    <td>
                      {t.bidSubLastDate ? new Date(t.bidSubLastDate).toLocaleDateString() : '-'}
                    </td>
                    <td>
                      <span className={`tnd-badge ${t.status === 'Submitted' ? 'tnd-badge-blue' : t.status === 'Evaluation' ? 'tnd-badge-amber' : 'tnd-badge-slate'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="tnd-text-right">
                      <Link href={`/tender/${t.id}/evaluation`} className="tnd-btn tnd-btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredTenders.length === 0 && (
                  <tr>
                    <td colSpan="7" className="tnd-text-center tnd-text-muted tnd-py-8">
                      No tenders found matching your criteria.
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
