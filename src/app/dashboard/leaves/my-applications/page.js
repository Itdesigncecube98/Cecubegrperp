'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Info } from 'lucide-react';
import '../../attendance/attendance.css';

export default function MyLeaveApplications() {
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
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No data available in table</td>
              </tr>
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
