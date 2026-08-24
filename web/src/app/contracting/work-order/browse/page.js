'use client';
import React, { useState } from 'react';
import { Home, ChevronRight, Search, RefreshCw, FileText, Printer } from 'lucide-react';
import '../../contracting.css';

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function WorkOrderBrowse() {
  const [showError, setShowError] = useState(false);

  const handleSearch = () => {
    // Simulate error from screenshot
    setShowError(true);
    setTimeout(() => setShowError(false), 3000);
  };

  return (
    <div className="contracting-container" style={{ position: 'relative' }}>
      
      {/* Mock Error Toast from screenshot */}
      {showError && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          background: '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '4px',
          display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 1000, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Error</div>
          <div style={{ fontSize: '0.8rem' }}>Please Select Project</div>
        </div>
      )}

      <div className="contracting-header">
        <div className="contracting-header-title">
          <FileText size={18} />
          WO Browse
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> WO Browse
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
              
              <FormGroup label="Library" required>
                <select className="contracting-input" style={{ width: '100%' }}><option>Amazon Library</option></select>
              </FormGroup>
              <FormGroup label="Project" required>
                <select className="contracting-input" style={{ width: '100%' }}><option>Select Here</option></select>
              </FormGroup>
              <FormGroup label="WBS Filter">
                <div style={{ position: 'relative' }}>
                  <input type="text" className="contracting-input" placeholder="Select WBS Task" style={{ width: '100%', paddingRight: '30px' }} />
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </FormGroup>
              <FormGroup label="Labour">
                <input type="text" className="contracting-input" placeholder="Search Labour" style={{ width: '100%' }} />
              </FormGroup>

              <FormGroup label="Contractor">
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              <FormGroup label="WO No">
                <input type="text" className="contracting-input" style={{ width: '100%' }} />
              </FormGroup>
              <FormGroup label="WO Revision">
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              <FormGroup label="From Date (WO Detail)">
                <input type="date" className="contracting-input" defaultValue="2026-07-25" style={{ width: '100%' }} />
              </FormGroup>

              <FormGroup label="To Date (WO Detail)">
                <input type="date" className="contracting-input" defaultValue="2026-08-25" style={{ width: '100%' }} />
              </FormGroup>
              <FormGroup label="Work Order Type">
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              <FormGroup label="Work Order Type2">
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              <FormGroup label="Status">
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              
              <FormGroup label="Created By">
                <input type="text" className="contracting-input" style={{ width: '100%' }} />
              </FormGroup>

            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button className="btn-cyan"><Printer size={14} /> Annexure Printing</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-cyan"><RefreshCw size={14} /> Reset</button>
                <button className="btn-cyan" onClick={handleSearch}><Search size={14} /> Search</button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Result Section */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
            + Search Result
          </div>
        </div>

        {/* WO Summary Section */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
            - WO Summary (Total Count : 0 Work Order)
          </div>
          <div style={{ padding: '20px', minHeight: '200px' }}>
            {/* Empty table area matching screenshot */}
            <div style={{ background: '#f8fafc', height: '40px', borderBottom: '1px solid #e2e8f0' }}></div>
          </div>
        </div>

      </div>
    </div>
  );
}
