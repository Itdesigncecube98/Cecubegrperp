'use client';
import React, { useState } from 'react';
import { Home, ChevronRight, Save, Plus, RefreshCw, Printer, FileText, Shield } from 'lucide-react';
import '../../contracting.css';

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function ContractorInsurance() {
  return (
    <div className="contracting-container">
      
      <div className="contracting-header">
        <div className="contracting-header-title">
          <Shield size={18} />
          Insurance Policy Detail
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Insurance Policy Detail
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Policy Detail Section */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
            - Policy Detail
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              <FormGroup label="Contractor" required>
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              <FormGroup label="Project" required>
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              <FormGroup label="Policy Type" required>
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              <FormGroup label="Policy No" required>
                <input type="text" className="contracting-input" style={{ width: '100%' }} />
              </FormGroup>

              <FormGroup label="Start Date">
                <input type="date" className="contracting-input" defaultValue="2026-08-24" style={{ width: '100%' }} />
              </FormGroup>
              <FormGroup label="End Date">
                <input type="date" className="contracting-input" defaultValue="2026-08-24" style={{ width: '100%' }} />
              </FormGroup>
              <FormGroup label="No of Persons Insured">
                <input type="number" className="contracting-input" defaultValue="0" style={{ width: '100%' }} />
              </FormGroup>
              <FormGroup label="Contractor Working Status">
                <input type="text" className="contracting-input" defaultValue="Working" readOnly style={{ width: '100%', background: '#f8fafc' }} />
              </FormGroup>

              <FormGroup label="Location">
                <input type="text" className="contracting-input" style={{ width: '100%' }} />
              </FormGroup>
              <div style={{ gridColumn: 'span 3' }}>
                <FormGroup label="Remark">
                  <textarea className="contracting-input" style={{ width: '100%', height: '40px', resize: 'vertical' }}></textarea>
                </FormGroup>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn-cyan"><RefreshCw size={14} /> Reset</button>
              <button className="btn-cyan"><Plus size={14} /> New</button>
              <button className="btn-cyan"><Save size={14} /> Save</button>
            </div>
          </div>
        </div>

        {/* Document Upload Section */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>
            + Document Upload
          </div>
        </div>

        {/* Report Section */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
            - Report
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <input type="radio" name="policyDate" defaultChecked /> Policy Start Date
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <input type="radio" name="policyDate" /> Policy End Date
              </label>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              <FormGroup label="From">
                <input type="date" className="contracting-input" defaultValue="2026-08-24" style={{ width: '100%' }} />
              </FormGroup>
              <FormGroup label="To">
                <input type="date" className="contracting-input" defaultValue="2026-08-24" style={{ width: '100%' }} />
              </FormGroup>
              <FormGroup label="Policy Status">
                <select className="contracting-input" style={{ width: '100%' }}><option>All</option></select>
              </FormGroup>
              <FormGroup label="Contractor Working Status">
                <select className="contracting-input" style={{ width: '100%' }}><option>All</option></select>
              </FormGroup>
            </div>
            
            <button className="btn-cyan"><Printer size={14} /> Print <ChevronRight size={14} /></button>
          </div>
        </div>

      </div>
    </div>
  );
}
