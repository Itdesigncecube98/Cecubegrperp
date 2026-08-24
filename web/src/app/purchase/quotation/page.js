'use client';
import React from 'react';
import { Home, ChevronRight, Search, RefreshCw, FileText, Minus } from 'lucide-react';
import '../purchase.css';

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function Quotation() {
  return (
    <div className="purchase-container">
      
      {/* Header */}
      <div className="purchase-header">
        <div className="purchase-header-title">
          <FileText size={18} />
          Quotation
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Quotation
        </div>
      </div>

      {/* Filter Section */}
      <div className="purchase-card" style={{ marginBottom: '24px' }}>
        <div className="purchase-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChevronRight size={16} /> Filter
        </div>
        <div className="purchase-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            
            <FormGroup label="Library" required>
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="Amazon Library">
                <option>Amazon Library</option>
              </select>
            </FormGroup>

            <FormGroup label="Supplier Name" required>
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="AB Pal Electric Pvt Ltd">
                <option>AB Pal Electric Pvt Ltd</option>
              </select>
            </FormGroup>

            <FormGroup label="Enquiry No">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                <option>Select</option>
              </select>
            </FormGroup>

            <div style={{ display: 'none' }}></div> {/* Empty slot for alignment */}

            <FormGroup label="From Date" required>
              <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="2026-08-09" />
            </FormGroup>

            <FormGroup label="To Date" required>
              <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="2026-08-24" />
            </FormGroup>

            <div style={{ gridColumn: '3 / span 2', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} /> Reset
              </button>
              <button className="btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={14} /> Search
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Enquiries Section */}
      <div className="purchase-card">
        <div className="purchase-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#0284c7', backgroundColor: '#f0f9ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Minus size={16} /> Enquiries
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 'normal' }}>
            <span>Show Rows:</span>
            <select className="purchase-input" style={{ width: '60px', padding: '4px' }}>
              <option>40</option>
            </select>
            <span>Page:</span>
            <input type="text" className="purchase-input" defaultValue="1" style={{ width: '40px', padding: '4px', textAlign: 'center' }} />
            <span>of 0</span>
            <button className="btn-cyan" style={{ padding: '4px 8px' }}>Go</button>
          </div>
        </div>
        <div className="purchase-card-body" style={{ padding: 0 }}>
          <div className="purchase-table-wrapper" style={{ marginTop: 0, border: 'none', borderRadius: 0 }}>
            <table className="purchase-table" style={{ border: 'none' }}>
              <thead>
                <tr>
                  <th>Enquiry No</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Expiry Date</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>Data not available</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
