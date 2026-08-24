'use client';

import React, { useState } from 'react';
import { Search, RotateCcw, Copy, AlignJustify, Save } from 'lucide-react';

export default function AssignRules() {
  const [rules] = useState([
    { type: 'Income Declaration (Sources Other Than Salary)', section: 'Income Other than Salary', item: 'Interest on Housing Loan', selected: false },
    { type: 'Income Declaration (Sources Other Than Salary)', section: 'Income Other than Salary', item: 'Other Income', selected: false },
    { type: 'Income Declaration (Sources Other Than Salary)', section: 'Section 24(B)', item: 'Housing Loan Intt', selected: true },
    { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Edu Fee Paid', selected: false },
    { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Fixed depo', selected: false },
    { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'LIC', selected: false },
    { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Mutual Fund', selected: false },
    { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'NSC', selected: false },
    { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Other', selected: false },
    { type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'PF', selected: false },
  ]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem', position: 'relative', zIndex: 1 }}>
        <button className="btn-primary" style={{ backgroundColor: '#0f766e' }}>
          <Copy size={14} /> Copy TDS Rules
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
          <label>TDS type</label>
          <select defaultValue="">
            <option value="">Select</option>
          </select>
        </div>
        <div className="filter-group">
          <label>TDS Section</label>
          <select defaultValue="">
            <option value="">Select</option>
          </select>
        </div>
        <div className="filter-group">
          <label>TDS Head</label>
          <select defaultValue="">
            <option value="">Select</option>
          </select>
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
            <AlignJustify size={14} /> Set Default Rules
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
              <th>TDS Rules</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r, i) => (
              <tr key={i} style={{ backgroundColor: r.selected ? '#e0f2fe' : 'transparent' }}>
                <td style={{ color: 'var(--text-secondary)' }}>{r.type}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{r.section}</td>
                <td>{r.item}</td>
                <td>
                  <input type="text" className="table-input" style={{ width: '200px' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
