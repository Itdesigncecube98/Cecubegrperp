'use client';
import React from 'react';
import { Home, ChevronRight, Search, RefreshCw, MessageSquare } from 'lucide-react';
import '../../purchase.css';

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function EnquiryBrowse() {
  return (
    <div className="purchase-container">
      
      {/* Header */}
      <div className="purchase-header">
        <div className="purchase-header-title">
          <MessageSquare size={18} />
          Enquiry Browse
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Enquiry Browse
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
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="Select">
                <option>Select</option>
              </select>
            </FormGroup>

            <FormGroup label="Project">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                <option>Select</option>
              </select>
            </FormGroup>

            <FormGroup label="Supplier Name">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                <option>Select</option>
              </select>
            </FormGroup>

            <FormGroup label="WBS Filter">
              <div style={{ position: 'relative' }}>
                <input type="text" className="purchase-input" placeholder="All" style={{ width: '100%', boxSizing: 'border-box' }} />
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </FormGroup>

            <FormGroup label="Status">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                <option>All</option>
              </select>
            </FormGroup>

            <FormGroup label="Enquiry No">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                <option>Select</option>
              </select>
            </FormGroup>

            <FormGroup label="Search for">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="Enquiry Date">
                <option>Enquiry Date</option>
              </select>
            </FormGroup>

            <FormGroup label="Material Category">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                <option>Select</option>
              </select>
            </FormGroup>

            <FormGroup label="From Date">
              <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="2026-07-24" />
            </FormGroup>

            <FormGroup label="To Date">
              <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="2026-08-24" />
            </FormGroup>

            <FormGroup label="Materials">
              <input type="text" className="purchase-input" placeholder="Enter material name..." style={{ width: '100%', boxSizing: 'border-box' }} />
            </FormGroup>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '12px', height: '100%', paddingBottom: '16px' }}>
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

    </div>
  );
}
