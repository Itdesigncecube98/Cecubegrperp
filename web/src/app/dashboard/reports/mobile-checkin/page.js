'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import '../../attendance/attendance.css';

export default function MobileCheckin() {
  return (
    <div className="pageContainer">
      <Link href="/dashboard/reports" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
        <h1 style={{ fontSize: '16px', color: '#111827', margin: 0 }}>Mobile Checkin Report</h1>
        <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid #e5e7eb', width: '100%' }}>
          <div className="tab active" style={{ fontSize: '14px', borderBottom: '2px solid #f59e0b', paddingBottom: '0.5rem', cursor: 'pointer' }}>My Mobile Checkin Report</div>
          <div className="tab" style={{ fontSize: '14px', color: '#9ca3af', paddingBottom: '0.5rem', cursor: 'pointer' }}>Team Mobile Checkin Report</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        {/* Row 1 */}
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Start Date</label>
            <input type="date" className="filterInput" defaultValue="2026-07-29" />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">End Date</label>
            <input type="date" className="filterInput" defaultValue="2026-08-05" />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Location Type</label>
            <select className="filterInput">
              <option>Any</option>
              <option>CUSTOMER</option>
              <option>OFFICE</option>
              <option>OTHERS</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Entity Name</label>
            <select className="filterInput">
              <option>Any</option>
            </select>
          </div>
        </div>
        {/* Row 2 */}
        <div className="filtersRow">
          <div className="filterGroup" style={{ maxWidth: '200px' }}>
            <label className="filterLabel">View Type</label>
            <select className="filterInput">
              <option>Detail View</option>
            </select>
          </div>
        </div>

        <div className="filterActions">
          <button className="btn btnPrimary">View</button>
          <button className="btn btnPrimary">Clear</button>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '2rem', color: '#6b7280', fontSize: '14px' }}>
        No records found
      </div>
      
    </div>
  );
}
