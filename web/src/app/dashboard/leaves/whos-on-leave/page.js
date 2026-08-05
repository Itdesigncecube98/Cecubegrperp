'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import '../../attendance/attendance.css';

export default function WhosOnLeave() {
  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Team's Leave List</div>
      </div>

      <div className="card">
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Organization</label>
            <select className="filterInput">
              <option>All</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Date</label>
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
              <h2 className="tableTitle">Team's Leave List</h2>
            </div>
            <p className="tableSubtitle">The below table shows the list of your team's leave.</p>
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
                <th>EMPLOYEE NAME</th>
                <th>LEAVE TYPE</th>
                <th>NO OF DAYS</th>
                <th>FROM DATE</th>
                <th>TO DATE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No data available in table</td>
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
