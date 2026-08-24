'use client';
import React, { useState } from 'react';
import { Home, ChevronRight, Search, RefreshCw, Users, FileText } from 'lucide-react';
import '../../contracting.css';

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function LabourRequisition() {
  return (
    <div className="contracting-container">
      
      <div className="contracting-header">
        <div className="contracting-header-title">
          <FileText size={18} />
          Labour Requisition
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Labour Requisition
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Filter Section */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
            - Filter
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              
              <FormGroup label="Project" required>
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              
              <FormGroup label="Labour Category">
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              
              <FormGroup label="Labour">
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              
              <FormGroup label="WBS Filter">
                <div style={{ position: 'relative' }}>
                  <input type="text" className="contracting-input" placeholder="Select WBS Task" style={{ width: '100%', paddingRight: '30px' }} />
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </FormGroup>

              <FormGroup label="From Date">
                <input type="date" className="contracting-input" defaultValue="2026-07-25" style={{ width: '100%' }} />
              </FormGroup>
              
              <FormGroup label="To Date">
                <input type="date" className="contracting-input" defaultValue="2026-08-25" style={{ width: '100%' }} />
              </FormGroup>

              <FormGroup label="Group By">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#334155' }}>
                    <input type="radio" name="groupBy" defaultChecked /> Labour
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#334155' }}>
                    <input type="radio" name="groupBy" /> Task
                  </label>
                </div>
              </FormGroup>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', gridColumn: 'span 1' }}>
                <button className="btn-cyan"><RefreshCw size={14} /> Reset</button>
                <button className="btn-cyan"><Search size={14} /> Search</button>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
