'use client';
import React, { useState } from 'react';
import { ChevronRight, Printer, Save, Trash2, ArrowLeft, Plus } from 'lucide-react';
import '../../purchase.css';
import Link from 'next/link';

const FormGroup = ({ label, required, children, noMargin }) => (
  <div style={{ marginBottom: noMargin ? '0' : '16px' }}>
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
          background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', 
          borderBottom: isOpen ? '1px solid #e2e8f0' : 'none', display: 'flex', alignItems: 'center', cursor: 'pointer'
        }}
      >
        <ChevronRight size={16} style={{ marginRight: '8px', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
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

export default function SupplierMaster() {
  return (
    <div className="purchase-container">
      
      <div className="purchase-header">
        <div className="purchase-header-title">
          <UsersIcon size={18} />
          Supplier Master
        </div>
        <div>
          <Link href="/purchase/suppliers/supplier-list">
            <button className="btn-cyan"><ArrowLeft size={14} /> Back</button>
          </Link>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Add Supplier */}
        <FormSection title="Add Supplier">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <FormGroup label="Supplier Group Name">
              <select className="purchase-input" style={{ width: '100%' }}><option>-Select Group-</option></select>
            </FormGroup>
            <FormGroup label="Supplier Name" required>
              <input type="text" className="purchase-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Supplier No.">
              <input type="text" className="purchase-input bg-gray" disabled style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Owner/Contact Person">
              <input type="text" className="purchase-input" style={{ width: '100%' }} />
            </FormGroup>
            
            <FormGroup label="Additional Contact Person">
              <input type="text" className="purchase-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Weekly Off">
              <select className="purchase-input" style={{ width: '100%' }}><option>Sunday</option></select>
            </FormGroup>
            <FormGroup label="Material Categories" required>
              <select className="purchase-input" style={{ width: '100%' }}><option>Select here</option></select>
            </FormGroup>
            <div></div> {/* Empty for alignment */}

            <FormGroup label="Address Office">
              <input type="text" className="purchase-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Address Godown">
              <input type="text" className="purchase-input" style={{ width: '100%' }} />
            </FormGroup>
            <FormGroup label="Address Residential/Fact">
              <input type="text" className="purchase-input" style={{ width: '100%' }} />
            </FormGroup>
          </div>
        </FormSection>

        {/* Contact Details */}
        <FormSection title="Contact Details">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <FormGroup label="Phone Office"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Phone Residential"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Mobile"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="WhatsApp No.">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#17a2b8', fontWeight: 600 }}>
                  <input type="checkbox" defaultChecked /> Is Whatsapp No.?
                </label>
                <input type="text" className="purchase-input" style={{ flex: 1 }} />
              </div>
            </FormGroup>
            
            <FormGroup label="Email"><input type="email" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Fax No"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Website"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
          </div>
        </FormSection>

        {/* Other Details */}
        <FormSection title="Other Details">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <FormGroup label="Registration Date"><input type="date" className="purchase-input" style={{ width: '100%' }} defaultValue="2026-08-24" /></FormGroup>
            <FormGroup label="Major Client List"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="In Business Since"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Grading"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            
            <FormGroup label="Credit Capacity"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Credit Days"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Firm Type">
              <div style={{ display: 'flex', gap: '4px' }}>
                <select className="purchase-input" style={{ flex: 1 }}><option></option></select>
                <button className="btn-cyan" style={{ padding: '6px' }}><Plus size={14}/></button>
              </div>
            </FormGroup>
            <FormGroup label="Status">
              <select className="purchase-input" style={{ width: '100%' }}><option>Unapproved</option></select>
            </FormGroup>

            <FormGroup label="Status Change Remark" noMargin>
              <input type="text" className="purchase-input" style={{ width: '100%' }} />
            </FormGroup>
          </div>
        </FormSection>

        {/* Legal Details */}
        <FormSection title="Legal Details">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <FormGroup label="C.S.T. No"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="VAT No"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="PAN/PIN No"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="IT Declaration"><select className="purchase-input" style={{ width: '100%' }}><option>Select</option></select></FormGroup>
            
            <FormGroup label="TAN/TIN No"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="P.F. No"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Shop-act No"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Shop-act expiry date">
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="checkbox" />
                <input type="date" className="purchase-input" style={{ flex: 1 }} defaultValue="2026-08-24" />
              </div>
            </FormGroup>
            
            <FormGroup label="CIN No"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <div style={{ gridColumn: 'span 3' }}></div> {/* Spacer */}

            <FormGroup label="MSME Category" required><select className="purchase-input" style={{ width: '100%' }}><option>Select</option></select></FormGroup>
            <FormGroup label="MSME Registration No"><input type="text" className="purchase-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="MSME Type"><select className="purchase-input bg-gray" disabled style={{ width: '100%' }}><option>-Select-</option></select></FormGroup>
            <FormGroup label="MSME Activity"><select className="purchase-input bg-gray" disabled style={{ width: '100%' }}><option>-Select-</option></select></FormGroup>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button className="btn-cyan">GST Registration</button>
          </div>
        </FormSection>

        {/* More Details */}
        <FormSection title="More Details">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <FormGroup label="Organization Type"><select className="purchase-input" style={{ width: '100%' }}><option>Select</option></select></FormGroup>
            <FormGroup label="No Of Employees"><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Supplier Type"><select className="purchase-input" style={{ width: '100%' }}><option>Select</option></select></FormGroup>
            <FormGroup label="Primary Supplier"><select className="purchase-input" style={{ width: '100%' }}><option>Select</option></select></FormGroup>
            
            <FormGroup label="Annual TurnOver" noMargin><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
            <FormGroup label="Machinery Used" noMargin><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
          </div>
        </FormSection>

        {/* Account Link */}
        <FormSection title="Account Link">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
            <div style={{ flex: 1 }}><FormGroup label="Account Name" noMargin><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup></div>
            <div style={{ flex: 1 }}><FormGroup label="Fixed Group" noMargin><select className="purchase-input" style={{ width: '100%' }}><option>Sundry Creditors</option></select></FormGroup></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#334155', fontSize: '0.85rem' }}>
              <input type="checkbox" /> Apply All
            </div>
            <button className="btn-cyan">Save Account link</button>
          </div>
        </FormSection>

        {/* Remark Details */}
        <FormSection title="Remark Details">
          <table className="purchase-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Remark Master</th>
                <th>Remark</th>
                <th>Remark Details</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8' }}>No records</td>
              </tr>
            </tbody>
          </table>
        </FormSection>

        {/* Document Upload */}
        <FormSection title="Document Upload">
          <div style={{ width: '300px' }}>
            <FormGroup label="Document Type" noMargin><input type="text" className="purchase-input" style={{ width: '100%' }} /></FormGroup>
          </div>
        </FormSection>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <button className="btn-cyan"><Printer size={14} /> Print</button>
          <button className="btn-cyan" style={{ backgroundColor: '#ef4444' }}><Trash2 size={14} /> Delete</button>
          <button className="btn-cyan"><Save size={14} /> Save</button>
        </div>

      </div>
    </div>
  );
}

const UsersIcon = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
