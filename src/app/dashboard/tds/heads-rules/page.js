'use client';

import React, { useState } from 'react';
import { Maximize2, MoveDiagonal, Plus, Save, Trash2, Search, ChevronRight, ChevronDown, Tag } from 'lucide-react';

export default function HeadsRules() {
  const [expanded, setExpanded] = useState({ root: true });

  const toggleExpand = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const constants = [
    { name: '@C01', remark: 'Gross Salary', type: 'Salary Head' },
    { name: '@C02', remark: 'Employer PF', type: 'Salary Head' },
    { name: '@E01', remark: 'VDA', type: 'Salary Head' },
    { name: '@E02', remark: 'Conveyance', type: 'Salary Head' },
    { name: '@E03', remark: 'Special Conveyance', type: 'Salary Head', active: true },
    { name: '@E04', remark: 'Basic', type: 'Salary Head' },
    { name: '@E05', remark: 'HRA', type: 'Salary Head' },
    { name: '@E06', remark: 'Other Allowance', type: 'Salary Head' },
  ];

  return (
    <div className="three-col-layout">
      {/* Column 1: Tree View */}
      <div className="panel">
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
          <input 
            type="text" 
            className="table-input" 
            placeholder="Income Declaration..." 
            style={{ flex: 1 }} 
          />
          <button className="btn-primary" style={{ padding: '0.25rem 0.5rem', height: 'auto' }}><Maximize2 size={14}/></button>
          <button className="btn-primary" style={{ padding: '0.25rem 0.5rem', height: 'auto' }}><MoveDiagonal size={14}/></button>
          <button className="btn-primary" style={{ padding: '0.25rem 0.5rem', height: 'auto' }}><Plus size={14}/></button>
        </div>

        <div style={{ fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '0.5rem' }} onClick={() => toggleExpand('root')}>
            {expanded.root ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span style={{ marginLeft: '4px', fontWeight: 500 }}>Income Declaration (Sources Other...</span>
          </div>
          
          {expanded.root && (
            <div style={{ marginLeft: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <ChevronRight size={14} style={{ color: 'transparent' }} />
                <Tag size={12} style={{ margin: '0 4px', color: 'var(--tds-primary)' }}/>
                <span style={{ color: 'var(--text-secondary)' }}>Income Other than Salary</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <ChevronRight size={14} style={{ color: 'transparent' }} />
                <Tag size={12} style={{ margin: '0 4px', color: 'var(--tds-primary)' }}/>
                <span style={{ color: 'var(--text-secondary)' }}>Section 24(B)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column 2: Form */}
      <div className="panel">
        <div className="panel-header">Add TDS rules</div>
        
        <div className="filter-group">
          <label>Item Name <span style={{color: 'red'}}>*</span></label>
          <input type="text" placeholder="Item Name" defaultValue="Item Name" />
        </div>

        <div className="checkbox-row">
          <label className="checkbox-inline"><input type="checkbox" /> Active</label>
          <label className="checkbox-inline"><input type="checkbox" /> Monthly</label>
          <label className="checkbox-inline"><input type="checkbox" /> Qualifying Amount</label>
        </div>

        <div className="filter-group">
          <label>Final Amount Formula</label>
          <textarea className="table-input" style={{ height: '60px', resize: 'vertical' }}></textarea>
        </div>

        <div className="filter-group">
          <label>Remark</label>
          <textarea className="table-input" style={{ height: '60px', resize: 'vertical' }}></textarea>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
          <button className="btn-primary" style={{ backgroundColor: '#0f766e' }}>
            <Trash2 size={14} /> Delete
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" style={{ backgroundColor: '#0f766e' }}>
              <Save size={14} /> Save
            </button>
            <button className="btn-primary" style={{ backgroundColor: '#0f766e' }}>
              <Plus size={14} /> Add TDS rule
            </button>
          </div>
        </div>
      </div>

      {/* Column 3: Constants List */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', flex: 1 }}>TDS Constant</span>
          <div style={{ position: 'relative', width: '140px' }}>
            <input type="text" className="table-input" placeholder="Search.." />
          </div>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: '400px' }}>
          <table>
            <thead>
              <tr>
                <th style={{ borderRadius: 0 }}>Name</th>
                <th>Remark</th>
                <th style={{ borderRadius: 0 }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {constants.map((c, i) => (
                <tr key={i} style={{ backgroundColor: c.active ? '#e0f2fe' : 'transparent' }}>
                  <td style={{ color: 'var(--tds-primary)' }}>{c.name}</td>
                  <td style={{ fontSize: '0.75rem' }}>{c.remark}</td>
                  <td style={{ fontSize: '0.75rem' }}>{c.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
