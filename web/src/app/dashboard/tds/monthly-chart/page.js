'use client';

import React, { useState } from 'react';
import { Search, RotateCcw, FileDown, Unlock, Lock } from 'lucide-react';

export default function MonthlyChart() {
  const [data] = useState([
    { empNo: 'CEIPL084', name: 'Aayushee Varshney', dept: 'General Administration', position: 'Design Engineer', total: '0.00', months: Array(12).fill('0.00') },
    { empNo: 'CEIPL085', name: 'Abhijit Chatterjee', dept: 'General Administration', position: 'Manager - E&C', total: '0.00', months: Array(12).fill('0.00') }
  ]);

  const monthsHeader = ['Apr-2026', 'May-2026', 'Jun-2026', 'Jul-2026', 'Aug-2026', 'Sep-2026', 'Oct-2026', 'Nov-2026', 'Dec-2026', 'Jan-2027', 'Feb-2027', 'Mar-2027'];

  return (
    <div>
      <div className="filter-bar">
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
          <label>Employee</label>
          <select defaultValue="">
            <option value="">Select Here</option>
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

      <div className="action-bar" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ backgroundColor: '#e0f2fe', color: 'var(--tds-primary)', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
            Total Records: 135
          </div>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }}>
            <FileDown size={14} /> Export to excel
          </button>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }}>
            <Unlock size={14} /> Unfreeze TDS details
          </button>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }}>
            <Lock size={14} /> Freeze TDS details
          </button>
          <label className="checkbox-inline" style={{ marginLeft: '0.5rem' }}><input type="checkbox" /> Actual TDS</label>
          <label className="checkbox-inline"><input type="checkbox" /> Estimated TDS</label>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
          <span>Show Rows: </span>
          <select className="table-input" style={{ width: '60px', height: '28px' }}>
            <option>40</option>
          </select>
          <span style={{ marginLeft: '1rem' }}>Page: 1 of 4</span>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9', padding: '0.2rem 0.5rem', height: '28px' }}>Go</button>
          <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
            <button style={{ padding: '0.2rem 0.5rem', background: 'white', border: 'none', borderRight: '1px solid #cbd5e1' }}>&lt;&lt;</button>
            <button style={{ padding: '0.2rem 0.5rem', background: 'white', border: 'none', borderRight: '1px solid #cbd5e1' }}>&lt;</button>
            <button style={{ padding: '0.2rem 0.6rem', background: '#0ea5e9', color: 'white', border: 'none', borderRight: '1px solid #cbd5e1' }}>1</button>
            <button style={{ padding: '0.2rem 0.6rem', background: 'white', border: 'none', borderRight: '1px solid #cbd5e1' }}>2</button>
            <button style={{ padding: '0.2rem 0.6rem', background: 'white', border: 'none', borderRight: '1px solid #cbd5e1' }}>3</button>
            <button style={{ padding: '0.2rem 0.5rem', background: 'white', border: 'none', borderRight: '1px solid #cbd5e1' }}>&gt;</button>
            <button style={{ padding: '0.2rem 0.5rem', background: 'white', border: 'none' }}>&gt;&gt;</button>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: '1600px' }}>
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}><input type="checkbox" /></th>
              <th style={{ width: '100px' }}>Emp No</th>
              <th style={{ width: '180px' }}>Name</th>
              <th style={{ width: '200px' }}>Department</th>
              <th style={{ width: '180px' }}>Position</th>
              <th style={{ width: '100px', textAlign: 'right' }}>Total TDS</th>
              {monthsHeader.map(m => (
                <th key={m} style={{ width: '80px', textAlign: 'right', fontSize: '0.7rem' }}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center' }}><input type="checkbox" /></td>
                <td style={{ color: 'var(--text-secondary)' }}>{r.empNo}</td>
                <td>{r.name}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{r.dept}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{r.position}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.total}</td>
                {r.months.map((m, idx) => (
                  <td key={idx} style={{ textAlign: 'right', backgroundColor: '#fee2e2', color: 'var(--text-secondary)' }}>{m}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
