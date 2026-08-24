'use client';
import React, { useState } from 'react';
import { Home, ChevronRight, Search, RefreshCw, FileText } from 'lucide-react';
import '../../contracting.css';

const FormGroup = ({ label, required, children, error }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
    {error && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', fontWeight: 500 }}>{error}</div>}
  </div>
);

export default function RaiseWorkOrder() {
  const [contractor, setContractor] = useState('');
  const [showError, setShowError] = useState(false);

  const handleSearch = () => {
    if (!contractor) {
      setShowError(true);
    }
  };

  return (
    <div className="contracting-container">
      
      <div className="contracting-header">
        <div className="contracting-header-title">
          <FileText size={18} />
          Raise Work Order
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Raise Work Order
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
                <select className="contracting-input" style={{ width: '100%' }}><option>Unitech GRP Servicing of Product for DG Sets HVAC</option></select>
              </FormGroup>
              
              <FormGroup label="WBS Filter">
                <div style={{ position: 'relative' }}>
                  <input type="text" className="contracting-input" placeholder="Select WBS Task" style={{ width: '100%', paddingRight: '30px' }} />
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </FormGroup>

              <FormGroup label="Work Order From" required>
                <select className="contracting-input" style={{ width: '100%' }}><option>Task wise WO Generation</option></select>
              </FormGroup>
              
              <FormGroup label="">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#17a2b8', fontWeight: 600 }}>
                    <input type="radio" name="woType" defaultChecked /> Create New Work Order
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#17a2b8', fontWeight: 600 }}>
                    <input type="radio" name="woType" /> Revision in Existing Work Order
                  </label>
                </div>
              </FormGroup>

              <FormGroup label="Contractor" required error={showError ? "This field is required." : ""}>
                <input 
                  type="text" 
                  className="contracting-input" 
                  placeholder="Search Contractor" 
                  style={{ width: '100%', borderColor: showError ? '#ef4444' : '#e2e8f0' }} 
                  value={contractor}
                  onChange={(e) => {
                    setContractor(e.target.value);
                    if (e.target.value) setShowError(false);
                  }}
                />
              </FormGroup>
              
              <FormGroup label="Labour Category">
                <input type="text" className="contracting-input" placeholder="Select Here" style={{ width: '100%' }} />
              </FormGroup>

              <FormGroup label="Labour">
                <input type="text" className="contracting-input" placeholder="Search Labour" style={{ width: '100%' }} />
              </FormGroup>

            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn-cyan" onClick={() => { setContractor(''); setShowError(false); }}><RefreshCw size={14} /> Reset</button>
              <button className="btn-cyan" onClick={handleSearch}><Search size={14} /> Search</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
