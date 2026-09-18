'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Filter, RefreshCw, Search } from 'lucide-react';
import '../../purchase.css';

const numberFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 });
const moneyFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

const formatNumber = (value) => numberFormat.format(Number(value) || 0);
const formatMoney = (value, currency = 'INR') => {
  const amount = Number(value) || 0;
  return `${currency === 'INR' ? '₹' : currency} ${moneyFormat.format(amount)}`;
};

const getReceivedQuantity = (po, itemId) => (po.grns || []).reduce((total, grn) => (
  total + (grn.items || [])
    .filter(grnItem => grnItem.poItemId === itemId)
    .reduce((sum, grnItem) => sum + (Number(grnItem.receivedQty) || 0), 0)
), 0);

const getRows = (pos) => pos.flatMap(po => (po.items || []).map(item => {
  const quantity = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const discount = Number(item.discount) || 0;
  const taxableAmount = Math.max((quantity * rate) - discount, 0);
  const taxPercent = Number(item.gstPercent) || 0;

  return {
    id: `${po.id}-${item.id}`,
    poId: po.id,
    poNo: po.poNo,
    poDate: po.poDate,
    vendorId: po.vendorId,
    vendorName: po.vendor?.name || 'Unknown vendor',
    vendorCode: po.vendor?.vendorCode || '',
    materialCategory: item.materialCategory || '-',
    materialName: item.item || '-',
    brand: item.brand || '-',
    quantity,
    receivedQuantity: getReceivedQuantity(po, item.id),
    rate,
    discountPercent: quantity && rate ? (discount / (quantity * rate)) * 100 : 0,
    netRate: quantity ? taxableAmount / quantity : rate,
    taxScheme: taxPercent ? `GST ${formatNumber(taxPercent)}%` : '-',
    taxAmount: taxableAmount * (taxPercent / 100),
    status: po.status || '-',
    poDetailId: item.id,
    currency: po.currency || 'INR',
    tcCf: item.tcCf || '-',
    tcRate: item.tcRate || '-',
    conversionFactor: item.conversionFactor || '-',
    originalQuantity: item.originalQuantity ?? quantity,
    specification: item.specification || '-'
  };
}));

export default function POMaterialBrowse() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('All');

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/purchase/po', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load purchase orders');
      setPos(await response.json());
    } catch (error) {
      console.error('Failed to load PO material browse', error);
      setPos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadData();
    })();
  }, []);

  const vendors = useMemo(() => {
    const uniqueVendors = new Map();
    pos.forEach(po => {
      if (po.vendorId) uniqueVendors.set(po.vendorId, po.vendor?.name || 'Unknown vendor');
    });
    return [...uniqueVendors.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [pos]);

  const rows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return getRows(pos).filter(row => {
      const matchesVendor = vendorFilter === 'All' || row.vendorId === vendorFilter;
      const searchable = [row.poNo, row.vendorName, row.vendorCode, row.materialName, row.specification, row.status]
        .join(' ')
        .toLowerCase();
      return matchesVendor && (!query || searchable.includes(query));
    });
  }, [pos, searchTerm, vendorFilter]);

  return (
    <div className="pur-page-container">
      <div className="pur-header">
        <div>
          <h1 className="pur-title">PO Material Browse</h1>
          <p className="pur-subtitle">Material-wise purchase order details by vendor</p>
        </div>
        <Link href="/purchase/po" className="pur-btn pur-btn-outline">
          <ArrowLeft size={16} /> PO Register
        </Link>
      </div>

      <div className="pur-card">
        <div className="pur-toolbar">
          <div className="pur-search" style={{ minWidth: '280px' }}>
            <Search className="pur-search-icon" size={16} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search PO, vendor, material..."
              className="pur-search-input"
            />
          </div>
          <div className="pur-flex pur-items-center" style={{ gap: '10px' }}>
            <Filter size={16} className="pur-text-muted" />
            <select className="pur-select" value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)}>
              <option value="All">All Vendors</option>
              {vendors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <button type="button" className="pur-icon-btn" title="Refresh" onClick={loadData} disabled={loading}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="pur-text-xs pur-text-muted" style={{ marginBottom: '12px' }}>
          {rows.length} material line{rows.length === 1 ? '' : 's'}
        </div>

        <div className="pur-table-wrapper" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div className="pur-loading"><div className="pur-spinner"></div></div>
          ) : (
            <table className="pur-table" style={{ minWidth: '2200px' }}>
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>PO No</th>
                  <th>Material Category</th>
                  <th>Material Name</th>
                  <th>Brand</th>
                  <th>Qty</th>
                  <th>Received Qty</th>
                  <th>Rate</th>
                  <th>Discount %</th>
                  <th>Net Rate</th>
                  <th>Tax Scheme</th>
                  <th>Tax Amount</th>
                  <th>Status</th>
                  <th>PO Detail ID</th>
                  <th>T Curr</th>
                  <th>TC CF</th>
                  <th>TC Rate</th>
                  <th>Conversion Factor</th>
                  <th>Original Quantity</th>
                  <th>Specification</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td>
                      <div className="pur-font-medium">{row.vendorName}</div>
                      <div className="pur-text-xs pur-text-muted">{row.vendorCode || '-'}</div>
                    </td>
                    <td>
                      <div className="pur-font-semibold">{row.poNo}</div>
                      <div className="pur-text-xs pur-text-muted">{row.poDate ? new Date(row.poDate).toLocaleDateString() : '-'}</div>
                    </td>
                    <td>{row.materialCategory}</td>
                    <td className="pur-font-medium">{row.materialName}</td>
                    <td>{row.brand}</td>
                    <td>{formatNumber(row.quantity)}</td>
                    <td>{formatNumber(row.receivedQuantity)}</td>
                    <td>{formatMoney(row.rate, row.currency)}</td>
                    <td>{formatNumber(row.discountPercent)}%</td>
                    <td>{formatMoney(row.netRate, row.currency)}</td>
                    <td>{row.taxScheme}</td>
                    <td>{formatMoney(row.taxAmount, row.currency)}</td>
                    <td><span className="pur-badge pur-badge-amber">{row.status}</span></td>
                    <td className="pur-text-xs">{row.poDetailId}</td>
                    <td>{row.currency}</td>
                    <td>{row.tcCf}</td>
                    <td>{row.tcRate}</td>
                    <td>{row.conversionFactor}</td>
                    <td>{formatNumber(row.originalQuantity)}</td>
                    <td style={{ maxWidth: '280px', whiteSpace: 'normal' }}>{row.specification}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan="20" className="pur-text-center pur-text-muted pur-py-8">No PO material lines found.</td>
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
