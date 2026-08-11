'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getLeaveRequests, updateLeaveRequestStatus } from '../../../../lib/data';

export default function SupervisorApprovalsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userData = sessionStorage.getItem('adminData') || sessionStorage.getItem('employeeData');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    const parsed = JSON.parse(userData);
    setUserRole(parsed.role || 'EMPLOYEE');
    setUserId(parsed.id);
    
    // Only supervisors and admins can access this page
    if (parsed.role !== 'SUPERVISOR' && parsed.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    
    fetchRequests(parsed.role, parsed.id);
  }, [router]);

  const fetchRequests = async (role, id) => {
    try {
      // API filters by role automatically:
      // role=SUPERVISOR → returns PENDING_SUPERVISOR for their team
      // role=ADMIN → returns PENDING_ADMIN for all
      const response = await fetch(`/api/leaves?role=${role}&userId=${id}`);
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching leave requests", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await updateLeaveRequestStatus(id, 'APPROVED', userId, userRole);
      fetchRequests(userRole, userId);
    } catch (error) {
      console.error(`Error approving request ${id}`, error);
      alert('Failed to approve leave request');
    }
  };

  const handleReject = async (id) => {
    try {
      await updateLeaveRequestStatus(id, 'REJECTED', userId, userRole);
      fetchRequests(userRole, userId);
    } catch (error) {
      console.error(`Error rejecting request ${id}`, error);
      alert('Failed to reject leave request');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'PENDING_SUPERVISOR': { text: 'Pending Supervisor', color: 'bg-yellow-100 text-yellow-800' },
      'PENDING_ADMIN': { text: 'Pending Admin', color: 'bg-blue-100 text-blue-800' },
      'APPROVED': { text: 'Approved', color: 'bg-green-100 text-green-800' },
      'REJECTED': { text: 'Rejected', color: 'bg-red-100 text-red-800' }
    };
    
    const badge = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.text}</span>;
  };

  if (loading) {
    return <div className="loading">Loading leave requests...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Leave Approvals - {userRole === 'SUPERVISOR' ? 'Supervisor' : 'Admin'}</h1>
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
                <td>{req.leaveType === 'COFF' ? 'Compensatory Off' : req.leaveType}</td>
                <td>{req.startDate} to {req.endDate}</td>
                <td>{req.reason}</td>
                <td>{new Date(req.appliedOn).toLocaleDateString()}</td>
                <td>{getStatusBadge(req.status)}</td>
                <td>
                  {(req.status === 'PENDING_SUPERVISOR' && userRole === 'SUPERVISOR') || 
                   (req.status === 'PENDING_ADMIN' && userRole === 'ADMIN') ? (
                    <div className="action-buttons">
                      <button className="approve-btn" onClick={() => handleApprove(req.id)}>Approve</button>
                      <button className="reject-btn" onClick={() => handleReject(req.id)}>Reject</button>
                    </div>
                  ) : (
                    <span>-</span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center">No leave requests pending your approval.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .dashboard-container { padding: 20px; font-family: sans-serif; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .dashboard-header h1 { font-size: 24px; color: #333; }
        .back-button { background: #6b7280; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        .back-button:hover { background: #4b5563; }
        
        .requests-table-container { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
        .requests-table { width: 100%; border-collapse: collapse; }
        .requests-table th { background: #f9fafb; padding: 12px 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
        .requests-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #4b5563; }
        .requests-table tr:hover { background: #f9fafb; }
        
        .status-badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
        .status-badge.pending { background: #fef3c7; color: #92400e; }
        .status-badge.approved { background: #d1fae5; color: #065f46; }
        .status-badge.rejected { background: #fee2e2; color: #991b1b; }
        
        .action-buttons { display: flex; gap: 8px; }
        .approve-btn { background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .approve-btn:hover { background: #059669; }
        .reject-btn { background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .reject-btn:hover { background: #dc2626; }
        
        .text-center { text-align: center; }
        .loading { display: flex; justify-content: center; align-items: center; height: 200px; font-size: 18px; color: #666; }
      `}</style>
    </div>
  );
}