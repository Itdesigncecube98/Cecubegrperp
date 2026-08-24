'use client';
import React, { useState } from 'react';
import { Home, ChevronRight, Search, RefreshCw, List, Printer, Check } from 'lucide-react';
import '../../contracting.css';

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function LabourRequisitionBrowse() {
  return (
    <div className="contracting-container">
      
      <div className="contracting-header">
        <div className="contracting-header-title">
          <List size={18} />
          Labour Requisition Browse
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Labour Requisition Browse
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Filter Section */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              
              <FormGroup label="Project" required>
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              
              <FormGroup label="WBS Filter">
                <div style={{ position: 'relative' }}>
                  <input type="text" className="contracting-input" placeholder="Select WBS Task" style={{ width: '100%', paddingRight: '30px' }} />
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </FormGroup>

              <FormGroup label="Labour Category">
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              
              <FormGroup label="Labour">
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>

              <FormGroup label="">
                <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#17a2b8', fontWeight: 600 }}>
                    <input type="radio" name="reqType" defaultChecked /> Requisition
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#17a2b8', fontWeight: 600 }}>
                    <input type="radio" name="reqType" /> Requirement
                  </label>
                </div>
              </FormGroup>

              <FormGroup label="Date Range" required>
                <div style={{ position: 'relative' }}>
                  <input type="text" className="contracting-input" defaultValue="01/01/1900 - 24/08/2026" style={{ width: '100%' }} />
                </div>
              </FormGroup>

              <FormGroup label="Requisition Status">
                <input type="text" className="contracting-input" placeholder="Select Here" style={{ width: '100%' }} />
              </FormGroup>
              
              <FormGroup label="Pending Status">
                <select className="contracting-input" style={{ width: '100%' }}><option>Select</option></select>
              </FormGroup>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn-cyan"><RefreshCw size={14} /> Reset</button>
              <button className="btn-cyan"><Search size={14} /> Search</button>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '16px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#ef4444' }}></div> Urgent</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#22c55e' }}></div> High</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#f97316' }}></div> Normal</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#eab308' }}></div> Low</div>
          </div>
        </div>

        {/* Empty space simulating results area */}
        <div style={{ height: '300px' }}></div>

        {/* Bottom Action Bar */}
        <div style={{ 
          position: 'fixed', bottom: 0, left: '260px', right: 0, 
          background: 'white', borderTop: '1px solid #e2e8f0', 
          padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <button className="btn-cyan"><Printer size={14} /> Print <ChevronRight size={14} /></button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: '#17a2b8', fontWeight: 600 }}>
            <span>Total Record Selected: 0</span>
            <span>Total Record: 0</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Select Status</span>
              <select className="contracting-input" style={{ width: '150px' }}><option>Select Status</option></select>
            </div>
            <button className="btn-cyan"><Check size={14} /> Apply Status</button>
          </div>
        </div>

      </div>
    </div>
  );
}
