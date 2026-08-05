'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Info } from 'lucide-react';
import '../../attendance/attendance.css';

export default function LeaveBalances() {
  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <h1 className="pageTitle">Leave Balances</h1>
      
      <div className="tabsContainer">
        <Link href="/dashboard/leaves/balances" className="tab active">My Leave Balances</Link>
        <Link href="#" className="tab">Team Leave Balances</Link>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">My Leave Balances</h2>
              <Info size={16} className="infoIcon" />
            </div>
            <p className="tableSubtitle">The below table shows the list of your leave balances.</p>
          </div>
          <div>
            <label className="filterLabel">For Leave Cycle</label>
            <select className="filterInput">
              <option>Cecube Engineering India Pvt Ltd 2026-01-01 - 2026-12-31</option>
            </select>
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
                <th>LEAVE TYPE</th>
                <th>LEAVE ENTITLEMENTS (DAYS)</th>
                <th>LEAVE PENDING APPROVAL (DAYS)</th>
                <th>LEAVE USED (DAYS)</th>
                <th>LEAVE BALANCE (DAYS)</th>
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
