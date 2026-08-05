'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Info, Eye, PlusSquare, LayoutTemplate, Download } from 'lucide-react';
import { getEmployeeStats } from '../../../../lib/data';
import '../attendance.css';

export default function MyAttendanceRecords() {
  const [employee, setEmployee] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (empData) {
      const parsed = JSON.parse(empData);
      setEmployee(parsed);
      fetchRecords(parsed.id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchRecords = async (id) => {
    setLoading(true);
    try {
      const stats = await getEmployeeStats(id);
      // Flatten the monthly stats into an array of records
      const allRecs = [];
      stats.forEach(month => {
        month.details.forEach(d => {
          let timeIn = '-';
          let timeOut = '-';
          let hours = '0:00';
          if (d.timeSlots && d.timeSlots.length > 0) {
            timeIn = d.timeSlots[0].in || '-';
            timeOut = d.timeSlots[d.timeSlots.length - 1].out || '-';
            
            // Calc hours
            let totalHours = 0;
            d.timeSlots.forEach(slot => {
              if (slot.in && slot.out) {
                const inT = new Date(`1970-01-01T${slot.in}:00`);
                const outT = new Date(`1970-01-01T${slot.out}:00`);
                totalHours += (outT - inT) / (1000 * 60 * 60);
              }
            });
            hours = `${Math.floor(totalHours)}:${Math.round((totalHours % 1) * 60).toString().padStart(2, '0')}`;
          }
          
          allRecs.push({
            date: d.date,
            code: 'CEIPL059', // Will override with real emp code in UI
            name: 'Me',
            timeIn,
            timeOut,
            hours,
            leaveType: '-',
            leaveStatus: '-',
            attStatus: d.status
          });
        });
      });
      // Sort by date desc
      allRecs.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(allRecs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <h1 className="pageTitle">Attendance Records</h1>
      
      <div className="tabsContainer">
        <Link href="/dashboard/attendance/my-records" className="tab active">My Attendance Records</Link>
        <Link href="/dashboard/attendance/team-records" className="tab">Team Attendance Records</Link>
      </div>

      <div className="card">
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Start Date</label>
            <input type="date" className="filterInput" defaultValue="2026-07-06" />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">End Date</label>
            <input type="date" className="filterInput" defaultValue="2026-08-05" />
          </div>
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
              <h2 className="tableTitle">My Attendance Records</h2>
              <Info size={16} className="infoIcon" />
            </div>
            <p className="tableSubtitle">The below table shows the list of your attendance records.</p>
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
              {loading ? (
                <tr>
                  <td colSpan="14" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="14" style={{ textAlign: 'center', padding: '2rem' }}>No records found</td>
                </tr>
              ) : (
                records.map((r, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'pre-line' }}>{r.date}</td>
                    <td>{employee?.employeeCode || r.code}</td>
                    <td>{employee?.name || r.name}</td>
                    <td>{r.timeIn}</td>
                    <td>{r.timeOut}</td>
                    <td>{r.hours}</td>
                    <td>{r.leaveType}</td>
                    <td>{r.leaveStatus}</td>
                    <td>
                      <span className={`badge badge-${r.attStatus === 'Present' ? 'success' : r.attStatus === 'Absent' ? 'danger' : 'warning'}`}>
                        {r.attStatus}
                      </span>
                    </td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>
                      <button className="linkBtn"><PlusSquare size={14} /> View Details</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
