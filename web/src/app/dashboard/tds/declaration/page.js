'use client';

import React, { useState } from 'react';
import { Search, RotateCcw, Copy, FileDown, Save, FileText, Upload } from 'lucide-react';

export default function Declaration() {
  const [data] = useState([
    { type: 'Exemptions under Section 10', section: 'Section 10 (13A)', item: 'HRA Exemption', actual: '0', qualifying: '0', final: '0', hasMonthly: true },
    { type: 'Exemptions under Section 10', section: 'Section 10(14)', item: 'Conveyance', actual: '0', qualifying: '0', final: '0', hasMonthly: false },
    { type: 'Exemptions under Section 10', section: 'Section 10(14)', item: 'Education Allowance', actual: '0', qualifying: '0', final: '0', hasMonthly: false },
    { type: 'Exemptions under Section 10', section: 'Section 10(14)', item: 'Hostel Allowance', actual: '0', qualifying: '0', final: '0', hasMonthly: false },
    { type: 'Exemptions under Section 10', section: 'Section 17(2)', item: 'Medical Reibursement', actual: '0', qualifying: '0', final: '0', hasMonthly: false },
    { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Principal Repayment of Housing Loan', actual: '0', qualifying: '0', final: '0', hasMonthly: false },
    { type: 'Exemptions under Section 10', section: 'Section 10(10A)', item: 'Standard Deduction', actual: '0', qualifying: '0', final: '0', hasMonthly: false },
    { type: 'Exemptions under Section 10', section: 'Section 10(10AA)', item: 'LTA', actual: '0', qualifying: '0', final: '0', hasMonthly: false },
    { type: 'Exemptions under Section 16', section: 'Section 16(iii)', item: 'Profession Tax', actual: '0', qualifying: '0', final: '0', hasMonthly: false },
  ]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem', position: 'relative', zIndex: 1 }}>
        <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }}>
          <Copy size={14} /> Copy to next year
        </button>
      </div>

      <div className="filter-bar" style={{ marginTop: '0.5rem' }}>
        <div style={{ width: '100%', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Filter Criteria
        </div>
        <div className="filter-group">
          <label>Financial Year</label>
          <select defaultValue="2026-2027">
            <option value="2026-2027">2026-2027</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Department</label>
          <select defaultValue="">
            <option value="">Select Here</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Employee <span style={{color: 'red'}}>*</span></label>
          <select defaultValue="Aayushee">
            <option value="Aayushee">Aayushee Varshney - CEIPL084</option>
          </select>
        </div>
        <div className="filter-group">
          <label>PAN/PAYE No.</label>
          <input type="text" defaultValue="AXHPV5446R" readOnly style={{ backgroundColor: '#f8fafc' }} />
        </div>
        
        <div className="filter-actions" style={{ width: '100%', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }}>
            <RotateCcw size={14} /> Reset
          </button>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }}>
            <Search size={14} /> Search
          </button>
        </div>
      </div>

      <div className="action-bar">
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: 0 }}>Result</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-primary" style={{ backgroundColor: '#0f766e' }}>
            <FileText size={14} /> Import From Salary
          </button>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }}>
            <FileDown size={14} /> Export to excel
          </button>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }}>
            <Save size={14} /> Save
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>TDS Type</th>
              <th>TDS Section</th>
              <th>Item Name</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Actual Amount</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Qualifying Amount</th>
              <th style={{ width: '100px', textAlign: 'right' }}>Final Amount</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Monthly</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i}>
                <td style={{ color: 'var(--text-secondary)' }}>{r.type}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{r.section}</td>
                <td>{r.item}</td>
                <td>
                  <input type="text" className="table-input" style={{ textAlign: 'right' }} defaultValue={r.actual} />
                </td>
                <td>
                  <input type="text" className="table-input" style={{ textAlign: 'right' }} defaultValue={r.qualifying} />
                </td>
                <td style={{ textAlign: 'right', fontWeight: 500 }}>{r.final}</td>
                <td style={{ textAlign: 'center' }}>
                  {r.hasMonthly && (
                    <button className="icon-btn" title="Monthly Details">
                      <FileText size={16} />
                    </button>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className="icon-btn" title="Upload Document">
                    <Upload size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
