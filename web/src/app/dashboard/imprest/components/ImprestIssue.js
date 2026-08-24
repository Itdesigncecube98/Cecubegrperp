'use client';

import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function ImprestIssue() {
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [issueData, setIssueData] = useState({
    issuedAmount: '',
    paymentMode: 'bank',
    transactionRef: '',
    issueDate: new Date().toISOString().split('T')[0]
  });

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/imprest?status=APPROVED', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setApprovedRequests(data);
      }
    } catch (err) {
      console.error('Failed to load approved requests:', err);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSelect = (e) => {
    const reqId = e.target.value;
    if (!reqId) {
      setSelectedRequest(null);
      return;
    }
    const req = approvedRequests.find(r => r.id.toString() === reqId);
    setSelectedRequest(req);
    if (req) {
      setIssueData({ ...issueData, issuedAmount: req.approvedAmount || '' });
    }
  };

  const handleIssue = async () => {
    if (!selectedRequest) return;
    try {
      const payload = {
        id: selectedRequest.id,
        action: 'issue',
        issuedAmount: issueData.issuedAmount,
        paymentMode: issueData.paymentMode,
        transactionRef: issueData.transactionRef,
        issueDate: issueData.issueDate
      };

      const res = await fetch('/api/imprest', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSelectedRequest(null);
        setIssueData({ ...issueData, transactionRef: '' });
        loadRequests();
        alert('Imprest issued successfully.');
      } else {
        alert('Failed to issue imprest.');
      }
    } catch (err) {
      console.error(err);
      alert('Error issuing imprest.');
    }
  };

  return (
    <div>
      <h2 className="section-title">Issue Approved Imprest (Accounts)</h2>
      
      <div className="form-grid">
        <div className="form-group">
          <label>Select Approved Request</label>
          <select value={selectedRequest?.id || ''} onChange={handleSelect}>
            <option value="">Select Request</option>
            {approvedRequests.map(req => (
              <option key={req.id} value={req.id}>
                {req.requestId} - {req.employee?.name} (₹ {req.approvedAmount})
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Employee Name</label>
          <input type="text" value={selectedRequest?.employee?.name || ''} disabled style={{ backgroundColor: '#f8fafc' }} />
        </div>
        <div className="form-group">
          <label>Opening Balance (Auto-calculated)</label>
          <input type="text" value="₹ 0" disabled style={{ backgroundColor: '#f8fafc' }} />
        </div>
        <div className="form-group">
          <label>Approved Amount</label>
          <input type="text" value={`₹ ${selectedRequest?.approvedAmount || 0}`} disabled style={{ backgroundColor: '#f8fafc', color: '#16a34a', fontWeight: 600 }} />
        </div>
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '24px 0 16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>Payment Details</h3>

      <div className="form-grid">
        <div className="form-group">
          <label>Amount Issued (₹)</label>
          <input type="number" value={issueData.issuedAmount} onChange={e => setIssueData({...issueData, issuedAmount: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Payment Mode</label>
          <select value={issueData.paymentMode} onChange={e => setIssueData({...issueData, paymentMode: e.target.value})}>
            <option value="cash">Cash</option>
            <option value="bank">Bank Transfer</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>
        <div className="form-group">
          <label>Transaction Reference No.</label>
          <input type="text" value={issueData.transactionRef} onChange={e => setIssueData({...issueData, transactionRef: e.target.value})} placeholder="e.g. UTR123456789" />
        </div>
        <div className="form-group">
          <label>Issue Date</label>
          <input type="date" value={issueData.issueDate} onChange={e => setIssueData({...issueData, issueDate: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Issued By (Accounts)</label>
          <input type="text" value="Accounts Admin" disabled style={{ backgroundColor: '#f8fafc' }} />
        </div>
      </div>

      <div className="action-buttons">
        <button onClick={handleIssue} disabled={!selectedRequest} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: !selectedRequest ? 0.5 : 1 }}>
          <Send size={18} /> Record Issue
        </button>
      </div>
    </div>
  );
}
