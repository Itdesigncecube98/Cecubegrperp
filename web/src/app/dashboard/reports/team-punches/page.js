'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import '../../attendance/attendance.css';

export default function TeamPunches() {
  return (
    <div className="pageContainer">
      <Link href="/dashboard/reports" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Team Punches</div>
      </div>

      <div className="card">
        {/* Row 1 */}
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
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Start Date</label>
            <input type="date" className="filterInput" defaultValue="2026-08-05" />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">End Date</label>
            <input type="date" className="filterInput" />
          </div>
        </div>
        {/* Row 2 */}
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Mode of Entry</label>
            <select className="filterInput">
              <option>Any</option>
              <option>Supervisor Entry</option>
              <option>Mobile GPS Entry</option>
              <option>Biometric Entry</option>
              <option>Web Entry</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Punch Type</label>
            <select className="filterInput">
              <option>Any</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">View Type</label>
            <select className="filterInput">
              <option>Compact View</option>
            </select>
          </div>
          <div className="filterGroup"></div>
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
              <h2 className="tableTitle">Team Punches</h2>
            </div>
            <p className="tableSubtitle">The below table shows the list of punches of your team.</p>
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
                <th>ORGANIZATION</th>
                <th>EMPLOYEE CODE</th>
                <th>EMPLOYEE NAME</th>
                <th>DATE</th>
                <th>TIME</th>
                <th>TYPE</th>
                <th>MODE OF ENTRY</th>
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
