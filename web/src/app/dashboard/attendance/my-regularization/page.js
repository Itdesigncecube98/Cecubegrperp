'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Info } from 'lucide-react';
import '../attendance.css';

export default function MyRegularizationRequests() {
  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>My Regularization Requests</div>
      </div>

      <div className="card">
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Regularization Request Status</label>
            <select className="filterInput">
              <option>All</option>
              <option>Rejected</option>
              <option>Cancelled</option>
              <option>Pending Approval</option>
              <option>Approved</option>
              <option>Transferred</option>
              <option>Recommended</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Start Date</label>
            <input type="date" className="filterInput" defaultValue="2026-07-06" />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">End Date</label>
            <input type="date" className="filterInput" defaultValue="2026-08-05" />
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
              <h2 className="tableTitle">My Regularization Requests</h2>
              <Info size={16} className="infoIcon" />
            </div>
            <p className="tableSubtitle">The below table shows the list of your attendance regularization requests.</p>
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
                <th>EMPLOYEE</th>
                <th>DATE</th>
                <th>ACTUAL CHECKIN TIME</th>
                <th>ACTUAL CHECKOUT TIME</th>
                <th>REQUESTED CHECKIN TIME</th>
                <th>REQUESTED CHECKOUT TIME</th>
                <th>REASON</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No data available in table</td>
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
