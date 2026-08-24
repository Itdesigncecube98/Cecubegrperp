'use client';
import React from 'react';
import { Search, RefreshCw, UploadCloud, CheckCircle, FileDown } from 'lucide-react';

export default function PostSalary() {
  const mockData = [
    { id: 1, name: 'Karamvir Singh', loc: 'METL Project Office', credit: '50000.00', debit: '2000.00', net: '48000.00', tds: '500.00', budgetHead: 'Ops', remark: 'On Time' },
    { id: 2, name: 'Aayushee Varshney', loc: 'General Admin', credit: '45000.00', debit: '0.00', net: '45000.00', tds: '250.00', budgetHead: 'Admin', remark: '' }
  ];

  return (
    <div>
      <div className="filter-bar">
        <div className="filter-group">
          <label>Department</label>
          <select><option>Select Here</option></select>
        </div>
        <div className="filter-group">
          <label>Location</label>
          <select><option>Select Here</option></select>
        </div>
        <div className="filter-group">
          <label>Employee</label>
          <select><option>Select Here</option></select>
        </div>
        <div className="filter-group">
          <label>Salary Month</label>
          <input type="month" defaultValue="2026-07" />
        </div>
      </div>

      <div className="filter-bar" style={{ marginTop: '-0.5rem', borderBottom: '1px solid var(--pay-glass-border)', paddingBottom: '1rem', alignItems: 'center' }}>
        <div className="checkbox-group">
          <input type="checkbox" id="unposted" defaultChecked />
          <label htmlFor="unposted">Show Unposted Only</label>
        </div>

        <div className="filter-actions">
          <button className="btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <RefreshCw size={16} /> Reset
          </button>
          <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Search size={16} /> Search
          </button>
        </div>
      </div>

      <div className="summary-badges" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
            <UploadCloud size={16} /> Post Salary
          </button>
          <div className="summary-badge green" style={{ gap: '0.5rem' }}>
            <CheckCircle size={16} /> Ready to Post: 2
          </div>
          <button className="btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderColor: 'var(--pay-primary)', color: 'var(--pay-primary)' }}>
            <FileDown size={16} /> Export To excel
          </button>
        </div>
        
        <div className="pagination-controls" style={{ marginTop: 0 }}>
          <span>Show Rows:</span>
          <select defaultValue="40"><option>40</option><option>100</option></select>
          <span>Page: 1 of 1</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>Go</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>{'<<'}</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>{'<'}</button>
            <button className="btn-primary" style={{ padding: '0.25rem 0.5rem' }}>1</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>{'>'}</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>{'>>'}</button>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--pay-glass-border)', borderRadius: '12px' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" /></th>
              <th>emp name</th>
              <th>location/cost cenetr</th>
              <th>credit amount</th>
              <th>debit amount</th>
              <th>net salary</th>
              <th>tds</th>
              <th>budget head</th>
              <th>individual posting remark</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map(row => (
              <tr key={row.id}>
                <td><input type="checkbox" /></td>
                <td style={{ color: 'var(--pay-primary)', fontWeight: '600' }}>{row.name}</td>
                <td>{row.loc}</td>
                <td style={{ color: '#10b981', fontWeight: '500' }}>{row.credit}</td>
                <td style={{ color: '#ef4444', fontWeight: '500' }}>{row.debit}</td>
                <td style={{ fontWeight: '700' }}>{row.net}</td>
                <td>{row.tds}</td>
                <td>{row.budgetHead}</td>
                <td>
                  <input type="text" defaultValue={row.remark} style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', width: '100%', fontSize: '0.85rem' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
