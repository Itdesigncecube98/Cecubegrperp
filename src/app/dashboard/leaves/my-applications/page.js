'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Info } from 'lucide-react';
import { getLeaveAttachmentLink } from '../../../../lib/leaveAttachmentLink';
import '../../attendance/attendance.css';

export default function MyLeaveApplications() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = sessionStorage.getItem('adminData') || localStorage.getItem('employeeData');
    if (!userData) {
      setLoading(false);
      return;
    }

    let active = true;
    async function loadRequests() {
      try {
        const { id } = JSON.parse(userData);
        const response = await fetch(`/api/leaves?employeeId=${encodeURIComponent(id)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load leave applications.');
        if (active) setRequests(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load leave applications:', error);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadRequests();
    return () => { active = false; };
  }, []);

  const calculateDays = request => {
    const start = new Date(`${request.startDate}T00:00:00`);
    const end = new Date(`${request.endDate}T00:00:00`);
    const fullDays = Math.floor((end - start) / 86400000) + 1;
    return Math.max(0, fullDays - (request.isHalfDay ? 0.5 : 0));
  };

  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>My Leave Applications</div>
      </div>

      <div className="card">
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Category</label>
            <select className="filterInput">
              <option>All</option>
              <option>Leave without pay</option>
              <option>Maternity</option>
              <option>On duty</option>
              <option>Paid leave</option>
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
          <div className="filterGroup">
            <label className="filterLabel">Start Date</label>
            <input type="date" className="filterInput" defaultValue="2026-07-06" />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">End Date</label>
            <input type="date" className="filterInput" defaultValue="2026-10-04" />
          </div>
        </div>
        <div className="filterActions">
          <button className="btn btnPrimary">View</button>
          <button className="btn btnPrimary">Clear</button>
        </div>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">My Leave Applications</h2>
              <Info size={16} className="infoIcon" />
            </div>
            <p className="tableSubtitle">The below table shows the list of your leave applications.</p>
          </div>
          <div>
            <Link href="/dashboard/leaves/apply" className="btn btnPrimary" style={{ textDecoration: 'none' }}>Apply for Leave</Link>
          </div>
        </div>

        <div className="tableControls">
          <div className="entriesControl">
            <select className="entriesSelect"><option>All</option></select>
            entries per page
          </div>
          <div className="searchControl">
            Search: <input type="text" className="searchInput" />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="dataTable">
            <thead>
              <tr>
                <th>CATEGORY</th>
                <th>START DATE</th>
                <th>END DATE</th>
                <th>TOTAL LEAVE DAYS</th>
                <th>STATUS</th>
                <th>REASON</th>
                <th>SUPPORTING DOCUMENT</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
              ) : requests.length ? requests.map(request => {
                const attachment = getLeaveAttachmentLink(request.attachment);
                return (
                  <tr key={request.id}>
                    <td>{request.leaveType}</td>
                    <td>{request.startDate}</td>
                    <td>{request.endDate}{request.isHalfDay ? ' (Half day)' : ''}</td>
                    <td>{calculateDays(request)}</td>
                    <td>{request.status}</td>
                    <td>{request.reason || '—'}</td>
                    <td>
                      {attachment
                        ? <a href={attachment.href} target="_blank" rel="noopener noreferrer" download={attachment.download}>Open document</a>
                        : '—'}
                    </td>
                    <td>—</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No leave applications found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="paginationArea">
          <div>Showing 0 to 0 of 0 entries</div>
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
