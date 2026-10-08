'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2 } from 'lucide-react';

export default function ImprestSettlement() {
  const [openRequests, setOpenRequests] = useState([]);
  const [settledRequests, setSettledRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [settleData, setSettleData] = useState({
    settlementDate: new Date().toISOString().split('T')[0],
    settledStatus: 'CLOSED'
  });
  const [expenses, setExpenses] = useState([]);

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/imprest', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setOpenRequests(data.filter(r => r.status === 'ISSUED' && (!r.settledStatus || r.settledStatus === 'OPEN')));
        setSettledRequests(data.filter(r => r.status === 'ISSUED' && r.settledStatus && r.settledStatus !== 'OPEN'));
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
  };

  const loadExpenses = async (reqId) => {
    try {
      const res = await fetch(`/api/imprest/expenses?imprestRequestId=${reqId}`, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setExpenses(data);
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSelect = (e) => {
    const reqId = e.target.value;
    if (!reqId) {
      setSelectedRequest(null);
      setExpenses([]);
      return;
    }
    const req = openRequests.find(r => r.id.toString() === reqId);
    setSelectedRequest(req);
    loadExpenses(reqId);
  };

  const handleSettle = async () => {
    if (!selectedRequest) return;
    try {
      const payload = {
        id: selectedRequest.id,
        action: 'settle',
        settledStatus: settleData.settledStatus,
        settlementDate: settleData.settlementDate
      };

      const res = await fetch('/api/imprest', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSelectedRequest(null);
        setExpenses([]);
        loadRequests();
        alert('Imprest settled successfully.');
      } else {
        alert('Failed to settle imprest.');
      }
    } catch (err) {
      console.error(err);
      alert('Error settling imprest.');
    }
  };

  const totalIssued = selectedRequest?.issuedAmount || 0;
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.billAmount, 0);
  const closingBalance = totalIssued - totalExpenses;
  const requiresReimbursement = closingBalance < 0;
  const cashReturned = closingBalance > 0 ? closingBalance : 0;

  return (
    <div>
      <h2 className="section-title">Imprest Settlement (Accounts)</h2>
      
      <div className="form-grid">
        <div className="form-group">
          <label>Select Imprest for Settlement</label>
          <select value={selectedRequest?.id || ''} onChange={handleSelect}>
            <option value="">Select Imprest</option>
            {openRequests.map(req => (
              <option key={req.id} value={req.id}>
                {req.requestId} - {req.employee?.name} (Ready for Settlement)
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Settlement Date</label>
          <input type="date" value={settleData.settlementDate} onChange={e => setSettleData({...settleData, settlementDate: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Verified By (Accounts)</label>
          <input type="text" value="Accounts Admin" disabled style={{ backgroundColor: '#f8fafc' }} />
        </div>
        <div className="form-group">
          <label>Final Status</label>
          <select value={settleData.settledStatus} onChange={e => setSettleData({...settleData, settledStatus: e.target.value})}>
            <option value="OPEN">Open</option>
            <option value="PARTIAL">Partially Settled</option>
            <option value="SETTLED">Settled</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      <div style={{ margin: '32px 0', padding: '24px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
          <Calculator size={20} color="#0ea5e9" /> Settlement Calculation
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #cbd5e1' }}>
            <span style={{ color: '#475569', fontWeight: 500 }}>Opening Imprest Balance:</span>
            <span style={{ fontWeight: 600 }}>₹ 0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #cbd5e1' }}>
            <span style={{ color: '#475569', fontWeight: 500 }}>Total Imprest Issued:</span>
            <span style={{ fontWeight: 600, color: '#0ea5e9' }}>+ ₹ {totalIssued}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #cbd5e1' }}>
            <span style={{ color: '#475569', fontWeight: 500 }}>Total Approved Expenses ({expenses.length}):</span>
            <span style={{ fontWeight: 600, color: '#ef4444' }}>- ₹ {totalExpenses}</span>
          </div>
          {closingBalance > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #cbd5e1' }}>
              <span style={{ color: '#475569', fontWeight: 500 }}>Cash Return Required by Employee:</span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>+ ₹ {cashReturned}</span>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#e0f2fe', borderRadius: '8px', marginTop: '8px' }}>
            <span style={{ color: '#0369a1', fontWeight: 700, fontSize: '16px' }}>Closing Balance:</span>
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#0369a1' }}>₹ {closingBalance > 0 ? 0 : closingBalance}</span>
          </div>

          {requiresReimbursement && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
              <span style={{ color: '#c2410c', fontWeight: 600 }}>Additional Reimbursement Required:</span>
              <span style={{ fontWeight: 600, color: '#c2410c' }}>₹ {Math.abs(closingBalance)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="action-buttons">
        <button onClick={handleSettle} disabled={!selectedRequest} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#10b981', opacity: !selectedRequest ? 0.5 : 1 }}>
          <CheckCircle2 size={18} /> Finalize Settlement
        </button>
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '32px 0 16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>Settlement History</h3>
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <table className="imprest-table" style={{ marginBottom: 0 }}>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Employee Name</th>
              <th>Issued Amount</th>
              <th>Final Status</th>
              <th>Settlement Date</th>
            </tr>
          </thead>
          <tbody>
            {settledRequests.length > 0 ? settledRequests.map(req => (
              <tr key={req.id}>
                <td style={{ fontWeight: 500, color: '#0ea5e9' }}>{req.requestId}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{req.employee?.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{req.employee?.department}</div>
                </td>
                <td style={{ fontWeight: 600 }}>₹ {req.issuedAmount}</td>
                <td>
                  <span className="status-badge" style={{ backgroundColor: req.settledStatus === 'CLOSED' ? '#f1f5f9' : '#dcfce3', color: req.settledStatus === 'CLOSED' ? '#475569' : '#16a34a' }}>
                    {req.settledStatus}
                  </span>
                </td>
                <td>{req.settlementDate ? new Date(req.settlementDate).toISOString().split('T')[0] : '-'}</td>
              </tr>
            )) : (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No settlement history found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
