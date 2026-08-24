'use client';
import React, { useState } from 'react';
import { Home, ChevronRight, FileText, Printer } from 'lucide-react';
import '../../contracting.css';

export default function RABillBrowse() {
  const [activeTab, setActiveTab] = useState('RA Bill');

  return (
    <div className="contracting-container">
      
      <div className="contracting-header">
        <div className="contracting-header-title">
          <FileText size={18} />
          RA Bill Browse
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> RA Bill Browse
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Filter Section (Collapsed) */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>
            <ChevronRight size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Filter
          </div>
        </div>

        {/* Search Result Section */}
        <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#f1f5f9', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
            - Search Result
          </div>
          
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
              <button className="btn-cyan"><Printer size={14} /> Print</button>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#17a2b8', fontWeight: 600 }}>
                  <input type="radio" name="viewType" defaultChecked /> Details
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#17a2b8', fontWeight: 600 }}>
                  <input type="radio" name="viewType" /> Summary
                </label>
              </div>
              
              <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#475569' }}>
                Show Rows: <select className="contracting-input" style={{ padding: '2px 8px', width: 'auto' }}><option>40</option></select>
                {' '}Page: <input type="number" defaultValue="1" style={{ width: '40px', padding: '2px 4px', border: '1px solid #cbd5e1' }} /> of 1 
                <button style={{ background: '#17a2b8', color: 'white', border: 'none', padding: '2px 8px', marginLeft: '4px', borderRadius: '4px', cursor: 'pointer' }}>Go</button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div 
                style={{ padding: '8px 16px', cursor: 'pointer', background: activeTab === 'RA Bill' ? 'white' : '#f8fafc', color: activeTab === 'RA Bill' ? '#17a2b8' : '#64748b', border: '1px solid #e2e8f0', borderBottom: activeTab === 'RA Bill' ? 'none' : '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}
                onClick={() => setActiveTab('RA Bill')}
              >
                RA Bill
              </div>
              <div 
                style={{ padding: '8px 16px', cursor: 'pointer', background: activeTab === 'Details' ? '#17a2b8' : '#f8fafc', color: activeTab === 'Details' ? 'white' : '#64748b', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}
                onClick={() => setActiveTab('Details')}
              >
                Details
              </div>
            </div>

            {/* Main Table */}
            <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
              <table className="contracting-table" style={{ minWidth: '1000px', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>All</th>
                    <th>Project</th>
                    <th>Contractor</th>
                    <th>RABill No</th>
                    <th>Cont Bill No</th>
                    <th>Date</th>
                    <th>WO No</th>
                    <th>Token No</th>
                    <th>Voucher No</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Total Amt</th>
                    <th style={{ textAlign: 'right' }}>TDS</th>
                    <th style={{ textAlign: 'center' }}>Security Deposit %<br/>/ Security Deposit</th>
                    <th>Doc</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>+</td>
                    <td>Amazon DEL5 Dishwash Area<br/>Refurbishment</td>
                    <td>LumenTech Green<br/>Solutions</td>
                    <td style={{ color: '#17a2b8', fontWeight: 600 }}>1245</td>
                    <td>LTGS/25-<br/>26/464</td>
                    <td>12/03/2026</td>
                    <td>247</td>
                    <td>0</td>
                    <td style={{ color: '#17a2b8' }}>JV - 2777</td>
                    <td>Approved</td>
                    <td style={{ textAlign: 'right' }}>418905.10</td>
                    <td style={{ textAlign: 'right' }}>3989.00</td>
                    <td style={{ textAlign: 'right' }}>.00<br/>.00</td>
                    <td><div style={{ background: '#10b981', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>2</div></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary Table Section */}
            <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ background: '#f8fafc', padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>
                <ChevronRight size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', transform: 'rotate(90deg)' }} />
                RA Bill Summary (Total Count : 1)
              </div>
              <div>
                <table className="contracting-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>RA Bill Summary</th>
                      <th style={{ textAlign: 'right' }}>RA Bill Amount</th>
                      <th style={{ textAlign: 'right' }}>Debit Amount</th>
                      <th style={{ textAlign: 'right' }}>Credit</th>
                      <th style={{ textAlign: 'right' }}>Security Deposite/ Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Amount</td><td style={{ textAlign: 'right' }}>355004.3200</td><td style={{ textAlign: 'right' }}>0.00</td><td style={{ textAlign: 'right' }}>0.00</td><td style={{ textAlign: 'right' }}>0.00</td></tr>
                    <tr><td>Other Amount</td><td style={{ textAlign: 'right' }}>0.0000</td><td style={{ textAlign: 'right' }}>0.00</td><td style={{ textAlign: 'right' }}>0.00</td><td style={{ textAlign: 'right' }}>0.00</td></tr>
                    <tr><td>Tax</td><td style={{ textAlign: 'right' }}>63900.7900</td><td style={{ textAlign: 'right' }}>0.00</td><td style={{ textAlign: 'right' }}>0.00</td><td style={{ textAlign: 'right' }}>0.00</td></tr>
                    <tr><td>Gross Amount</td><td style={{ textAlign: 'right' }}>418905.1100</td><td style={{ textAlign: 'right' }}>0.00</td><td style={{ textAlign: 'right' }}>0.00</td><td style={{ textAlign: 'right' }}>0.00</td></tr>
                    <tr><td>TDS</td><td style={{ textAlign: 'right' }}>-3989.0000</td><td style={{ textAlign: 'right' }}>0.00</td><td style={{ textAlign: 'right' }}>0.00</td><td style={{ textAlign: 'right' }}>0.00</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
