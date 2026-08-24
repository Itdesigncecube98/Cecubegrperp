'use client';
import React, { useState } from 'react';
import { X, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function ImprestApprovalsModal({ isOpen, onClose, requests, onApprove, onReject, onReturn }) {
  const [remarks, setRemarks] = useState({});

  if (!isOpen) return null;

  const handleRemarkChange = (id, value) => {
    setRemarks({ ...remarks, [id]: value });
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b' }}>
            Pending Imprest Approvals
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
        </div>

        {requests.length === 0 ? (
          <p style={{ color: '#64748b' }}>No pending requests found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {requests.map(req => (
              <div key={req.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                      {req.employee?.name} ({req.employee?.empId})
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                      {req.employee?.department} | {req.projectSite || 'No Project/Site'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0ea5e9' }}>
                      ₹{req.amountRequested}
                    </p>
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#d97706', fontWeight: 500 }}>
                      {req.status}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '14px', color: '#475569' }}>
                  <div><strong>Required Date:</strong> {new Date(req.requiredDate).toLocaleDateString('en-GB')}</div>
                  <div><strong>Purpose:</strong> {req.purpose}</div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <input 
                    type="text" 
                    placeholder="Add remarks/comments (optional)..."
                    value={remarks[req.id] || ''}
                    onChange={(e) => handleRemarkChange(req.id, e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => onReject(req.id, req.status, remarks[req.id])}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: '1px solid #ef4444', backgroundColor: 'white', color: '#ef4444', cursor: 'pointer', fontWeight: 500 }}
                  >
                    <XCircle size={16} /> Reject
                  </button>
                  <button 
                    onClick={() => onReturn(req.id, req.status, remarks[req.id])}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: '1px solid #eab308', backgroundColor: 'white', color: '#eab308', cursor: 'pointer', fontWeight: 500 }}
                  >
                    <RefreshCw size={16} /> Return
                  </button>
                  <button 
                    onClick={() => onApprove(req.id, req.status, remarks[req.id])}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#22c55e', color: 'white', cursor: 'pointer', fontWeight: 500 }}
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
