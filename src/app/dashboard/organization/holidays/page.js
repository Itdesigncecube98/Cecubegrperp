'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import '../../attendance/attendance.css';

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaves/holidays')
      .then((res) => res.json())
      .then((data) => {
        setHolidays(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function renderRows() {
    if (loading) {
      return (
        <tr>
          <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>
            Loading...
          </td>
        </tr>
      );
    }
    if (holidays.length === 0) {
      return (
        <tr>
          <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>
            No data available in table
          </td>
        </tr>
      );
    }
    return holidays.map((h) => (
      <tr key={h.id}>
        <td>{formatDate(h.date)}</td>
        <td>{h.name}</td>
      </tr>
    ));
  }

  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>

      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Holidays</div>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">Holidays &amp; Optional Holidays</h2>
            </div>
            <p className="tableSubtitle">The below table shows the list of holidays.</p>
          </div>
          <div>
            <select className="filterInput" style={{ width: '200px' }}>
              <option>Calendar Year 2026</option>
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
                <th>DATE</th>
                <th>NAME</th>
              </tr>
            </thead>
            <tbody>
              {renderRows()}
            </tbody>
          </table>
        </div>

        <div className="paginationArea">
          <div>Showing {loading ? 0 : holidays.length} of {loading ? 0 : holidays.length} entries</div>
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
