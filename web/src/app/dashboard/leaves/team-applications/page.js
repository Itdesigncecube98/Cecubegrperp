'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Info, Check, X } from 'lucide-react';
import { getLeaveRequests, updateLeaveRequestStatus, getEmployees } from '../../../../lib/data';
import '../../attendance/attendance.css';

export default function TeamLeaveApplications() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchRequests();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data || []);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  const fetchRequests = async () => {
    try {
      const data = await getLeaveRequests();
      setRequests(data || []);
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

  const calculateDays = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Team Leave Applications</div>
      </div>

      <div className="card">
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Organization</label>
            <select className="filterInput">
              <option>Cecube Engineering India Pvt Ltd</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Employee</label>
            <select className="filterInput">
              <option>Any</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode})</option>
              ))}
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Category</label>
            <select className="filterInput">
              <option>All</option>
              <option>Leave without pay</option>
              <option>Maternity</option>
              <option>On duty</option>
              <option>Paid leave</option>
              <option>Casual</option>
              <option>Sick</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Status</label>
            <select className="filterInput">
              <option>All</option>
              <option>Rejected</option>
              <option>Cancelled</option>
              <option>Pending approval</option>
              <option>Scheduled</option>
              <option>Taken</option>
              <option>Weekend</option>
              <option>Holiday</option>
              <option>Level 1 recommended</option>
              <option>Level 2 recommended</option>
              <option>Level 3 recommended</option>
              <option>Transferred</option>
            </select>
          </div>
        </div>
        <div className="filtersRow" style={{ marginTop: '1rem' }}>
          <div className="filterGroup">
            <label className="filterLabel">Start Date</label>
            <input type="date" className="filterInput" />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">End Date</label>
            <input type="date" className="filterInput" />
          </div>
          <div style={{ flex: 2 }}></div>
        </div>
        <div className="filterActions" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btnPrimary" onClick={fetchRequests}>View</button>
            <button className="btn btnPrimary">Clear</button>
          </div>
          <button className="btn btnPrimary">More Filters</button>
        </div>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">Team Leave Applications</h2>
              <Info size={16} className="infoIcon" />
            </div>
            <p className="tableSubtitle">The below table shows the list of your team's leave applications.</p>
          </div>
          <div className="actionButtons" style={{ gap: '0.5rem', display: 'flex' }}>
            <select className="filterInput" style={{ minWidth: '150px' }}>
              <option>Select bulk action</option>
            </select>
            <button className="btn" style={{ background: '#e5e7eb', color: '#9ca3af', border: '1px solid #d1d5db' }}>Go</button>
          </div>
        </div>

        <div className="tableControls">
          <div className="entriesControl">
            <select className="entriesSelect"><option>All</option></select>
            entries per page
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="dataTable">
            <thead>
              <tr>
                <th>EMPLOYEE NAME</th>
                <th>CATEGORY</th>
                <th>START DATE</th>
                <th>END DATE</th>
                <th>NO OF DAYS</th>
                <th>STATUS</th>
                <th>REASON</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No data available in table</td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id}>
                    <td>{req.employee?.name || 'Unknown'}</td>
                    <td>{req.leaveType}</td>
                    <td>{req.startDate}</td>
                    <td>{req.endDate}</td>
                    <td>{calculateDays(req.startDate, req.endDate)}</td>
                    <td>
                      <span style={{
                        backgroundColor: req.status === 'PENDING' ? '#fef3c7' : req.status === 'APPROVED' ? '#dcfce7' : '#fee2e2',
                        color: req.status === 'PENDING' ? '#d97706' : req.status === 'APPROVED' ? '#16a34a' : '#dc2626',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: '500'
                      }}>
                        {req.status}
                      </span>
                    </td>
                    <td>{req.reason}</td>
                    <td>
                      {req.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handleAction(req.id, 'APPROVED')}
                            style={{ padding: '0.3rem', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#16a34a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Approve"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={() => handleAction(req.id, 'REJECTED')}
                            style={{ padding: '0.3rem', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Reject"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="paginationArea">
          <div>Showing {requests.length > 0 ? 1 : 0} to {requests.length} of {requests.length} entries</div>
          <div className="paginationButtons">
            <button className="pageBtn" disabled>&lsaquo;</button>
            <button className="pageBtn active">1</button>
            <button className="pageBtn" disabled>&rsaquo;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
