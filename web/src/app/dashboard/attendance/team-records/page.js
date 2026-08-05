'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Info, LayoutTemplate, Download } from 'lucide-react';
import '../attendance.css';

export default function TeamAttendanceRecords() {
  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <h1 className="pageTitle">Attendance Records</h1>
      
      <div className="tabsContainer">
        <Link href="/dashboard/attendance/my-records" className="tab">My Attendance Records</Link>
        <Link href="/dashboard/attendance/team-records" className="tab active">Team Attendance Records</Link>
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
        <div className="filtersRow" style={{ marginTop: '1rem' }}>
          <div className="filterGroup">
            <label className="filterLabel">Attendance Status</label>
            <select className="filterInput">
              <option>All</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Leave Exists</label>
            <select className="filterInput">
              <option>Any</option>
            </select>
          </div>
          <div style={{ flex: 2 }}></div>
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
              <h2 className="tableTitle">Team Attendance Records</h2>
              <Info size={16} className="infoIcon" />
            </div>
            <p className="tableSubtitle">The below table shows the list of your team's attendance records.</p>
          </div>
          <div className="actionButtons">
            <button className="btnOutline"><LayoutTemplate size={14} /> View Columns</button>
            <button className="btnOutline"><Download size={14} /> Export</button>
          </div>
        </div>

        <div className="tableControls">
          <div className="entriesControl">
            <select className="entriesSelect"><option>100</option></select>
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
                <th>EMPLOYEE CODE</th>
                <th>EMPLOYEE NAME</th>
                <th>TIME IN</th>
                <th>TIME OUT</th>
                <th>WORKED HOURS</th>
                <th>LEAVE TYPE</th>
                <th>LEAVE STATUS</th>
                <th>ATTENDANCE STATUS</th>
                <th>REGULARIZATION STATUS</th>
                <th>ACTUAL CHECKIN TIME</th>
                <th>ACTUAL CHECKOUT TIME</th>
                <th>REMARKS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="14" style={{ textAlign: 'center', padding: '2rem' }}>No data available in table</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="paginationArea">
          <div>Showing 0 to 0 of 0 entries</div>
          <div className="paginationButtons">
            <button className="pageBtn" disabled>&laquo;</button>
            <button className="pageBtn" disabled>&lsaquo;</button>
            <button className="pageBtn" disabled>&rsaquo;</button>
            <button className="pageBtn" disabled>&raquo;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
