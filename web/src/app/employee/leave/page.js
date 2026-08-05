'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getLeaveBalance, createLeaveRequest, getLeaveRequests } from '../../../lib/data';

export default function EmployeeLeavePage() {
  const [balance, setBalance] = useState({ casualLeaves: 0, sickLeaves: 0, earnedLeaves: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState('');
  
  const [newRequest, setNewRequest] = useState({
    leaveType: 'Casual',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const router = useRouter();

  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (!empData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(empData);
    setEmployeeId(parsed.id);
    fetchData(parsed.id);
  }, [router]);

  const fetchData = async (id) => {
    try {
      const bal = await getLeaveBalance(id);
      setBalance(bal);
      
      const reqs = await getLeaveRequests(null, id);
      setHistory(reqs);
    } catch (error) {
      console.error("Error fetching leave data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      await createLeaveRequest({
        employeeId,
        ...newRequest
      });
      setNewRequest({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
      fetchData(employeeId);
      alert('Leave request submitted successfully!');
    } catch (error) {
      console.error("Error submitting leave", error);
      alert('Failed to submit leave request');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="portal-container">
      <header className="portal-header">
        <h1>Leave Management</h1>
        <button className="back-button" onClick={() => router.back()}>Back</button>
      </header>

      <div className="balance-cards">
        <div className="balance-card casual">
          <h3>Casual Leave</h3>
          <div className="balance-value">{balance.casualLeaves} <span>Days</span></div>
        </div>
        <div className="balance-card sick">
          <h3>Sick Leave</h3>
          <div className="balance-value">{balance.sickLeaves} <span>Days</span></div>
        </div>
        <div className="balance-card earned">
          <h3>Earned Leave</h3>
          <div className="balance-value">{balance.earnedLeaves} <span>Days</span></div>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h2>Apply for Leave</h2>
          <form onSubmit={handleApply}>
            <div className="form-group">
              <label>Leave Type</label>
              <select 
                value={newRequest.leaveType} 
                onChange={(e) => setNewRequest({...newRequest, leaveType: e.target.value})}
              >
                <option value="Casual">Casual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Earned">Earned Leave</option>
                <option value="Unpaid">Unpaid Leave</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input 
                  type="date" 
                  required 
                  value={newRequest.startDate} 
                  onChange={(e) => setNewRequest({...newRequest, startDate: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input 
                  type="date" 
                  required 
                  value={newRequest.endDate} 
                  onChange={(e) => setNewRequest({...newRequest, endDate: e.target.value})}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Reason</label>
              <textarea 
                required 
                rows="3"
                value={newRequest.reason} 
                onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                placeholder="Brief reason for leave..."
              />
            </div>
            <button type="submit" className="submit-btn">Submit Request</button>
          </form>
        </div>

        <div className="list-card">
          <h2>My Leave History</h2>
          <table className="history-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Dates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map(req => (
                <tr key={req.id}>
                  <td>{req.leaveType}</td>
                  <td>{req.startDate} to {req.endDate}</td>
                  <td>
                    <span className={`status-badge ${req.status.toLowerCase()}`}>
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan="3" className="text-center">No leave requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .portal-container { padding: 20px; font-family: sans-serif; max-width: 1200px; margin: 0 auto; }
        .portal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .portal-header h1 { color: #333; margin: 0; }
        .back-button { padding: 8px 16px; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; }
        
        .balance-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .balance-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; border-top: 4px solid #ccc; }
        .balance-card.casual { border-top-color: #0070f3; }
        .balance-card.sick { border-top-color: #dc3545; }
        .balance-card.earned { border-top-color: #28a745; }
        .balance-card h3 { margin: 0 0 10px 0; color: #555; font-size: 16px; }
        .balance-value { font-size: 32px; font-weight: bold; color: #333; }
        .balance-value span { font-size: 14px; font-weight: normal; color: #777; }
        
        .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 768px) { .content-grid { grid-template-columns: 1fr; } }
        
        .form-card, .list-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .form-card h2, .list-card h2 { margin-top: 0; color: #444; margin-bottom: 16px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        
        .form-group { margin-bottom: 15px; }
        .form-row { display: flex; gap: 15px; }
        .form-row .form-group { flex: 1; }
        
        .form-group label { display: block; margin-bottom: 5px; color: #555; font-weight: 500; font-size: 14px; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
        .form-group textarea { resize: vertical; }
        
        .submit-btn { width: 100%; padding: 12px; background-color: #0070f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 15px; font-weight: 600; }
        .submit-btn:hover { background-color: #005bb5; }
        
        .history-table { width: 100%; border-collapse: collapse; }
        .history-table th, .history-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
        .history-table th { background-color: #f8f9fa; font-weight: 600; color: #555; }
        
        .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
        .status-badge.pending { background-color: #fff3cd; color: #856404; }
        .status-badge.approved { background-color: #d4edda; color: #155724; }
        .status-badge.rejected { background-color: #f8d7da; color: #721c24; }
        
        .text-center { text-align: center; color: #777; }
        .loading { display: flex; justify-content: center; align-items: center; height: 100vh; font-size: 18px; color: #666; }
      `}</style>
    </div>
  );
}
