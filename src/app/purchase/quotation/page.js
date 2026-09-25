'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, ChevronRight, FileText, RefreshCw, GitCompare, PenLine, AlertCircle } from 'lucide-react';
import '../purchase.css';
import { listEnquiries } from '../enquiry/rfqApi';
import { getComparison } from './quotationApi';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '-');

const formatMoney = (value) =>
  value === null || value === undefined
    ? '-'
    : `₹ ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function QuotationPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [comparison, setComparison] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const list = await listEnquiries();
      setEnquiries(list);
      setSelectedId((current) => current || list[0]?.id || '');
    } catch (error) {
      setLoadError(error.message || 'Failed to load enquiries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setComparison(null);
      return undefined;
    }

    let active = true;
    setDetailLoading(true);

    getComparison(selectedId)
      .then((data) => {
        if (active) setComparison(data);
      })
      .catch((error) => {
        if (active) setLoadError(error.message || 'Failed to load the enquiry.');
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedId]);

  const selectedEnquiry = enquiries.find((rfq) => rfq.id === selectedId) || null;
  const vendors = comparison?.vendors || [];
  const quotedCount = vendors.filter((vendor) => vendor.quotationId).length;

  return (
    <div className="purchase-container">
      <div className="purchase-header">
        <div className="purchase-header-title">
          <FileText size={18} />
          Quotation
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Quotation
        </div>
      </div>

      {loadError && (
        <div className="purchase-card" style={{ borderLeft: '3px solid #ef4444' }}>
          <div className="purchase-card-body" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
            <AlertCircle size={16} /> {loadError}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', alignItems: 'start' }}>
        <div className="purchase-card">
          <div className="purchase-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} /> Enquiries ({enquiries.length})
            </span>
            <button type="button" onClick={load} title="Refresh" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
              <RefreshCw size={14} />
            </button>
          </div>
          <div style={{ maxHeight: '560px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '20px', color: '#64748b', fontSize: '0.85rem' }}>Loading enquiries...</div>
            ) : enquiries.length === 0 ? (
              <div style={{ padding: '20px', color: '#64748b', fontSize: '0.85rem' }}>
                No enquiries yet. Create one from Enquiry Generation.
              </div>
            ) : (
              enquiries.map((rfq) => {
                const isActive = rfq.id === selectedId;
                return (
                  <button
                    key={rfq.id}
                    type="button"
                    onClick={() => setSelectedId(rfq.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px',
                      border: 'none',
                      borderBottom: '1px solid #f1f5f9',
                      borderLeft: isActive ? '3px solid #17a2b8' : '3px solid transparent',
                      background: isActive ? '#f0f9ff' : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#0284c7', fontSize: '0.88rem' }}>{rfq.rfqNo}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      {rfq.project || 'No project'} • Due {formatDate(rfq.dueDate)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                      {rfq.vendors?.length || 0} vendors • {rfq._count?.quotations || 0} quotes • {rfq.status}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="purchase-card">
          <div className="purchase-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0284c7', backgroundColor: '#f0f9ff' }}>
            <span>
              {selectedEnquiry ? `${selectedEnquiry.rfqNo} — Vendor Quotations (${quotedCount}/${vendors.length} received)` : 'Select an enquiry'}
            </span>
            {selectedId && (
              <Link
                href={`/purchase/quotation/compare?rfqId=${selectedId}`}
                className="btn-cyan"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '6px 12px', fontSize: '0.82rem' }}
              >
                <GitCompare size={14} /> Compare & Approve
              </Link>
            )}
          </div>

          <div className="purchase-card-body" style={{ padding: 0 }}>
            {!selectedId ? (
              <div style={{ padding: '24px', color: '#64748b', fontSize: '0.85rem' }}>
                Pick an enquiry on the left to record vendor quotations.
              </div>
            ) : detailLoading ? (
              <div style={{ padding: '24px', color: '#64748b', fontSize: '0.85rem' }}>Loading vendors...</div>
            ) : vendors.length === 0 ? (
              <div style={{ padding: '24px', color: '#64748b', fontSize: '0.85rem' }}>
                No vendors were invited on this enquiry.
              </div>
            ) : (
              <div className="purchase-table-wrapper" style={{ marginTop: 0 }}>
                <table className="purchase-table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Invite Status</th>
                      <th>Quoted On</th>
                      <th style={{ textAlign: 'center' }}>Items</th>
                      <th style={{ textAlign: 'right' }}>Quoted Value</th>
                      <th style={{ width: '150px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((vendor, index) => (
                      <tr key={vendor.vendorId} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                        <td style={{ fontWeight: 500 }}>{vendor.vendorName}</td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: vendor.quotationId ? '#d1fae5' : vendor.inviteStatus === 'Responded' ? '#e0f2fe' : '#fef3c7',
                            color: vendor.quotationId ? '#047857' : vendor.inviteStatus === 'Responded' ? '#0369a1' : '#b45309'
                          }}>
                            {vendor.quotationId ? 'Quoted' : vendor.inviteStatus}
                          </span>
                        </td>
                        <td>{formatDate(vendor.quotedOn)}</td>
                        <td style={{ textAlign: 'center' }}>{vendor.itemCount || 0}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(vendor.finalAmount)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <Link
                            href={`/purchase/quotation/entry?rfqId=${selectedId}&vendorId=${vendor.vendorId}`}
                            style={{ color: '#17a2b8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 500 }}
                          >
                            <PenLine size={14} /> {vendor.quotationId ? 'Edit Quote' : 'Enter Quote'}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
