'use client';
import React from 'react';
import { Home, ChevronRight, Search, RefreshCw, FileText, Printer, Check } from 'lucide-react';
import '../../contracting.css';

const FormGroup = ({ label, required, children, viewLink }) => (
  <div style={{ marginBottom: '16px', position: 'relative' }}>
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#17a2b8', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
    {viewLink && (
      <span style={{ position: 'absolute', top: 0, right: 0, fontSize: '0.75rem', color: '#17a2b8', border: '1px solid #17a2b8', padding: '1px 6px', borderRadius: '4px', cursor: 'pointer', background: 'white' }}>
        view
      </span>
    )}
  </div>
);

export default function RABillApprove() {
  return (
    <div className="contracting-container">
      
      <div className="contracting-header">
        <div className="contracting-header-title">
          <FileText size={18} />
          RA Bill Approve
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> RA Bill Approve
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
              
              <FormGroup label="Contractor">
                <select className="contracting-input" style={{ width: '100%' }}><option>-Select-</option></select>
              </FormGroup>
              
              <FormGroup label="WO No" required>
                <select className="contracting-input" style={{ width: '100%' }}><option></option></select>
              </FormGroup>
              
              <FormGroup label="WO No + RA Bill No">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select className="contracting-input" style={{ flex: 1 }}><option></option></select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>
                    <input type="checkbox" defaultChecked /> Pending
                  </label>
                </div>
              </FormGroup>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn-cyan"><RefreshCw size={14} /> Reset</button>
              <button className="btn-cyan"><Search size={14} /> Search</button>
            </div>
          </div>
        </div>

        {/* Search Result */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>
            <ChevronRight size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Search Result
          </div>
        </div>

        {/* Update Status */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
            - Update Status
          </div>
          <div style={{ padding: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px 24px' }}>
              
              {/* Column 1 */}
              <div>
                <FormGroup label="Total Amount"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="- Adv Rec" viewLink><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="- Others"><input type="text" className="contracting-input bg-gray" defaultValue="0" disabled style={{ width: '100%', textAlign: 'right' }} /></FormGroup>
                <FormGroup label="TCS"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="+ ESI Employee Contribution"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="- Advance Recovery"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="Service Tax (Service Receiver)"><input type="text" className="contracting-input bg-gray" defaultValue="0" disabled style={{ width: '100%', textAlign: 'right' }} /></FormGroup>
                <FormGroup label="Contractor Bill Date"><input type="date" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
              </div>

              {/* Column 2 */}
              <div>
                <FormGroup label="+ Material Composite"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="- Retention"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="+ S Tax"><input type="text" className="contracting-input bg-gray" defaultValue="0" disabled style={{ width: '100%', textAlign: 'right' }} /></FormGroup>
                <FormGroup label="+ Provider Total Tax"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="+ ESI Employer Contribution"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="Net Amount"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="Status"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="Contractor Bill No."><input type="text" className="contracting-input" style={{ width: '100%' }} /></FormGroup>
              </div>

              {/* Column 3 */}
              <div>
                <FormGroup label="+ Credit" viewLink><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="- Security Deposit"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="- WCT TDS"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="+ PF Employee Contribution"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="- Insurance"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="Receiver Total Tax"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="RA Bill Type"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="Remarks"><textarea className="contracting-input" style={{ width: '100%', height: '36px' }}></textarea></FormGroup>
              </div>

              {/* Column 4 */}
              <div>
                <FormGroup label="- Debit" viewLink><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="+ VAT"><input type="text" className="contracting-input bg-gray" defaultValue="0" disabled style={{ width: '100%', textAlign: 'right' }} /></FormGroup>
                <FormGroup label="- TDS"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="+ PF Employer Contribution"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="- Labour Cess / LWF"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="Material Bill Credit"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
                <FormGroup label="DRCRNote PostType"><input type="text" className="contracting-input bg-gray" disabled style={{ width: '100%' }} /></FormGroup>
              </div>

            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button className="btn-cyan"><Printer size={14} /> Print</button>
              <button className="btn-cyan"><Check size={14} /> Approve</button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
