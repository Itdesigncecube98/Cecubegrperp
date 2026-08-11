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

function parseTimeSlots(ts) {
  try { return ts ? JSON.parse(ts) : []; } catch { return []; }
}

export default function AttendanceMuster() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(false);

  // Date range - default current week
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 10);

  const [startDate, setStartDate] = useState(fmt(monday));
  const [endDate, setEndDate] = useState(fmt(sunday));
  const [showGrid, setShowGrid] = useState(false);
  const [days, setDays] = useState([]);

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setShowGrid(true);
    const dateRange = getDaysInRange(startDate, endDate);
    setDays(dateRange);

    try {
      const empRes = await fetch('/api/employees');
      const emps = await empRes.json();
      setEmployees(emps);

      // Fetch attendance for each day in range
      const map = {};
      await Promise.all(dateRange.map(async (d) => {
        const dateStr = fmt(d);
        const res = await fetch(`/api/attendance?date=${dateStr}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach(rec => {
            const empId = rec.employee?.id || rec.employeeId;
            if (!map[empId]) map[empId] = {};
            map[empId][dateStr] = rec;
          });
        }
      }));
      setAttendanceMap(map);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const getCellData = (empId, date) => {
    const rec = attendanceMap[empId]?.[date];
    if (!rec) return null;
    const slots = parseTimeSlots(rec.timeSlots);
    const firstIn = slots[0]?.in || '';
    const lastOut = slots[slots.length - 1]?.out || '';

    return {
      status: rec.status,
      inTime: firstIn,
      outTime: lastOut,
    };
  };

  const statusAbbr = (status) => {
    if (!status) return '';
    if (status === 'Present') return 'P';
    if (status === 'Absent') return 'A';
    if (status === 'Late') return 'L';
    return status === 'Weekly Off' ? 'WO' : status.substring(0, 2).toUpperCase();
  };

  const statusColor = (s) => {
    return '#374151'; // Standard dark gray as per image
  };

  const handleClear = () => {
    setStartDate(fmt(monday));
    setEndDate(fmt(sunday));
    setShowGrid(false);
  };

  return (
    <div className="pageContainer">
      <Link href="/dashboard/reports" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Attendance Muster Report</div>
      </div>

      <div className="card">
        {/* Row 1 */}
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Organization</label>
            <select className="filterInput">
              <option>Cecube Engineering India Pvt Ltd</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Employee</label>
            <select className="filterInput">
              <option>Any</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Start Date</label>
            <input type="date" className="filterInput" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">End Date</label>
            <input type="date" className="filterInput" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        {/* Row 2 */}
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Attendance Status</label>
            <select className="filterInput">
              <option>All</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Report Type</label>
            <select className="filterInput">
              <option>Attendance Only</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Statuses to consider as Present</label>
            <select className="filterInput">
              <option>Only Present</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Use Short Code for Status</label>
            <select className="filterInput">
              <option>No</option>
            </select>
          </div>
        </div>

        <div className="filterActions" style={{ justifyContent: 'space-between', marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btnPrimary" onClick={fetchData}>View</button>
            <button className="btn" style={{ background: '#f3f4f6', color: '#9ca3af' }} onClick={handleClear}>Clear</button>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btnPrimary" style={{ background: '#10b981' }} onClick={() => {
              if (employees.length === 0) return;
              const rows = employees.map(emp => {
                const row = {
                  'EMP CODE': emp.empId,
                  'BRANCH': emp.branch || '—',
                  'DESIGNATION': emp.designation || '—',
                  'NAME': emp.name
                };
                days.forEach(d => {
                  const dateStr = fmt(d);
                  const cellData = getCellData(emp.id, dateStr);
                  row[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`] = cellData ? statusAbbr(cellData.status) : '—';
                });
                return row;
              });
              exportToCSV('attendance-muster.csv', rows);
            }}>
              <Download size={16} style={{ marginRight: '8px' }} />
              Export
            </button>
            <button className="btn btnPrimary">More Filters</button>
          </div>
        </div>
      </div>

      {showGrid && (
        <div className="card" style={{ marginTop: '20px', padding: 0, overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>Loading attendance data...</div>
          ) : (
            <table style={{ borderCollapse: 'collapse', minWidth: '100%', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '90px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '130px' }} />
                <col style={{ width: '140px' }} />
                {days.map((_, i) => <col key={i} style={{ width: '70px' }} />)}
              </colgroup>
              <thead>
                <tr style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={thSt}>EMPLOYEE<br/>CODE</th>
                  <th style={thSt}>BRANCH</th>
                  <th style={thSt}>DESIGNATION</th>
                  <th style={thSt}>EMPLOYEE<br/>NAME</th>
                  {days.map(d => {
                    const dStr = fmt(d);
                    const yearPart = dStr.substring(0, 5); // "2026-"
                    const mdPart = dStr.substring(5);      // "07-01"
                    return (
                      <th key={dStr} style={{ ...thSt, textAlign: 'center', fontSize: '10px', lineHeight: '1.4' }}>
                        <div>{yearPart}</div>
                        <div>{mdPart}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  return (
                    <tr key={emp.id} style={{ background: '#ffffff', borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tdSt}>
                        <span style={{ fontWeight: 600 }}>{emp.empId || '—'}</span>
                      </td>
                      <td style={tdSt}>
                        <span>{emp.branch || 'DEFAULT'}</span>
                      </td>
                      <td style={tdSt}>
                        <span>{emp.designation || 'EMPLOYEE'}</span>
                      </td>
                      <td style={{ ...tdSt, fontWeight: 600 }}>
                        <span style={{ cursor: 'pointer', color: '#374151' }} onClick={() => router.push(`/dashboard/employees/${emp.id}`)}>
                          {emp.name.split(' ').map((n, i) => <div key={i}>{n}</div>)}
                        </span>
                      </td>
                      {days.map(d => {
                        const data = getCellData(emp.id, fmt(d));
                        if (!data) {
                          return <td key={fmt(d)} style={{ ...tdSt, textAlign: 'center' }}></td>;
                        }
                        
                        // If there are punches, show them stacked
                        if (data.inTime || data.outTime) {
                          return (
                            <td key={fmt(d)} style={{ ...tdSt, textAlign: 'center', padding: '4px' }}>
                              {data.inTime && <div style={{ lineHeight: '1.2' }}>{data.inTime}</div>}
                              {data.outTime && <div style={{ lineHeight: '1.2' }}>{data.outTime}</div>}
                            </td>
                          );
                        }

                        // Otherwise show Status abbreviation
                        const abbr = statusAbbr(data.status);
                        return (
                          <td key={fmt(d)} style={{ ...tdSt, textAlign: 'center' }}>
                            <span style={{ fontWeight: 600, color: statusColor(data.status) }}>
                              {abbr || ''}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={4 + days.length} style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
                      No employee data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
      
    </div>
  );
}

const thSt = { padding: '12px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', verticalAlign: 'middle', borderRight: '1px solid #f3f4f6' };
const tdSt = { padding: '10px', verticalAlign: 'middle', fontSize: '11px', color: '#374151', borderRight: '1px solid #f3f4f6' };
