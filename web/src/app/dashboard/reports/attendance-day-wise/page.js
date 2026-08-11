'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download } from 'lucide-react';
import { exportToCSV } from '../../../../lib/exportUtils';
import '../../attendance/attendance.css';

function getDaysInRange(startDate, endDate) {
  const days = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function fmt(dateObj) {
  return dateObj.toISOString().split('T')[0];
}

export default function DayWiseAttendance() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);

  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 10);
  const [startDate, setStartDate] = useState(fmt(monday));
  const [endDate, setEndDate] = useState(fmt(sunday));

  const fetchData = async () => {
    setLoading(true);
    const dateRange = getDaysInRange(startDate, endDate);

    try {
      const empRes = await fetch('/api/employees');
      const emps = await empRes.json();
      const totalEmployees = emps.length;

      const results = [];
      await Promise.all(dateRange.map(async (d) => {
        const dateStr = fmt(d);
        const res = await fetch(`/api/attendance?date=${dateStr}`);
        const data = await res.json();
        
        let present = 0;
        let absent = 0;
        let late = 0;
        let wo = 0;

        if (Array.isArray(data)) {
          data.forEach(rec => {
            if (rec.status === 'Present') present++;
            else if (rec.status === 'Absent') absent++;
            else if (rec.status === 'Late') late++;
            else if (rec.status === 'Weekly Off' || rec.status === 'WO') wo++;
          });
        }
        
        results.push({
          date: dateStr,
          all: totalEmployees,
          present,
          absent,
          late,
          earlyGoing: 0,
          lcEg: 0,
          holiday: 0,
          wo,
          halfDay: 0
        });
      }));

      results.sort((a, b) => a.date.localeCompare(b.date));
      setTableData(results);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    fetchData();
  }, [startDate, endDate]);


  const handleClear = () => {
    setStartDate(fmt(monday));
    setEndDate(fmt(sunday));
    setTableData([]);
  };

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
            <input type="date" className="filterInput" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Date To*</label>
            <input type="date" className="filterInput" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="filterActions" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btnPrimary" onClick={fetchData}>View</button>
            <button className="btn btnPrimary" onClick={handleClear} style={{ background: '#f3f4f6', color: '#9ca3af', border: '1px solid #e5e7eb' }}>Clear</button>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btnPrimary" style={{ background: '#10b981' }} onClick={() => exportToCSV('attendance-day-wise.csv', tableData)}>
              <Download size={16} style={{ marginRight: '8px' }} />
              Export
            </button>
            <button className="btn btnPrimary">More Filters</button>
          </div>
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
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>Loading summary data...</td>
                </tr>
              ) : tableData.length > 0 ? (
                tableData.map(row => (
                  <tr key={row.date}>
                    <td>{row.date.split('-').reverse().join('-')}</td>
                    <td style={{ textAlign: 'center' }}>{row.all}</td>
                    <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 500 }}>{row.present}</td>
                    <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 500 }}>{row.absent}</td>
                    <td style={{ textAlign: 'center', color: '#d97706', fontWeight: 500 }}>{row.late}</td>
                    <td style={{ textAlign: 'center' }}>{row.earlyGoing}</td>
                    <td style={{ textAlign: 'center' }}>{row.lcEg}</td>
                    <td style={{ textAlign: 'center' }}>{row.holiday}</td>
                    <td style={{ textAlign: 'center', color: '#6b7280', fontWeight: 500 }}>{row.wo}</td>
                    <td style={{ textAlign: 'center' }}>{row.halfDay}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No data available in table</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="paginationArea">
          <div>Showing {tableData.length > 0 ? 1 : 0} to {tableData.length} of {tableData.length} entries</div>
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
