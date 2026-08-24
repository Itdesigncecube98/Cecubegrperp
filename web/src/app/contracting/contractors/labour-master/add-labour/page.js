'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Home, ChevronRight, Save, ArrowLeft, Users } from 'lucide-react';
import '../../../contracting.css';

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

const FormSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: '#f1f5f9', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px',
          fontWeight: 600, fontSize: '0.85rem', color: '#334155', cursor: 'pointer', borderBottom: isOpen ? '1px solid #e2e8f0' : 'none'
        }}
      >
        <span>{isOpen ? '-' : '+'}</span>
        {title}
      </div>
      {isOpen && (
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default function AddLabour() {
  return (
    <div className="contracting-container">
      
      <div className="contracting-header" style={{ background: 'white', padding: '16px 24px' }}>
        <div className="contracting-header-title" style={{ fontSize: '1.25rem' }}>
          <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '8px', color: '#17a2b8' }}>
            <Users size={20} />
          </div>
          Add Labour
        </div>
        
        <Link href="/contracting/contractors/labour-master">
          <button className="btn-cyan">
            <ArrowLeft size={16} /> Back
          </button>
        </Link>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        <FormSection title="Add Labour">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <FormGroup label="Employee Code" required><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Title" required>
              <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
            </FormGroup>
            <FormGroup label="First Name" required><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Middle Name"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            
            <FormGroup label="Last Name"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Status" required>
              <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
            </FormGroup>
            <FormGroup label="Joining Date">
              <input type="date" className="contracting-input" defaultValue="1901-01-01" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Leaving Date">
              <input type="date" className="contracting-input" defaultValue="1901-01-01" style={{ width: '100%' }} />
            </FormGroup>
            
            <FormGroup label="Leaving Reason">
              <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
            </FormGroup>
            <FormGroup label="Employment Types">
              <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
            </FormGroup>
            <FormGroup label="Biometric Ref No"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Daily wages"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
          </div>
        </FormSection>

        <FormSection title="Personal Details">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <FormGroup label="Father Name"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Mother Name"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Gender" required>
              <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
            </FormGroup>
            <FormGroup label="Date of Birth">
              <input type="date" className="contracting-input" defaultValue="1901-01-01" style={{ width: '100%' }} />
            </FormGroup>
            
            <FormGroup label="Blood Group">
              <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
            </FormGroup>
            <FormGroup label="Marital Status">
              <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
            </FormGroup>
            <FormGroup label="Spouse Name"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Identification Marks"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            
            <FormGroup label="PAN/PIN"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Aadhar No"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="UAN"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="PF No"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            
            <FormGroup label="PF Start Date">
              <input type="date" className="contracting-input" defaultValue="1901-01-01" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="ESI No"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Passport Number"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Passport Issued By"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            
            <FormGroup label="Permanent Address"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Temporary Address"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Mobile 1"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Mobile 2"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            
            <FormGroup label="Email 1"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Email 2"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Telephone Office - 1"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Telephone Residence"><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
          </div>
        </FormSection>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingBottom: '32px' }}>
          <button className="btn-cyan" style={{ padding: '10px 24px' }}>
            <Save size={16} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
