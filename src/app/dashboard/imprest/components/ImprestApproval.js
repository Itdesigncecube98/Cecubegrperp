'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, CornerUpLeft } from 'lucide-react';

export default function ImprestApproval() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalData, setApprovalData] = useState({
    status: '',
    approvedAmount: '',
    remarks: '',
    approvalDate: new Date().toISOString().split('T')[0]
  });

  const getNextStatusInfo = (currentStatus) => {
    switch (currentStatus) {
      case 'PENDING_SUPERVISOR': return { value: 'PENDING_ACCOUNTS', label: 'Reviewed' };
      case 'PENDING_ACCOUNTS': return { value: 'PENDING_PROJECTS_HEAD', label: 'Reviewed' };
      case 'PENDING_PROJECTS_HEAD': return { value: 'PENDING_PROJECTS_HEAD_2', label: 'Reviewed' };
      case 'PENDING_PROJECTS_HEAD_2': return { value: 'APPROVED', label: 'Approve Fully' };
      default: return { value: 'APPROVED', label: 'Approve' };
    }
  };

  const loadRequests = async () => {
    try {
      const res = await fetch(`/api/imprest?status=ALL_PENDING&t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setPendingRequests(data);
      }
    } catch (err) {
      console.error('Failed to load pending requests:', err);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const formRef = React.useRef(null);

  const handleSelect = (req) => {
    setSelectedRequest(req);
    const nextInfo = getNextStatusInfo(req.status);
    setApprovalData({
      ...approvalData,
      approvedAmount: req.amountRequested,
      status: nextInfo.value
    });
    // Give it a tiny delay to allow React to render the form before scrolling
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleAction = async (status) => {
    if (!selectedRequest) return;
    try {
      const adminData = JSON.parse(sessionStorage.getItem('adminData') || '{}');
      const approverId = adminData.id || adminData.employeeId || adminData.name || 'Admin';

      const payload = {
        id: selectedRequest.id,
        action: 'approve',
        status,
        approvedAmount: approvalData.approvedAmount,
        remarks: approvalData.remarks,
        approvalDate: approvalData.approvalDate,
        approverId
      };

      const res = await fetch('/api/imprest', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSelectedRequest(null);
        setApprovalData({ ...approvalData, remarks: '' });
        loadRequests();
        alert(`Request ${status} successfully.`);
      } else {
        alert('Failed to process request.');
      }
    } catch (err) {
      console.error(err);
      alert('Error processing request.');
    }
  };

  return (
    <div>
      <h2 className="section-title">Imprest Approval Workflow</h2>
      
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px', marginBottom: '32px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <table className="imprest-table" style={{ marginBottom: 0 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th>Request ID</th>
              <th>Employee Name</th>
              <th>Project / Site</th>
              <th>Requested Amount</th>
              <th>Date</th>
              <th>Pending With</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests.length > 0 ? pendingRequests.map((req, idx) => (
              <tr key={idx} style={{ backgroundColor: selectedRequest?.id === req.id ? '#f0f9ff' : 'transparent' }}>
                <td>{req.requestId}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{req.employee?.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{req.employee?.department}</div>
                </td>
                <td>{req.projectSite || '-'}</td>
                <td style={{ fontWeight: 600 }}>₹ {req.amountRequested}</td>
                <td>{req.requiredDate}</td>
                <td>
                  <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '13px' }}>
                    {req.status ? req.status.replace(/_/g, ' ') : 'PENDING'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {req.currentApprover || '-'}
                  </div>
                </td>
                <td>
                  <button className="btn-primary" onClick={() => handleSelect(req)} style={{ padding: '6px 12px', fontSize: '13px' }}>
                    Review
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>No pending requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedRequest && (
        <div ref={formRef} style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#f8fafc', scrollMarginTop: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Approval Action (Selected: {selectedRequest.requestId})</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Approver Name</label>
              <input type="text" value="Admin" disabled style={{ backgroundColor: '#f1f5f9' }} />
            </div>
            <div className="form-group">
              <label>Approval Date</label>
              <input type="date" value={approvalData.approvalDate} onChange={e => setApprovalData({...approvalData, approvalDate: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Approved Amount (₹)</label>
              <input type="number" value={approvalData.approvedAmount} onChange={e => setApprovalData({...approvalData, approvedAmount: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={approvalData.status} onChange={e => setApprovalData({...approvalData, status: e.target.value})}>
                <option value={getNextStatusInfo(selectedRequest.status).value}>{getNextStatusInfo(selectedRequest.status).label}</option>
                <option value="REJECTED">Reject</option>
                <option value="RETURNED">Return for Correction</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>Remarks</label>
            <textarea value={approvalData.remarks} onChange={e => setApprovalData({...approvalData, remarks: e.target.value})} placeholder="Enter approval remarks or reasons for rejection..."></textarea>
          </div>

          <div className="action-buttons" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
            <button onClick={() => handleAction('REJECTED')} className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <X size={16} /> Reject
            </button>
            <button onClick={() => handleAction('RETURNED')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CornerUpLeft size={16} /> Return
            </button>
            <button onClick={() => handleAction(approvalData.status)} className="btn-primary" style={{ backgroundColor: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={16} /> 
              {approvalData.status === 'APPROVED' ? 'Confirm Approval' : 
               approvalData.status === 'REJECTED' ? 'Confirm Rejection' : 
               approvalData.status === 'RETURNED' ? 'Confirm Return' : 
               'Mark as Reviewed'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
