'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import '../../attendance/attendance.css';

export default function PersonalDocuments() {
  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Document Type</label>
            <select className="filterInput">
              <option></option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Expires In</label>
            <select className="filterInput">
              <option></option>
            </select>
          </div>
        </div>
        <div className="filterActions" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btnPrimary">View</button>
            <button className="btn btnPrimary">Clear</button>
          </div>
          <button className="btn btnPrimary">Add Document</button>
        </div>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">Employee Personal Documents</h2>
            </div>
            <p className="tableSubtitle">The below table shows the list of your Personal Documents.</p>
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
                <th>EMPLOYEE CODE</th>
                <th>EMPLOYEE NAME</th>
                <th>DOCUMENT TYPE</th>
                <th>DOCUMENT NUMBER</th>
                <th>EXPIRY DATE</th>
                <th>EXPIRES IN</th>
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
