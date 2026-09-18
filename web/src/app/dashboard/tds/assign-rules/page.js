'use client';

import React, { useState } from 'react';
import { Search, RotateCcw, Copy, AlignJustify, Save } from 'lucide-react';

const INITIAL_RULES = [
  { id: 1, type: 'Income Declaration (Sources Other Than Salary)', section: 'Income Other than Salary', item: 'Interest on Housing Loan', isApplicable: 'No', amountSpent: '' },
  { id: 2, type: 'Income Declaration (Sources Other Than Salary)', section: 'Income Other than Salary', item: 'Other Income', isApplicable: 'No', amountSpent: '' },
  { id: 3, type: 'Income Declaration (Sources Other Than Salary)', section: 'Section 24(B)', item: 'Housing Loan Intt', isApplicable: 'Yes', amountSpent: '150000' },
  { id: 4, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Edu Fee Paid', isApplicable: 'No', amountSpent: '' },
  { id: 5, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Fixed depo', isApplicable: 'No', amountSpent: '' },
  { id: 6, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'LIC', isApplicable: 'No', amountSpent: '' },
  { id: 7, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Mutual Fund', isApplicable: 'No', amountSpent: '' },
  { id: 8, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'NSC', isApplicable: 'No', amountSpent: '' },
  { id: 9, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Other', isApplicable: 'No', amountSpent: '' },
  { id: 10, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'PF', isApplicable: 'No', amountSpent: '' },
  { id: 11, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'PPF', isApplicable: 'No', amountSpent: '' },
  { id: 12, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Principal Repayment of Housing Loan', isApplicable: 'No', amountSpent: '' },
  { id: 13, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80C', item: 'Stamp Duty', isApplicable: 'No', amountSpent: '' },
  { id: 14, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80CCD', item: '80CCD', isApplicable: 'No', amountSpent: '' },
  { id: 15, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80CCD (1B)', item: '80CCD (1B) - 50000', isApplicable: 'No', amountSpent: '' },
  { id: 16, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80D', item: 'Mediclaim - 25000 - Parents', isApplicable: 'No', amountSpent: '' },
  { id: 17, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80D', item: 'Mediclaim - 25000 - Self', isApplicable: 'No', amountSpent: '' },
  { id: 18, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80D', item: 'Mediclaim - 50000 - Self & Citizen', isApplicable: 'No', amountSpent: '' },
  { id: 19, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80D', item: 'Mediclaim - 50000 - Sr Citizen Parents', isApplicable: 'No', amountSpent: '' },
  { id: 20, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80DD', item: 'Exp. Medical Treatment of physically handicapped', isApplicable: 'No', amountSpent: '' },
  { id: 21, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80E', item: 'Interest on Edu Loan', isApplicable: 'No', amountSpent: '' },
  { id: 22, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80EE', item: 'Interest on Housing Loan 80EE', isApplicable: 'No', amountSpent: '' },
  { id: 23, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80G', item: 'Donation - 100%', isApplicable: 'No', amountSpent: '' },
  { id: 24, type: 'Investment Declaration Under Chapter VI - A', section: 'Section 80G', item: 'Donation - 50%', isApplicable: 'No', amountSpent: '' },
  { id: 25, type: 'Income declaration (under Head Salary)', section: 'Section 17 (1) (Salary)', item: 'Bonus', isApplicable: 'No', amountSpent: '' },
  { id: 26, type: 'Income declaration (under Head Salary)', section: 'Section 17 (1) (Salary)', item: 'Gross Salary', isApplicable: 'No', amountSpent: '' },
  { id: 27, type: 'Income declaration (under Head Salary)', section: 'Section 17 (1) (Salary)', item: 'Incentive', isApplicable: 'No', amountSpent: '' },
  { id: 28, type: 'Income declaration (under Head Salary)', section: 'Section 17 (1) (Salary)', item: 'Leave Encashment', isApplicable: 'No', amountSpent: '' },
  { id: 29, type: 'Income declaration (under Head Salary)', section: 'Section 17 (1) (Salary)', item: 'LTA', isApplicable: 'No', amountSpent: '' },
  { id: 30, type: 'Exemptions under Section 10', section: 'Section 10 (13A)', item: 'HRA Exemption', isApplicable: 'No', amountSpent: '' },
  { id: 31, type: 'Exemptions under Section 10', section: 'Section 16 (1a)', item: 'Standard Deduction', isApplicable: 'No', amountSpent: '' },
  { id: 32, type: 'Exemptions under Section 10', section: 'Section 10 (14)(i)', item: 'LTA', isApplicable: 'No', amountSpent: '' },
  { id: 33, type: 'Exemptions under Section 10', section: 'Section 10 (14)', item: 'Conveyance', isApplicable: 'No', amountSpent: '' },
  { id: 34, type: 'Exemptions under Section 10', section: 'Section 10 (14)', item: 'Children Education Allowance', isApplicable: 'No', amountSpent: '' },
  { id: 35, type: 'Exemptions under Section 10', section: 'Section 10 (14)', item: 'Hostel Allowance', isApplicable: 'No', amountSpent: '' },
  { id: 36, type: 'Exemptions under Section 10', section: 'Section 17(2)', item: 'Medical Reimbursement', isApplicable: 'No', amountSpent: '' },
  { id: 37, type: 'Exemptions under Section 10', section: 'Section 16 (iii)', item: 'Professional Tax', isApplicable: 'No', amountSpent: '' },
];

export default function AssignRules() {
  const [rules, setRules] = useState(INITIAL_RULES);
  
  // Filter Inputs State
  const [filters, setFilters] = useState({ year: '2026-2027', type: '', section: '', head: '' });
  // Active Filters (applied on Search)
  const [activeFilters, setActiveFilters] = useState({ year: '2026-2027', type: '', section: '', head: '' });

  const uniqueTypes = [...new Set(INITIAL_RULES.map(r => r.type))];
  const uniqueSections = [...new Set(INITIAL_RULES.map(r => r.section))];
  const uniqueHeads = [...new Set(INITIAL_RULES.map(r => r.item))];

  const handleRuleChange = (id, field, value) => {
    setRules(prevRules => prevRules.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value };
        if (field === 'isApplicable' && value === 'No') {
          updated.amountSpent = '';
        }
        return updated;
      }
      return r;
    }));
  };

  const handleSearch = () => {
    setActiveFilters({ ...filters });
  };

  const handleReset = () => {
    const defaultFilters = { year: '2026-2027', type: '', section: '', head: '' };
    setFilters(defaultFilters);
    setActiveFilters(defaultFilters);
  };

  const filteredRules = rules.filter(r => {
    if (activeFilters.type && r.type !== activeFilters.type) return false;
    if (activeFilters.section && r.section !== activeFilters.section) return false;
    if (activeFilters.head && r.item !== activeFilters.head) return false;
    return true;
  });

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
          <select value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
            <option value="2026-2027">2026-2027</option>
          </select>
        </div>
        <div className="filter-group">
          <label>TDS type</label>
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">Select</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>TDS Section</label>
          <select value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })}>
            <option value="">Select</option>
            {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>TDS Head</label>
          <select value={filters.head} onChange={(e) => setFilters({ ...filters, head: e.target.value })}>
            <option value="">Select</option>
            {uniqueHeads.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        
        <div className="filter-actions" style={{ width: '100%', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }} onClick={handleReset}>
            <RotateCcw size={14} /> Reset
          </button>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }} onClick={handleSearch}>
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
              <th style={{ width: '120px' }}>Applicable?</th>
              <th style={{ width: '150px' }}>Amount Spent</th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.map((r) => (
              <tr key={r.id} style={{ backgroundColor: r.isApplicable === 'Yes' ? '#e0f2fe' : 'transparent' }}>
                <td style={{ color: 'var(--text-secondary)' }}>{r.type}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{r.section}</td>
                <td>{r.item}</td>
                <td>
                  <select 
                    className="table-input" 
                    style={{ width: '100%', padding: '0.3rem', borderColor: '#cbd5e1' }}
                    value={r.isApplicable}
                    onChange={(e) => handleRuleChange(r.id, 'isApplicable', e.target.value)}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>
                <td>
                  <input 
                    type="number" 
                    className="table-input" 
                    style={{ 
                      width: '100%', 
                      backgroundColor: r.isApplicable === 'No' ? '#f1f5f9' : 'white',
                      cursor: r.isApplicable === 'No' ? 'not-allowed' : 'text'
                    }} 
                    value={r.amountSpent}
                    onChange={(e) => handleRuleChange(r.id, 'amountSpent', e.target.value)}
                    disabled={r.isApplicable === 'No'}
                    placeholder={r.isApplicable === 'Yes' ? '0.00' : ''}
                  />
                </td>
              </tr>
            ))}
            {filteredRules.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No matching rules found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
