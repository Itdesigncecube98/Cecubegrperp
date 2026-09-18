'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Home, ChevronRight, Search, RefreshCw, Trash2, GitCompare, AlertCircle } from 'lucide-react';
import Dialog from '@/components/Dialog';
import '../../purchase.css';
import { listEnquiries, deleteEnquiry } from '../rfqApi';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '-');

const STATUS_STYLE = {
  Open: { background: '#fef3c7', color: '#b45309' },
  Approved: { background: '#d1fae5', color: '#047857' },
  Closed: { background: '#f1f5f9', color: '#475569' }
};

export default function EnquiryBrowse() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setEnquiries(await listEnquiries());
    } catch (error) {
      setLoadError(error.message || 'Failed to load enquiries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return enquiries;
    return enquiries.filter((rfq) =>
      [rfq.rfqNo, rfq.project, rfq.status, rfq.indent?.prNo]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [enquiries, searchTerm]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEnquiry(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (error) {
      setLoadError(error.message || 'Failed to delete the enquiry.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="purchase-container">
      <div className="purchase-header">
        <div className="purchase-header-title">
          <Search size={18} />
          Enquiry Browse (Total : {enquiries.length})
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Enquiry Browse
        </div>
      </div>

      <div className="purchase-actions-bar">
        <div className="purchase-filters">
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="purchase-input"
              placeholder="Search Enquiry No / Project..."
              style={{ width: '280px' }}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
          <button className="btn-cyan" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loadError && (
        <div className="purchase-card" style={{ borderLeft: '3px solid #ef4444' }}>
          <div className="purchase-card-body" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
            <AlertCircle size={16} /> {loadError}
          </div>
        </div>
      )}

      <div className="purchase-table-wrapper">
        <table className="purchase-table">
          <thead>
            <tr>
              <th>Enquiry No</th>
              <th>Enquiry Date</th>
              <th>Due Date</th>
              <th>Expiry Date</th>
              <th>PR No</th>
              <th>Project</th>
              <th style={{ textAlign: 'center' }}>Vendors</th>
              <th style={{ textAlign: 'center' }}>Quotes</th>
              <th>Status</th>
              <th style={{ width: '140px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  Loading enquiries...
                </td>
              </tr>
            ) : (
              filtered.map((rfq, index) => (
                <tr key={rfq.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                  <td style={{ fontWeight: 600, color: '#0284c7' }}>{rfq.rfqNo}</td>
                  <td>{formatDate(rfq.rfqDate)}</td>
                  <td>{formatDate(rfq.dueDate)}</td>
                  <td>{formatDate(rfq.expiryDate)}</td>
                  <td>{rfq.indent?.prNo || '-'}</td>
                  <td>{rfq.project || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{rfq.vendors?.length || 0}</td>
                  <td style={{ textAlign: 'center' }}>{rfq._count?.quotations || 0}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      ...(STATUS_STYLE[rfq.status] || STATUS_STYLE.Closed)
                    }}>
                      {rfq.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                      <Link
                        href={`/purchase/quotation/compare?rfqId=${rfq.id}`}
                        title={`Compare quotes for ${rfq.rfqNo}`}
                        style={{ color: '#17a2b8', display: 'flex' }}
                      >
                        <GitCompare size={16} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(rfq)}
                        title={`Delete ${rfq.rfqNo}`}
                        aria-label={`Delete ${rfq.rfqNo}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#ef4444', display: 'flex' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  No enquiries found. Create one from Enquiry Generation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        isOpen={Boolean(deleteTarget)}
        type="confirm"
        title="Delete Enquiry"
        message={
          deleting
            ? 'Deleting enquiry...'
            : `Delete ${deleteTarget?.rfqNo || 'this enquiry'} and all vendor quotations recorded against it?`
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
