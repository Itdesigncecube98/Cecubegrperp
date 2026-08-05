'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, MapPin } from 'lucide-react';
import { getAttendance, requestLocation } from '../../../../lib/data';
import '../../attendance/attendance.css';

export default function JourneySummary() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData(date);
  }, [date]);

  const fetchData = async (d) => {
    setLoading(true);
    try {
      const data = await getAttendance(d);
      const mapped = data.map(att => {
        let status = 'NOT STARTED';
        if (att.timeSlots) {
          try {
            const slots = JSON.parse(att.timeSlots);
            if (slots.length > 0) {
              const lastSlot = slots[slots.length - 1];
              if (lastSlot.in && !lastSlot.out) {
                status = 'IN PROGRESS';
              } else if (lastSlot.in && lastSlot.out) {
                status = 'COMPLETED';
              }
            }
          } catch(e) {}
        }
        return {
          code: att.employee.employeeCode || att.employee.empId || 'N/A',
          employeeId: att.employee.id,
          name: att.employee.name,
          status
        };
      });
      setRecords(mapped);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLocation = async (employeeId) => {
    try {
      const res = await requestLocation(employeeId);
      if (res && res.error) {
        alert('Failed to send location request: ' + res.error);
      } else {
        alert('Location request sent successfully!');
      }
    } catch(e) {
      alert('Failed to send location request.');
      console.error(e);
    }
  };
  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <h1 className="pageTitle">Summary View</h1>

      <div className="tabsContainer">
        <Link href="/dashboard/journey/summary" className="tab active">Employee Wise</Link>
        <Link href="#" className="tab">Group Wise</Link>
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
            <label className="filterLabel">Date</label>
            <input type="date" className="filterInput" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Filter By</label>
            <select className="filterInput">
              <option>All</option>
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
              <h2 className="tableTitle">Employee Wise</h2>
            </div>
            <p className="tableSubtitle">The below table shows the list of employee wise records.</p>
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
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No records found</td>
                </tr>
              ) : (
                records.map((r, i) => (
                  <tr key={i}>
                    <td>{r.code}</td>
                    <td>{r.name}</td>
                    <td>
                      <span style={{ 
                        backgroundColor: r.status === 'COMPLETED' ? '#dcfce7' : r.status === 'IN PROGRESS' ? '#dbeafe' : '#fffbeb', 
                        color: r.status === 'COMPLETED' ? '#16a34a' : r.status === 'IN PROGRESS' ? '#2563eb' : '#d97706', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        fontWeight: 'bold',
                        border: `1px solid ${r.status === 'COMPLETED' ? '#bbf7d0' : r.status === 'IN PROGRESS' ? '#bfdbfe' : '#fde68a'}`
                      }}>{r.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <Link href={`/dashboard/journey/detail?id=${r.code}`} style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '13px' }}>View Detail</Link>
                        <button onClick={() => handleRequestLocation(r.employeeId)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                          <MapPin size={14} /> Request Location
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="paginationArea">
          <div>Showing 1 to {records.length} of {records.length} entries</div>
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
