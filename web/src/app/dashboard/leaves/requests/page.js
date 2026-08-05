'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getLeaveRequests, updateLeaveRequestStatus } from '../../../../lib/data';

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) {
      router.push('/login/admin');
      return;
    }
    fetchRequests();
  }, [router]);

  const fetchRequests = async () => {
    try {
      const data = await getLeaveRequests();
      setRequests(data);
    } catch (error) {
      console.error("Error fetching leave requests", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, status) => {
    try {
      await updateLeaveRequestStatus(id, status);
      fetchRequests();
    } catch (error) {
      console.error(`Error updating request ${id}`, error);
    }
  };

  if (loading) {
    return <div className="loading">Loading leave requests...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Leave Requests</h1>
        <button className="back-button" onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
      </header>

      <div className="requests-table-container">
        <table className="requests-table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Leave Type</th>
              <th>Duration</th>
              <th>Reason</th>
              <th>Applied On</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.id}>
                <td>{req.employee?.name || 'Unknown'}</td>
                <td>{req.leaveType}</td>
                <td>{req.startDate} to {req.endDate}</td>
                <td>{req.reason}</td>
                <td>{new Date(req.appliedOn).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge ${req.status.toLowerCase()}`}>
                    {req.status}
                  </span>
                </td>
                <td>
                  {req.status === 'PENDING' ? (
                    <div className="action-buttons">
                      <button className="approve-btn" onClick={() => handleAction(req.id, 'APPROVED')}>Approve</button>
                      <button className="reject-btn" onClick={() => handleAction(req.id, 'REJECTED')}>Reject</button>
                    </div>
                  ) : (
                    <span>-</span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center">No leave requests found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .dashboard-container { padding: 20px; font-family: sans-serif; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .dashboard-header h1 { color: #333; margin: 0; }
        .back-button { padding: 8px 16px; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; }
        .back-button:hover { background-color: #e0e0e0; }
        
        .requests-table-container { overflow-x: auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .requests-table { width: 100%; border-collapse: collapse; }
        .requests-table th, .requests-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
        .requests-table th { background-color: #f8f9fa; font-weight: 600; color: #555; }
        
        .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
        .status-badge.pending { background-color: #fff3cd; color: #856404; }
        .status-badge.approved { background-color: #d4edda; color: #155724; }
        .status-badge.rejected { background-color: #f8d7da; color: #721c24; }
        
        .action-buttons { display: flex; gap: 8px; }
        .approve-btn, .reject-btn { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; color: white; }
        .approve-btn { background-color: #28a745; }
        .approve-btn:hover { background-color: #218838; }
        .reject-btn { background-color: #dc3545; }
        .reject-btn:hover { background-color: #c82333; }
        
        .text-center { text-align: center; color: #777; }
        .loading { display: flex; justify-content: center; align-items: center; height: 100vh; font-size: 18px; color: #666; }
      `}</style>
    </div>
  );
}
