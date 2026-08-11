'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAttendance } from '../../../../lib/data';
import '../../attendance/attendance.css';

export default function WhosOnLeave() {
  const [attendance, setAttendance] = useState([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
  }, []);

  useEffect(() => {
    if (date) fetchData();
  }, [date]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // getAttendance returns { employee, status, timeSlots } for ALL employees
      const att = await getAttendance(date);
      setAttendance(att || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Absentees = employees whose status is 'Not Marked' (no record for this date)
  // The attendance API always returns all employees, so this is safe
  const absentees = attendance.filter(
    a => !a.status || a.status === 'Not Marked'
  );

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
            <input 
              type="date" 
              className="filterInput" 
              value={date}
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>
        </div>
        <div className="filterActions">
          <button className="btn btnPrimary" onClick={fetchData}>View</button>
          <button className="btn btnPrimary" onClick={() => setDate(new Date().toISOString().split('T')[0])}>Clear</button>
        </div>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">Team's Leave List</h2>
            </div>
            <p className="tableSubtitle">The below table shows the list of your team's absentees for {date}.</p>
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
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td>
                </tr>
              ) : absentees.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No absentees found for this date.</td>
                </tr>
              ) : (
                absentees.map(a => (
                  <tr key={a.employee?.id}>
                    <td>{a.employee?.name || a.employee?.email || '—'}</td>
                    <td>Absent</td>
                    <td>1</td>
                    <td>{date}</td>
                    <td>{date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="paginationArea">
          <div>Showing {absentees.length > 0 ? 1 : 0} to {absentees.length} of {absentees.length} entries</div>
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
