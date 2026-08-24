'use client';
import React from 'react';
import { Home, ChevronRight, Search, RefreshCw, FileText } from 'lucide-react';
import '../../contracting.css';

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function RABillGeneration() {
  return (
    <div className="contracting-container">
      
      <div className="contracting-header">
        <div className="contracting-header-title">
          <FileText size={18} />
          RA Bill Generation
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> RA Bill Generation
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
          
          {/* Form Area */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <FormGroup label="Project" required>
                  <select className="contracting-input" style={{ width: '100%' }}><option>-- Select Project --</option></select>
                </FormGroup>
              </div>
              <FormGroup label="Contractor" required>
                <select className="contracting-input" style={{ width: '100%' }}><option>-- Select Contractor --</option></select>
              </FormGroup>
              <FormGroup label="WO No" required>
                <select className="contracting-input" style={{ width: '100%' }}><option></option></select>
              </FormGroup>
              <FormGroup label="WBS">
                <div style={{ position: 'relative' }}>
                  <input type="text" className="contracting-input" defaultValue="All" style={{ width: '100%', paddingRight: '30px' }} />
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </FormGroup>

              <FormGroup label="State">
                <select className="contracting-input" style={{ width: '100%' }}><option></option></select>
              </FormGroup>
              <div style={{ gridColumn: 'span 2' }}>
                <FormGroup label="Date Range" required>
                  <input type="text" className="contracting-input" defaultValue="01/01/1900 - 24/08/2026" style={{ width: '100%' }} />
                </FormGroup>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn-cyan"><RefreshCw size={14} /> Reset</button>
              <button className="btn-cyan"><Search size={14} /> Search</button>
            </div>
          </div>

          {/* Information Panel */}
          <div style={{ border: '1px solid #93c5fd', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ background: '#bfdbfe', padding: '8px 16px', textAlign: 'center', fontWeight: 600, color: '#1e3a8a', fontSize: '0.9rem' }}>
              Information
            </div>
            <div style={{ padding: '16px', background: '#eff6ff', fontSize: '0.8rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Project Budget :</span>
                <span>Contractor PAN :</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Contractor MSME No. :</span>
                <span>Contractor IT Declaration :</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Executed By MSME No. :</span>
                <span>State Registered No. :</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
