'use client';
import React, { useState, useEffect } from 'react';
import { X, IndianRupee } from 'lucide-react';

export default function ImprestModal({ isOpen, onClose, employee, onSubmit }) {
  const [formData, setFormData] = useState({
    amountRequested: '',
    requiredDate: '',
    purpose: '',
    projectSite: employee?.siteOffice || '',
    imprestHead: ''
  });
  const [imprestHeads, setImprestHeads] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/synchronization?type=imprestheads')
        .then(res => res.json())
        .then(data => setImprestHeads(Array.isArray(data) ? data : []))
        .catch(err => console.error('Failed to fetch imprest heads:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IndianRupee size={20} color="#0ea5e9" /> Apply for Imprest
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>Employee Name</label>
              <input type="text" value={employee?.name || ''} disabled style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>Employee Code</label>
              <input type="text" value={employee?.empId || ''} disabled style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>Department</label>
              <input type="text" value={employee?.department || ''} disabled style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>Project / Site</label>
              <input type="text" value={formData.projectSite} onChange={e => setFormData({...formData, projectSite: e.target.value})} placeholder="e.g. Site Beta" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>Imprest Head</label>
              <select value={formData.imprestHead} onChange={e => setFormData({...formData, imprestHead: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
                <option value="">Select Imprest Head</option>
                {imprestHeads.map(head => (
                  <option key={head.id} value={head.name}>{head.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>Amount Requested (₹) *</label>
              <input type="number" required value={formData.amountRequested} onChange={e => setFormData({...formData, amountRequested: e.target.value})} placeholder="e.g. 5000" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>Required Date *</label>
              <input type="date" required value={formData.requiredDate} onChange={e => setFormData({...formData, requiredDate: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>Purpose *</label>
            <textarea required value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} placeholder="Describe why you need this imprest..." style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px', resize: 'vertical' }}></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#0ea5e9', color: 'white', fontWeight: 500, cursor: 'pointer' }}>Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  );
}
