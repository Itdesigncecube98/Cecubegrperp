'use client';
import React, { useState } from 'react';
import { Save, RotateCcw, Home, ChevronRight, HelpCircle } from 'lucide-react';
import '../../contracting.css';

export default function EnquiryGeneration() {
  const [form, setForm] = useState({
    projectId: '',
    labourCategory: '',
    wbs: '',
    requisition: '',
    fromDate: '',
    toDate: '',
    reqFromDate: '',
    reqToDate: ''
  });

  const handleSave = (e) => {
    e.preventDefault();
    console.log("Saving enquiry:", form);
    alert("Enquiry Generated Successfully!");
  };

  const resetForm = () => {
    setForm({
      projectId: '',
      labourCategory: '',
      wbs: '',
      requisition: '',
      fromDate: '',
      toDate: '',
      reqFromDate: '',
      reqToDate: ''
    });
  };

  return (
    <div className="contracting-container">
      {/* Header */}
      <div className="contracting-header">
        <div className="contracting-header-title">
          <HelpCircle size={18} />
          Enquiry Generation
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Enquiry <ChevronRight size={14} /> Enquiry Generation
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            
            <div>
              <label className="contracting-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>Project</label>
              <select 
                className="contracting-input" 
                style={{ width: '100%' }}
                value={form.projectId}
                onChange={(e) => setForm({...form, projectId: e.target.value})}
              >
                <option value="">-- Select Project --</option>
                <option value="p1">Project Alpha</option>
                <option value="p2">Project Beta</option>
              </select>
            </div>

            <div>
              <label className="contracting-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>Labour Category</label>
              <input 
                type="text"
                className="contracting-input" 
                style={{ width: '100%' }}
                placeholder="e.g. Welding Machine"
                value={form.labourCategory}
                onChange={(e) => setForm({...form, labourCategory: e.target.value})}
              />
            </div>

            <div>
              <label className="contracting-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>WBS</label>
              <input 
                type="text"
                className="contracting-input" 
                style={{ width: '100%' }}
                placeholder="Work Breakdown Structure"
                value={form.wbs}
                onChange={(e) => setForm({...form, wbs: e.target.value})}
              />
            </div>

            <div>
              <label className="contracting-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>Requisition</label>
              <input 
                type="text"
                className="contracting-input" 
                style={{ width: '100%' }}
                placeholder="Requisition No."
                value={form.requisition}
                onChange={(e) => setForm({...form, requisition: e.target.value})}
              />
            </div>

            <div>
              <label className="contracting-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>From Date</label>
              <input 
                type="date"
                className="contracting-input" 
                style={{ width: '100%' }}
                value={form.fromDate}
                onChange={(e) => setForm({...form, fromDate: e.target.value})}
              />
            </div>

            <div>
              <label className="contracting-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>To Date</label>
              <input 
                type="date"
                className="contracting-input" 
                style={{ width: '100%' }}
                value={form.toDate}
                onChange={(e) => setForm({...form, toDate: e.target.value})}
              />
            </div>

            <div>
              <label className="contracting-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>Requirement From Date</label>
              <input 
                type="date"
                className="contracting-input" 
                style={{ width: '100%' }}
                value={form.reqFromDate}
                onChange={(e) => setForm({...form, reqFromDate: e.target.value})}
              />
            </div>

            <div>
              <label className="contracting-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>Requirement To Date</label>
              <input 
                type="date"
                className="contracting-input" 
                style={{ width: '100%' }}
                value={form.reqToDate}
                onChange={(e) => setForm({...form, reqToDate: e.target.value})}
              />
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              <RotateCcw size={16} /> Reset
            </button>
            <button type="submit" className="btn-primary">
              <Save size={16} /> Generate Enquiry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
