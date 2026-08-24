'use client';
import React from 'react';
import { Search, RefreshCw, FileDown } from 'lucide-react';

export default function ArrearsCalculation() {
  const mockData = [
    { id: 1, name: 'Harmesh Kumar', dept: 'Human Resource Management', month: '01 Jul 2026', paidIn: '01 Jun 2026', type: 'Month-wise Arrears', days: '0', earning: '0', deduction: '0', net: '0' }
  ];

  return (
    <div>
      <div className="filter-bar">
        <div className="filter-group">
          <label>Department</label>
          <select><option>Select</option></select>
        </div>
        <div className="filter-group">
          <label>Employee</label>
          <select><option>Harmesh Kumar [Assistant Manager HR] - CEIPL0...</option></select>
        </div>
        <div className="filter-group">
          <label>Arrears Payslip <span style={{ color: 'red' }}>*</span></label>
          <select><option>01 Jul 2026 To 31 Jul 2026</option></select>
        </div>
        <div className="filter-group">
          <label>Paid Payslip <span style={{ color: 'red' }}>*</span></label>
          <select><option>01 Jun 2026 To 30 Jun 2026</option></select>
        </div>
      </div>

      <div className="filter-bar" style={{ marginTop: '-0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', alignItems: 'center' }}>
        <div className="filter-group" style={{ maxWidth: '250px' }}>
          <label>Arrears Status</label>
          <select><option>Calculate</option></select>
        </div>
        
        <div className="filter-group" style={{ flex: 2 }}>
          <label>Arrears Type</label>
          <div className="radio-group" style={{ marginTop: '0.25rem' }}>
            <label>
              <input type="radio" name="arrearsType" value="days" />
              Days-wise Arrears
              <input type="text" value="0" readOnly style={{ width: '40px', textAlign: 'center', height: '28px', backgroundColor: '#f1f5f9' }} />
            </label>
            <label>
              <input type="radio" name="arrearsType" value="months" defaultChecked />
              Month-wise Arrears
            </label>
          </div>
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
          <div className="summary-badge" style={{ backgroundColor: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd' }}>
            Total Records: 1
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

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" title="Select All" /></th>
              <th>emp name</th>
              <th>dept</th>
              <th>arrears paid in</th>
              <th>arrears days</th>
              <th>totalearning</th>
              <th>total deduction</th>
              <th>net salary</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map(row => (
              <tr key={row.id}>
                <td><input type="checkbox" /></td>
                <td style={{ color: 'var(--primary-color)', fontWeight: '500' }}>{row.name}</td>
                <td>{row.dept}</td>
                <td>{row.paidIn}</td>
                <td>{row.days}</td>
                <td>{row.earning}</td>
                <td>{row.deduction}</td>
                <td>{row.net}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
