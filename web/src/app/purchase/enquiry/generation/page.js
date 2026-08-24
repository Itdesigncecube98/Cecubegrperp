'use client';
import React, { useState } from 'react';
import { Home, ChevronRight, Search, RefreshCw, MessageSquare, Plus, Trash2, Save, Minus } from 'lucide-react';
import '../../purchase.css';

const FormGroup = ({ label, required, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

export default function EnquiryGeneration() {
  const [materials, setMaterials] = useState([{ id: 1 }]);

  return (
    <div className="purchase-container">
      
      {/* Header */}
      <div className="purchase-header">
        <div className="purchase-header-title">
          <MessageSquare size={18} />
          Enquiry Generation
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Enquiry Generation
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

            <FormGroup label="Project" required>
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="Select Project">
                <option>Select Project</option>
              </select>
            </FormGroup>

            <FormGroup label="Material Category">
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

            <FormGroup label="Search Date For">
              <select className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="Requisition From">
                <option>Requisition From</option>
              </select>
            </FormGroup>

            <FormGroup label="From Date">
              <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="2026-07-24" />
            </FormGroup>

            <FormGroup label="To Date">
              <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="2026-08-24" />
            </FormGroup>

            <FormGroup label="">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ accentColor: '#17a2b8' }} /> Consider Lead Time
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ accentColor: '#17a2b8' }} /> Extra Requisition
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ accentColor: '#17a2b8' }} /> From Library
                </label>
              </div>
            </FormGroup>

          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button className="btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={14} /> Reset
            </button>
            <button className="btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={14} /> Search
            </button>
          </div>
        </div>
      </div>

      {/* Enquiry Generation Section */}
      <div className="purchase-card">
        <div className="purchase-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', backgroundColor: '#f0f9ff' }}>
          <Minus size={16} /> Enquiry Generation
        </div>
        <div className="purchase-card-body">
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
            <FormGroup label="Enquiry No.">
              <input type="text" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} value="Auto Generated" readOnly disabled />
            </FormGroup>

            <FormGroup label="Enquiry Date">
              <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="2026-08-24" />
            </FormGroup>

            <FormGroup label="Due Date">
              <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="2026-08-31" />
            </FormGroup>

            <FormGroup label="Expiry Date">
              <input type="date" className="purchase-input" style={{ width: '100%', boxSizing: 'border-box' }} defaultValue="2026-09-03" />
            </FormGroup>
          </div>

          <div className="purchase-table-wrapper" style={{ marginTop: 0 }}>
            <table className="purchase-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>Sr.No.</th>
                  <th>Material</th>
                  <th>Unit Name</th>
                  <th>Brand</th>
                  <th>Specification</th>
                  <th>Requirement Qty</th>
                  <th>Requisition Qty</th>
                  <th>Total</th>
                  <th>Extra Qty</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((mat, idx) => (
                  <tr key={mat.id} style={{ backgroundColor: 'white' }}>
                    <td>{idx + 1}</td>
                    <td style={{ color: '#0284c7', fontWeight: 500 }}>Select Material</td>
                    <td></td>
                    <td></td>
                    <td>
                      <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Add</button>
                    </td>
                    <td><input type="text" className="purchase-input" style={{ width: '100%', padding: '4px' }} /></td>
                    <td><input type="text" className="purchase-input" style={{ width: '100%', padding: '4px' }} /></td>
                    <td><input type="text" className="purchase-input" style={{ width: '100%', padding: '4px' }} /></td>
                    <td><input type="text" className="purchase-input" style={{ width: '100%', padding: '4px' }} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <Plus size={16} className="action-icon" style={{ color: '#3b82f6' }} onClick={() => setMaterials([...materials, { id: Date.now() }])} />
                        <Trash2 size={16} className="action-icon" style={{ color: '#ef4444' }} onClick={() => materials.length > 1 && setMaterials(materials.filter(m => m.id !== mat.id))} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '24px' }}>
            <FormGroup label="Remark">
              <textarea className="purchase-input" style={{ width: '300px', height: '60px', resize: 'vertical' }}></textarea>
            </FormGroup>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 24px' }}>
              <Save size={16} /> Save
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
