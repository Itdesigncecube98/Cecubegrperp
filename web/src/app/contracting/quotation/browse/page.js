'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Home, ChevronRight, FileSignature, Pencil, Trash2, RefreshCw, AlertCircle, Search, Plus, List } from 'lucide-react';
import QuotationEntryForm from '../QuotationEntryForm';
import '../../contracting.css';

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '-';
const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function QuotationBrowse() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState('browse');
  const [search, setSearch] = useState('');
  const [editingQuotationId, setEditingQuotationId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/contracting/quotation?_t=${Date.now()}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load quotations.');
      setQuotations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load quotations.');
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredQuotations = quotations.filter(quotation => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [
      quotation.quotationNo,
      quotation.contractorName,
      quotation.status,
      quotation.enquiry?.enquiryNo,
      quotation.enquiry?.projectName,
    ].some(value => String(value || '').toLowerCase().includes(query));
  });

  const handleQuotationSaved = () => {
    setActiveTab('browse');
    setEditingQuotationId('');
    load();
  };

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const handleDelete = async (quotation) => {
    if (!window.confirm(`Delete quotation ${quotation.quotationNo}?`)) return;
    setDeletingId(quotation.id);
    try {
      const response = await fetch('/api/contracting/quotation', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: quotation.id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete quotation.');
      setQuotations(current => current.filter(item => item.id !== quotation.id));
    } catch (err) {
      setError(err.message || 'Failed to delete quotation.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="contracting-container">
      <div className="contracting-header">
        <div className="contracting-header-title"><FileSignature size={18} /> Quotation Browse</div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Quotation Browse
        </div>
      </div>
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div role="tablist" aria-label="Quotation actions" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button type="button" role="tab" aria-selected={activeTab === 'browse'} className="btn-cyan" onClick={() => { setActiveTab('browse'); setEditingQuotationId(''); }}>
            <List size={14} /> Browse Quotations
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'create'} className="btn-cyan" onClick={() => { setEditingQuotationId(''); setActiveTab('create'); }}>
            <Plus size={14} /> Add Quotation
          </button>
        </div>
        {activeTab === 'create' ? (
          <QuotationEntryForm key={editingQuotationId || 'new'} quotationId={editingQuotationId} embedded onSaved={handleQuotationSaved} />
        ) : (
          <>
        {error && <div style={{ color: '#991b1b', background: '#fef2f2', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}><AlertCircle size={16} /> {error}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input type="search" className="contracting-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search quotation no., contractor, project, status..." style={{ paddingLeft: 36, width: '100%' }} />
          </div>
          <button type="button" className="btn-cyan" onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={14} /> Refresh</button>
        </div>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead style={{ background: '#f1f5f9' }}>
                <tr>{['Quotation No.', 'Contractor', 'Quotation Date', 'Valid Till', 'Items', 'Total', 'Status', 'Actions'].map(header => <th key={header} style={{ padding: '12px', textAlign: header === 'Total' ? 'right' : 'left', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>{header}</th>)}</tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading quotations...</td></tr> : filteredQuotations.length === 0 ? <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>{search ? 'No quotations match your search.' : 'No quotations found.'}</td></tr> : filteredQuotations.map((quotation, index) => {
                  const total = (quotation.items || []).reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
                  return <tr key={quotation.id} style={{ background: index % 2 ? '#fafafa' : 'white' }}>
                    <td style={{ padding: '11px 12px', fontWeight: 600, color: '#0f766e' }}>{quotation.quotationNo}</td>
                    <td style={{ padding: '11px 12px' }}>{quotation.contractorName}</td>
                    <td style={{ padding: '11px 12px' }}>{formatDate(quotation.quotationDate)}</td>
                    <td style={{ padding: '11px 12px' }}>{formatDate(quotation.validTill)}</td>
                    <td style={{ padding: '11px 12px' }}>{quotation.items?.length || 0}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(total)}</td>
                    <td style={{ padding: '11px 12px' }}>{quotation.status}</td>
                    <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                      <button type="button" title="Edit quotation" onClick={() => { setEditingQuotationId(quotation.id); setActiveTab('create'); }} style={{ border: 0, background: 'transparent', color: '#0369a1', marginRight: '12px', cursor: 'pointer', padding: 0 }}><Pencil size={16} /></button>
                      <button type="button" title="Delete quotation" onClick={() => handleDelete(quotation)} disabled={deletingId === quotation.id} style={{ border: 0, background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 0 }}><Trash2 size={16} /></button>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          </div>
            </>
          )}
        </div>
    </div>
  );
}
