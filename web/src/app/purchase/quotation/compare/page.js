'use client';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Home, ChevronRight, GitCompare, ArrowLeft, AlertCircle, CheckCircle2, Trophy, RefreshCw } from 'lucide-react';
import '../../purchase.css';
import { approveSelection, getComparison } from '../quotationApi';

const money = (value) =>
  value === null || value === undefined
    ? '-'
    : `₹ ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function CompareInner() {
  const searchParams = useSearchParams();
  const rfqId = searchParams.get('rfqId') || '';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [data, setData] = useState(null);
  const [selection, setSelection] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [approved, setApproved] = useState(null);

  const load = useCallback(async () => {
    if (!rfqId) {
      setLoadError('An enquiry must be selected.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    try {
      const result = await getComparison(rfqId);
      setData(result);

      const existing = {};
      result.materials.forEach((material) => {
        const chosen = material.offers.find((offer) => offer.isSelected);
        if (chosen) existing[material.indentItemId] = chosen.quotationItemId;
      });
      setSelection(existing);
    } catch (error) {
      setLoadError(error.message || 'Failed to load the comparison.');
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    load();
  }, [load]);

  const materials = data?.materials || [];

  // Vendors quoted with the lowest overall value first — "prices lowest to highest".
  const vendorColumns = useMemo(() => {
    const vendors = data?.vendors || [];
    const quoted = vendors.filter((vendor) => vendor.quotationId).slice().sort((a, b) => (a.finalAmount || 0) - (b.finalAmount || 0));
    const pending = vendors.filter((vendor) => !vendor.quotationId);
    return [...quoted, ...pending];
  }, [data]);

  const offerFor = (material, vendorId) => material.offers.find((offer) => offer.vendorId === vendorId);

  const selectOffer = (indentItemId, quotationItemId) => {
    setSelection((prev) => ({ ...prev, [indentItemId]: quotationItemId }));
  };

  const autoSelectLowest = () => {
    const next = {};
    materials.forEach((material) => {
      const cheapest = material.offers.filter((offer) => offer.rate > 0)[0];
      if (cheapest) next[material.indentItemId] = cheapest.quotationItemId;
    });
    setSelection(next);
  };

  const clearSelection = () => setSelection({});

  const selectedCount = Object.keys(selection).length;
  const selectedValue = materials.reduce((total, material) => {
    const chosen = material.offers.find((offer) => offer.quotationItemId === selection[material.indentItemId]);
    return total + (chosen?.amount || 0);
  }, 0);

  const handleApprove = async () => {
    if (selectedCount === 0) {
      setSaveError('Select a quotation for at least one material.');
      return;
    }

    setSaving(true);
    setSaveError('');
    setApproved(null);

    try {
      const result = await approveSelection(
        rfqId,
        Object.values(selection).map((quotationItemId) => ({ quotationItemId }))
      );
      setApproved(result);
      await load();
    } catch (error) {
      setSaveError(error.message || 'Failed to approve the selection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="purchase-container">
      <div className="purchase-header">
        <div className="purchase-header-title">
          <GitCompare size={18} />
          Quotation Comparison {data?.rfq?.rfqNo ? `— ${data.rfq.rfqNo}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Quotation <ChevronRight size={14} /> Comparison
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <Link href="/purchase/quotation" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#17a2b8', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to quotations
        </Link>
        {data?.rfq && (
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            PR {data.rfq.indentNo || '-'} • {data.materials.length} materials • {vendorColumns.filter((v) => v.quotationId).length} quoted vendors
          </span>
        )}
      </div>

      {loadError && (
        <div className="purchase-card" style={{ borderLeft: '3px solid #ef4444' }}>
          <div className="purchase-card-body" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
            <AlertCircle size={16} /> {loadError}
          </div>
        </div>
      )}

      {approved && (
        <div className="purchase-card" style={{ borderLeft: '3px solid #10b981' }}>
          <div className="purchase-card-body" style={{ color: '#047857' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> Approved {approved.approvedLines} material line(s).
            </div>
            <div style={{ fontSize: '0.82rem', marginTop: '6px' }}>
              {approved.byVendor.map((entry) => `${entry.vendorName}: ${entry.lineCount} line(s)`).join(' • ')}
            </div>
          </div>
        </div>
      )}

      <div className="purchase-actions-bar">
        <div className="purchase-filters">
          <button type="button" className="btn-cyan" onClick={autoSelectLowest} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trophy size={14} /> Auto-select Lowest
          </button>
          <button type="button" className="btn-cyan" onClick={clearSelection} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            Clear Selection
          </button>
          <button type="button" className="btn-cyan" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.85rem', color: '#475569' }}>
            <strong>{selectedCount}</strong> of {materials.length} materials selected • {money(selectedValue)}
          </span>
          <button type="button" className="btn-cyan" onClick={handleApprove} disabled={saving} style={{ padding: '8px 24px' }}>
            {saving ? 'Approving...' : 'Approve Selection'}
          </button>
        </div>
      </div>

      {saveError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontSize: '0.85rem' }}>
          <AlertCircle size={15} /> {saveError}
        </div>
      )}

      {loading ? (
        <div className="purchase-card">
          <div className="purchase-card-body" style={{ color: '#64748b', fontSize: '0.85rem' }}>Building comparison...</div>
        </div>
      ) : vendorColumns.length === 0 ? (
        <div className="purchase-card">
          <div className="purchase-card-body" style={{ color: '#64748b', fontSize: '0.85rem' }}>
            No vendors were invited on this enquiry.
          </div>
        </div>
      ) : (
        <div className="purchase-table-wrapper">
          <table className="purchase-table">
            <thead>
              <tr>
                <th style={{ minWidth: '220px' }}>Material</th>
                <th style={{ width: '70px' }}>Unit</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Qty</th>
                {vendorColumns.map((vendor) => (
                  <th key={vendor.vendorId} style={{ minWidth: '170px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 600 }}>{vendor.vendorName}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 'normal', color: vendor.quotationId ? '#047857' : '#b45309' }}>
                      {vendor.quotationId ? money(vendor.finalAmount) : vendor.inviteStatus}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materials.map((material, index) => {
                const cheapest = material.offers.filter((offer) => offer.rate > 0)[0];

                return (
                  <tr key={material.indentItemId} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                    <td>
                      <div style={{ fontWeight: 500, color: '#0284c7' }}>{material.item}</div>
                      {material.specification && (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{material.specification}</div>
                      )}
                    </td>
                    <td>{material.unit}</td>
                    <td style={{ textAlign: 'right' }}>{material.quantity}</td>

                    {vendorColumns.map((vendor) => {
                      const offer = offerFor(material, vendor.vendorId);
                      const isChosen = offer && selection[material.indentItemId] === offer.quotationItemId;
                      const isLowest = offer && cheapest && offer.quotationItemId === cheapest.quotationItemId;

                      return (
                        <td
                          key={vendor.vendorId}
                          style={{
                            textAlign: 'center',
                            background: isChosen ? '#e0f2fe' : isLowest ? '#ecfdf5' : 'transparent'
                          }}
                        >
                          {!offer || offer.rate <= 0 ? (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          ) : (
                            <label style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input
                                  type="radio"
                                  name={`material-${material.indentItemId}`}
                                  checked={isChosen}
                                  onChange={() => selectOffer(material.indentItemId, offer.quotationItemId)}
                                  style={{ accentColor: '#17a2b8' }}
                                />
                                <span style={{ fontWeight: isLowest ? 700 : 500, color: isLowest ? '#047857' : '#334155' }}>
                                  {money(offer.rate)}
                                </span>
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{money(offer.amount)}</span>
                              {isLowest && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#047857' }}>LOWEST</span>
                              )}
                              {offer.brand && (
                                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{offer.brand}</span>
                              )}
                            </label>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="purchase-container">Loading comparison...</div>}>
      <CompareInner />
    </Suspense>
  );
}
