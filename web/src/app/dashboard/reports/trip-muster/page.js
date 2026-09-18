'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download } from 'lucide-react';
import { exportToCSV } from '../../../../lib/exportUtils';
import ReportFilters, { useReportFilters } from '../../../../components/ReportFilters';
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

export default function TripMuster() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [tripMap, setTripMap] = useState({});
  const [loading, setLoading] = useState(false);
  const filters = useReportFilters();

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
      const res = await fetch(`/api/reports/trip-muster?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (!data.error) {
        setEmployees(data.employees || []);
        setTripMap(data.tripMap || {});
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const getCellData = (empId, date) => {
    return tripMap[empId]?.[date] || null;
  };

  const statusColor = (status) => {
    if (!status) return '#6b7280';
    if (status === 'PAID') return '#10b981';
    if (status === 'APPROVED') return '#3b82f6';
    if (status === 'REQUESTED' || status === 'ACTIVE') return '#f59e0b';
    if (status === 'REJECTED') return '#ef4444';
    return '#6b7280';
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
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Trip Day-Wise Muster Report</div>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="filtersRow">
          <ReportFilters {...filters} style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '0.5rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' }}>
            <div className="filterGroup">
              <label className="filterLabel">Start Date</label>
              <input type="date" className="filterInput" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="filterGroup">
              <label className="filterLabel">End Date</label>
              <input type="date" className="filterInput" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
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
                  row[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`] = cellData ? `₹${cellData.amount.toFixed(2)} (${cellData.status})` : '—';
                });
                return row;
              });
              exportToCSV('trip-muster-report.csv', rows);
            }}>
              <Download size={16} style={{ marginRight: '8px' }} />
              Export
            </button>
          </div>
        </div>
      </div>

      {showGrid && (
        <div className="card" style={{ marginTop: '20px', padding: 0, overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>Loading trip data...</div>
          ) : (
            <table style={{ borderCollapse: 'collapse', minWidth: '100%', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '90px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '130px' }} />
                <col style={{ width: '140px' }} />
                {days.map((_, i) => <col key={i} style={{ width: '110px' }} />)}
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
                {filters.applyFilters(employees).map((emp) => {
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
                      <td style={tdSt}>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{emp.name}</span>
                      </td>
                      {days.map(d => {
                        const cellData = getCellData(emp.id, fmt(d));
                        return (
                          <td key={fmt(d)} style={{ ...tdSt, textAlign: 'center', padding: '6px' }}>
                            {cellData ? (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 6px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4, minWidth: '80px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>
                                  ₹{cellData.amount.toFixed(2)}
                                </div>
                                <div style={{ fontSize: '9px', fontWeight: 700, color: statusColor(cellData.status) }}>
                                  {cellData.status}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '11px' }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={4 + days.length} style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>
                      No data found for this date range.
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

const thSt = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const tdSt = {
  padding: '12px 16px',
  fontSize: '13px',
  color: '#4b5563',
  borderRight: '1px solid #f3f4f6'
};
