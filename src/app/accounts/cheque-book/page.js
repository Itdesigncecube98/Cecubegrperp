'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, FileSearch, Plus, Search } from 'lucide-react';

const EMPTY_FILTERS = {
  bank: '',
  seriesName: '',
  status: '',
  chequeNo: '',
  statusDateFrom: '',
  statusDateTo: '',
  voucherDateFrom: '',
  voucherDateTo: ''
};

export default function ChequeBookBrowse() {
  const [banks, setBanks] = useState([]);
  const [cheques, setCheques] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entry, setEntry] = useState({ bank: '', seriesName: '', chequeNo: '', status: 'Issued', statusDate: new Date().toISOString().slice(0, 10), voucherDate: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    Promise.all([
      fetch('/api/synchronisation2/bank-names', { cache: 'no-store' }).then(response => response.ok ? response.json() : []),
      fetch('/api/accounts/cheque-book', { cache: 'no-store' }).then(response => response.ok ? response.json() : Promise.reject(new Error('Failed to load cheque book')))
    ])
      .then(([bankData, chequeData]) => {
        setBanks(bankData);
        setCheques(chequeData);
      })
      .catch(error => console.error('Failed to load cheque book:', error))
      .finally(() => setLoading(false));
  }, []);

  const addCheque = async (event) => {
    event.preventDefault();
    const response = await fetch('/api/accounts/cheque-book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || 'Failed to add cheque');
      return;
    }
    setCheques(current => [result, ...current]);
    setEntry(current => ({ ...current, chequeNo: '' }));
    setShowEntryForm(false);
  };

  const updateFilter = (field, value) => setFilters(current => ({ ...current, [field]: value }));
  const filteredCheques = useMemo(() => cheques.filter(cheque => {
    const matches = (value, filter) => !filter || String(value || '').toLowerCase().includes(filter.toLowerCase());
    const inDateRange = (value, from, to) => (!from || value >= from) && (!to || value <= to);
    return matches(cheque.bank, filters.bank) && matches(cheque.seriesName, filters.seriesName) &&
      matches(cheque.status, filters.status) && matches(cheque.chequeNo, filters.chequeNo) &&
      inDateRange(cheque.statusDate, filters.statusDateFrom, filters.statusDateTo) &&
      inDateRange(cheque.voucherDate, filters.voucherDateFrom, filters.voucherDateTo);
  }), [cheques, filters]);

  const inputStyle = { width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' };
  const labelStyle = { display: 'block', marginBottom: '6px', color: '#475569', fontSize: '0.75rem', fontWeight: 600 };

  return (
    <div style={{ padding: '24px', maxWidth: '1500px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Cheque Book Browse</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Browse cheque status and voucher dates by bank</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setShowEntryForm(current => !current)} style={{ display: 'flex', alignItems: 'center', gap: '7px', border: 'none', background: '#3b82f6', color: '#fff', padding: '9px 14px', borderRadius: '6px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}><Plus size={16} /> Add Cheque</button>
          <Link href="/dashboard/synchronisation2/bank-names" style={{ display: 'flex', alignItems: 'center', gap: '7px', textDecoration: 'none', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', padding: '9px 14px', borderRadius: '6px', fontWeight: 600, fontSize: '0.875rem' }}>Add Banks Configuration</Link>
        </div>
      </div>

      {showEntryForm && <form onSubmit={addCheque} style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '18px', marginBottom: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        <div><label style={labelStyle}>Bank *</label><select required value={entry.bank} onChange={event => setEntry({ ...entry, bank: event.target.value })} style={inputStyle}><option value="">Select bank</option>{banks.map(bank => <option key={bank.id} value={bank.name}>{bank.name}</option>)}</select></div>
        <div><label style={labelStyle}>Series Name *</label><input required value={entry.seriesName} onChange={event => setEntry({ ...entry, seriesName: event.target.value })} style={inputStyle} /></div>
        <div><label style={labelStyle}>Cheque No. *</label><input required value={entry.chequeNo} onChange={event => setEntry({ ...entry, chequeNo: event.target.value })} style={inputStyle} /></div>
        <div><label style={labelStyle}>Status</label><select value={entry.status} onChange={event => setEntry({ ...entry, status: event.target.value })} style={inputStyle}><option>Issued</option><option>Cleared</option><option>Cancelled</option><option>Bounced</option></select></div>
        <div><label style={labelStyle}>Status Date</label><input type="date" value={entry.statusDate} onChange={event => setEntry({ ...entry, statusDate: event.target.value })} style={inputStyle} /></div>
        <div><label style={labelStyle}>Voucher Date</label><input type="date" value={entry.voucherDate} onChange={event => setEntry({ ...entry, voucherDate: event.target.value })} style={inputStyle} /></div>
        <div style={{ display: 'flex', alignItems: 'end', gap: '8px' }}><button type="submit" style={{ padding: '9px 14px', border: 'none', borderRadius: '6px', background: '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Save Cheque</button><button type="button" onClick={() => setShowEntryForm(false)} style={{ padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancel</button></div>
      </form>}

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', marginBottom: '18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div><label style={labelStyle}>Select Bank</label><select value={filters.bank} onChange={event => updateFilter('bank', event.target.value)} style={inputStyle}><option value="">All Banks</option>{banks.map(bank => <option key={bank.id} value={bank.name}>{bank.name}</option>)}</select></div>
          <div><label style={labelStyle}>Series Name</label><input value={filters.seriesName} onChange={event => updateFilter('seriesName', event.target.value)} style={inputStyle} placeholder="Search series" /></div>
          <div><label style={labelStyle}>Status</label><select value={filters.status} onChange={event => updateFilter('status', event.target.value)} style={inputStyle}><option value="">All Statuses</option><option value="Issued">Issued</option><option value="Cleared">Cleared</option><option value="Cancelled">Cancelled</option><option value="Bounced">Bounced</option></select></div>
          <div><label style={labelStyle}>Cheque No.</label><input value={filters.chequeNo} onChange={event => updateFilter('chequeNo', event.target.value)} style={inputStyle} placeholder="Search cheque no." /></div>
          <div><label style={labelStyle}>Status Date From</label><input type="date" value={filters.statusDateFrom} onChange={event => updateFilter('statusDateFrom', event.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Status Date To</label><input type="date" value={filters.statusDateTo} onChange={event => updateFilter('statusDateTo', event.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Voucher Date From</label><input type="date" value={filters.voucherDateFrom} onChange={event => updateFilter('voucherDateFrom', event.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Voucher Date To</label><input type="date" value={filters.voucherDateTo} onChange={event => updateFilter('voucherDateTo', event.target.value)} style={inputStyle} /></div>
        </div>
        <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 13px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', color: '#334155', cursor: 'pointer' }}><Search size={15} /> Reset Filters</button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '15px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontWeight: 600 }}><FileSearch size={17} /> Cheque Register</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1050px' }}>
            <thead><tr style={{ background: '#e0f2fe', color: '#075985', textAlign: 'left', fontSize: '0.8rem' }}>
              {['Sr No.', 'Bank', 'Series Name', 'Cheque No.', 'Status', 'Status Date', 'Voucher Date', 'Action'].map(header => <th key={header} style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{header}</th>)}
            </tr></thead>
            <tbody>{loading ? <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading cheque book...</td></tr> : filteredCheques.length === 0 ? <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No cheque records found.</td></tr> : filteredCheques.map((cheque, index) => <tr key={cheque.id} style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: '13px 16px' }}>{index + 1}</td><td style={{ padding: '13px 16px' }}>{cheque.bank}</td><td style={{ padding: '13px 16px' }}>{cheque.seriesName}</td><td style={{ padding: '13px 16px' }}>{cheque.chequeNo}</td><td style={{ padding: '13px 16px' }}>{cheque.status}</td><td style={{ padding: '13px 16px' }}>{cheque.statusDate}</td><td style={{ padding: '13px 16px' }}>{cheque.voucherDate}</td><td style={{ padding: '13px 16px' }}><button type="button" onClick={() => alert(`Viewing cheque ${cheque.chequeNo}`)} style={{ padding: '6px 10px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '5px', cursor: 'pointer' }}><CalendarDays size={14} /></button></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
