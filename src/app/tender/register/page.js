'use client';
import React, { useState, useEffect } from 'react';
import { Search, Filter, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function TenderRegister() {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [registeredTenderNo, setRegisteredTenderNo] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingTenderId, setDeletingTenderId] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem('isAdmin') === 'true');
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('registered') === '1') {
      setRegisteredTenderNo(searchParams.get('tenderNo') || 'successfully');
    }
  }, []);

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

  const deleteTender = async (tender) => {
    const tenderLabel = tender.tenderNo || tender.title || 'this tender';
    const confirmed = window.confirm(
      `Permanently delete ${tenderLabel}? This also deletes its BOQ, bid, document records, approvals, and tender audit history. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingTenderId(tender.id);
    setDeleteError('');
    try {
      const response = await fetch(`/api/tender/${encodeURIComponent(tender.id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Tender could not be deleted.');
      setTenders(current => current.filter(item => item.id !== tender.id));
    } catch (error) {
      setDeleteError(error.message || 'Tender could not be deleted.');
    } finally {
      setDeletingTenderId('');
    }
  };

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

      {registeredTenderNo && (
        <div className="tnd-detail-success" role="status" style={{ marginBottom: 16 }}>
          Tender {registeredTenderNo} registered successfully. It is now listed below.
        </div>
      )}
      {deleteError && <div className="tnd-detail-error" role="alert" style={{ marginBottom: 16 }}>{deleteError}</div>}

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
                  <th>Opening / Closing</th>
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
                      {t.details?.tenderLocation && <div className="tnd-text-xs tnd-text-muted">{t.details.tenderLocation}</div>}
                    </td>
                    <td className="tnd-font-medium">{formatCurrency(t.tenderValue)}</td>
                    <td>
                      <div>Open: {t.details?.tenderOpeningDate ? new Date(`${t.details.tenderOpeningDate}T00:00:00`).toLocaleDateString() : t.techOpeningDate ? new Date(t.techOpeningDate).toLocaleDateString() : '—'}</div>
                      <div>Close: {t.details?.tenderClosingDate ? new Date(`${t.details.tenderClosingDate}T00:00:00`).toLocaleDateString() : t.bidSubLastDate ? new Date(t.bidSubLastDate).toLocaleDateString() : '—'}</div>
                    </td>
                    <td>
                      <span className={`tnd-badge ${t.status === 'Submitted' ? 'tnd-badge-blue' : t.status === 'Evaluation' ? 'tnd-badge-amber' : 'tnd-badge-slate'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="tnd-text-right">
                      <Link href={`/tender/${t.id}/details`} className="tnd-btn tnd-btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                        Manage
                      </Link>
                      {isAdmin && (
                        <button
                          type="button"
                          className="tnd-btn tnd-btn-outline"
                          style={{ padding: '4px 8px', marginLeft: 8, color: '#b91c1c', borderColor: '#fecaca', fontSize: '0.75rem' }}
                          aria-label={`Delete ${t.tenderNo || 'tender'}`}
                          disabled={deletingTenderId === t.id}
                          onClick={() => deleteTender(t)}
                        >
                          <Trash2 size={13} />
                          {deletingTenderId === t.id ? 'Deleting…' : 'Delete'}
                        </button>
                      )}
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
