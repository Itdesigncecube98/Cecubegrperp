'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getEmployees, getLeaveRequests } from '../../../../lib/data';
import '../../attendance/attendance.css';

export default function Directory() {
  const [leavesDirectory, setLeavesDirectory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [emps, leaves] = await Promise.all([getEmployees(), getLeaveRequests()]);
        
        // Process data to build a leave directory
        const directory = (emps || []).map(emp => {
          const empLeaves = (leaves || []).filter(l => l.employeeId === emp.id && l.status === 'APPROVED');
          
          let totalDays = 0;
          let datesArr = [];
          let typesSet = new Set();

          empLeaves.forEach(l => {
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            const diffTime = Math.abs(end - start);
            let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            if (l.isHalfDay) diffDays = Math.max(0, diffDays - 0.5);
            totalDays += diffDays;
            
            datesArr.push(l.startDate === l.endDate ? l.startDate : `${l.startDate} to ${l.endDate}`);
            typesSet.add(l.leaveType);
          });

          return {
            ...emp,
            totalLeavesTaken: totalDays,
            leaveDates: datesArr.join(', ') || '-',
            leaveTypes: Array.from(typesSet).join(', ') || '-'
          };
        });

        setLeavesDirectory(directory);
      } catch (e) {
        console.error('Failed to load leaves directory', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Directory</div>
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
            <label className="filterLabel">Filter By</label>
            <select className="filterInput">
              <option>All</option>
              <option>Branch</option>
              <option>Department</option>
              <option>Designation</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Select all</label>
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
              <h2 className="tableTitle">Employee Leaves Directory</h2>
            </div>
            <p className="tableSubtitle">The below table shows the list of employees and their taken leaves.</p>
          </div>
          <div>
            <button className="btn" style={{ background: '#fff', border: '1px solid #f59e0b', color: '#f59e0b' }}>
              &darr; Export
            </button>
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
                <th>PHOTO</th>
                <th>EMPLOYEE CODE</th>
                <th>NAME</th>
                <th>TOTAL LEAVES TAKEN (DAYS)</th>
                <th>LEAVE DATES</th>
                <th>LEAVE TYPES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '1rem' }}>Loading directory...</td>
                </tr>
              ) : leavesDirectory.length > 0 ? (
                leavesDirectory.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#9ca3af', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                        {emp.name.substring(0, 2).toUpperCase()}
                      </div>
                    </td>
                    <td>{emp.employeeCode || emp.empId || 'N/A'}</td>
                    <td>{emp.name}</td>
                    <td><span style={{ fontWeight: 'bold', color: emp.totalLeavesTaken > 0 ? '#d97706' : '#111827' }}>{emp.totalLeavesTaken}</span></td>
                    <td style={{ fontSize: '12px' }}>{emp.leaveDates}</td>
                    <td>
                      <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        {emp.leaveTypes}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '1rem' }}>No employees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="paginationInfo">
          <div>Showing 1 to {leavesDirectory.length} of {leavesDirectory.length} entries</div>
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
