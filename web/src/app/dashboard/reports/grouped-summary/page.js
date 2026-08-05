'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import '../../attendance/attendance.css';

export default function GroupedSummary() {
  return (
    <div className="pageContainer">
      <Link href="/dashboard/reports" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Grouped Summary Report</div>
      </div>

      <div className="card">
        {/* Row 1 */}
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Organization*</label>
            <select className="filterInput">
              <option>Cecube Engineering India Pvt Ltd</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Date From*</label>
            <input type="date" className="filterInput" />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Date To*</label>
            <input type="date" className="filterInput" />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Group By*</label>
            <select className="filterInput">
              <option>Any</option>
            </select>
          </div>
        </div>
        {/* Row 2 */}
        <div className="filtersRow">
          <div className="filterGroup" style={{ flex: 1, minWidth: '200px' }}>
            <label className="filterLabel">Statuses to consider as Present</label>
            <select className="filterInput">
              <option>Only Present</option>
            </select>
          </div>
          <div className="filterGroup" style={{ flex: 1, minWidth: '200px' }}>
            <label className="filterLabel">Report Type*</label>
            <select className="filterInput">
              <option>Attendance Only</option>
              <option>Attendance & Leave</option>
            </select>
          </div>
          <div className="filterGroup" style={{ flex: 2 }}></div>
        </div>

        <div className="filterActions" style={{ justifyContent: 'space-between', marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn" style={{ background: '#f3f4f6', color: '#9ca3af' }}>View</button>
            <button className="btn btnPrimary">Clear</button>
          </div>
          <button className="btn btnPrimary">More Filters</button>
        </div>
      </div>
      
    </div>
  );
}
