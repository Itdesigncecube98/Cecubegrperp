'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import '../../attendance/attendance.css';

export default function DayWiseAttendance() {
  return (
    <div className="pageContainer">
      <Link href="/dashboard/reports" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Day Wise Attendance Summary</div>
      </div>

      <div className="card">
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Organization*</label>
            <select className="filterInput">
              <option>Cecube Engineering India Pvt Ltd</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Date From*</label>
            <input type="date" className="filterInput" defaultValue="2026-07-06" />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Date To*</label>
            <input type="date" className="filterInput" defaultValue="2026-08-05" />
          </div>
        </div>
        <div className="filterActions" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btnPrimary">View</button>
            <button className="btn btnPrimary">Clear</button>
          </div>
          <button className="btn btnPrimary">More Filters</button>
        </div>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">Attendance Summary</h2>
            </div>
            <p className="tableSubtitle">The below table shows the list of Attendance Summary for selected from and to date.</p>
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
                <th>DATE</th>
                <th>ALL</th>
                <th>PRESENT</th>
                <th>ABSENT</th>
                <th>LATE COMING</th>
                <th>EARLY GOING</th>
                <th>LC/EG</th>
                <th>HOLIDAY</th>
                <th>WEEKLY-OFF</th>
                <th>HALF DAY</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No data available in table</td>
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
