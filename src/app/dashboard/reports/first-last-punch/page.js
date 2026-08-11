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

export default function FirstLastPunchMuster() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});

  const today = new Date();
  const startObj = new Date(today.getFullYear(), today.getMonth(), 1);
  const endObj = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(fmt(startObj));
  const [endDate, setEndDate] = useState(fmt(endObj));
  const [showGrid, setShowGrid] = useState(false);

  const dateRange = getDaysInRange(startDate, endDate);

  const fetchData = async () => {
    setLoading(true);
    setShowGrid(true);
    try {
      const empRes = await fetch('/api/employees');
      const emps = await empRes.json();
      setEmployees(emps);

      const attRes = await fetch(`/api/attendance?startDate=${startDate}&endDate=${endDate}`);
      const atts = await attRes.json();
      
      const attMap = {};
      if (Array.isArray(atts)) {
        atts.forEach(a => {
          if (!attMap[a.employeeId]) attMap[a.employeeId] = {};
          attMap[a.employeeId][a.date] = a;
        });
      }
      setAttendanceData(attMap);
    } catch (e) {
      console.error(e);
      setAttendanceData({});
    }
    setLoading(false);
  };

  const handleClear = () => {
    setStartDate(fmt(startObj));
    setEndDate(fmt(endObj));
    setShowGrid(false);
    setAttendanceData({});
  };

  return (
    <div className="pageContainer">
      <Link href="/dashboard/reports" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>First and Last Punch Muster Report</div>
      </div>

      <div className="card">
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Date From*</label>
            <input type="date" className="filterInput" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Date To*</label>
            <input type="date" className="filterInput" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Organization</label>
            <select className="filterInput">
              <option>Cecube Engineering India Pvt Ltd</option>
            </select>
          </div>
        </div>

        <div className="filterActions" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btnPrimary" onClick={fetchData}>View</button>
            <button className="btn" style={{ background: '#f3f4f6', color: '#9ca3af' }} onClick={handleClear}>Clear</button>
          </div>
          <button className="btn btnPrimary" style={{ background: '#10b981' }} onClick={() => {
            if (employees.length === 0) return;
            const rows = employees.map(emp => {
              const row = {
                'EMP CODE': emp.empId,
                'BRANCH': emp.branch || '—',
                'DESIGNATION': emp.designation || '—',
                'NAME': emp.name
              };
              dateRange.forEach(d => {
                const dateStr = fmt(d);
                const firstLast = firstLastData[emp.id] && firstLastData[emp.id][dateStr];
                if (firstLast) {
                  row[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`] = `IN: ${firstLast.firstIn || '—'} / OUT: ${firstLast.lastOut || '—'}`;
                } else {
                  row[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`] = '—';
                }
              });
              return row;
            });
            exportToCSV('first-last-punch.csv', rows);
          }}>
            <Download size={16} style={{ marginRight: '8px' }} />
            Export
          </button>
        </div>
      </div>

      {showGrid && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="tableHeaderRow">
            <div>
              <div className="tableTitleArea">
                <h2 className="tableTitle">First & Last Punch Muster</h2>
              </div>
              <p className="tableSubtitle">Shows the first IN time and last OUT time for each day.</p>
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
            <table className="dataTable musterTable">
              <thead>
                <tr>
                  <th className="stickyCol" style={{ minWidth: '100px' }}>EMP CODE</th>
                  <th className="stickyCol" style={{ minWidth: '120px', left: '100px' }}>BRANCH</th>
                  <th className="stickyCol" style={{ minWidth: '150px', left: '220px' }}>DESIGNATION</th>
                  <th className="stickyCol" style={{ minWidth: '150px', left: '370px' }}>NAME</th>
                  {dateRange.map((d, i) => (
                    <th key={i} style={{ minWidth: '80px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>{d.getFullYear()}-</div>
                      <div>{String(d.getMonth()+1).padStart(2,'0')}-{String(d.getDate()).padStart(2,'0')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4 + dateRange.length} style={{ textAlign: 'center', padding: '2rem' }}>Loading report...</td>
                  </tr>
                ) : employees.length > 0 ? (
                  employees.map(emp => (
                    <tr key={emp.id}>
                      <td className="stickyCol">{emp.empId}</td>
                      <td className="stickyCol" style={{ left: '100px' }}>{emp.branch || '—'}</td>
                      <td className="stickyCol" style={{ left: '220px' }}>{emp.designation || '—'}</td>
                      <td className="stickyCol" style={{ left: '370px', fontWeight: 500 }}>{emp.name}</td>
                      
                      {dateRange.map((d, i) => {
                        const dateStr = fmt(d);
                        const dayAtt = attendanceData[emp.id] && attendanceData[emp.id][dateStr];
                        
                        let firstIn = '—';
                        let lastOut = '—';

                        if (dayAtt && dayAtt.timeSlots) {
                          try {
                            const slots = JSON.parse(dayAtt.timeSlots);
                            if (slots.length > 0) {
                              firstIn = slots[0].in || '—';
                              lastOut = slots[slots.length - 1].out || '—';
                            }
                          } catch (e) {}
                        }

                        return (
                          <td key={i} style={{ textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                            <div style={{ color: '#16a34a', fontSize: '12px', fontWeight: 500 }}>{firstIn}</div>
                            <div style={{ color: '#dc2626', fontSize: '12px', fontWeight: 500 }}>{lastOut}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4 + dateRange.length} style={{ textAlign: 'center', padding: '2rem' }}>No data available in table</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
