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

function formatMins(mins) {
  if (!mins || mins <= 0) return '0h 0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function GroupedSummary() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);
  const filters = useReportFilters();

  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 10);

  const [startDate, setStartDate] = useState(fmt(monday));
  const [endDate, setEndDate] = useState(fmt(sunday));
  const [groupBy, setGroupBy] = useState('Any');

  const fetchData = async () => {
    setLoading(true);
    const dateRange = getDaysInRange(startDate, endDate);

    try {
      const empRes = await fetch('/api/employees');
      const emps = await empRes.json();
      
      const empStats = {};
      emps.forEach(emp => {
        empStats[emp.id] = {
          ...emp,
          workedMinutes: 0,
          overtimeMinutes: 0
        };
      });

      await Promise.all(dateRange.map(async (d) => {
        const dateStr = fmt(d);
        const res = await fetch(`/api/attendance?date=${dateStr}`);
        const data = await res.json();
        
        if (Array.isArray(data)) {
          data.forEach(rec => {
            const eId = rec.employee?.id || rec.employeeId;
            if (empStats[eId]) {
              const worked = rec.totalMinutes || 0;
              empStats[eId].workedMinutes += worked;
              // Assuming 9 hours (540 mins) is regular shift
              if (worked > 540) {
                 empStats[eId].overtimeMinutes += (worked - 540);
              }
            }
          });
        }
      }));

      let finalData = Object.values(empStats);
      
      if (groupBy !== 'Any') {
         const key = groupBy.toLowerCase(); 
         finalData.sort((a, b) => (a[key] || 'Unassigned').localeCompare(b[key] || 'Unassigned'));
      }

      setTableData(finalData);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    fetchData();
  }, [startDate, endDate, groupBy]);

  const handleClear = () => {
    setStartDate(fmt(monday));
    setEndDate(fmt(sunday));
    setGroupBy('Any');
    setTableData([]);
  };

  let filteredTableData = filters.applyFilters(tableData);
  let groupedRender = [];
  if (groupBy !== 'Any' && filteredTableData.length > 0) {
    const key = groupBy.toLowerCase();
    const groups = {};
    filteredTableData.forEach(row => {
      const gVal = row[key] || 'Unassigned';
      if (!groups[gVal]) groups[gVal] = [];
      groups[gVal].push(row);
    });
    
    Object.keys(groups).forEach(g => {
      groupedRender.push(
        <React.Fragment key={g}>
          <tr style={{ background: '#f3f4f6' }}>
            <td colSpan="7" style={{ fontWeight: 700, padding: '10px 16px', color: '#111827' }}>
              {groupBy}: {g}
            </td>
          </tr>
          {groups[g].map(row => (
            <tr key={row.id}>
              <td>{row.empId || '—'}</td>
              <td style={{ fontWeight: 600 }}>{row.name}</td>
              <td>{row.branch || '—'}</td>
              <td>{row.department || '—'}</td>
              <td>{row.designation || '—'}</td>
              <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatMins(row.workedMinutes)}</td>
              <td style={{ textAlign: 'right', color: '#d97706', fontWeight: 500 }}>{formatMins(row.overtimeMinutes)}</td>
            </tr>
          ))}
        </React.Fragment>
      );
    });
  } else {
    groupedRender = filteredTableData.map(row => (
      <tr key={row.id}>
        <td>{row.empId || '—'}</td>
        <td style={{ fontWeight: 600 }}>{row.name}</td>
        <td>{row.branch || '—'}</td>
        <td>{row.department || '—'}</td>
        <td>{row.designation || '—'}</td>
        <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatMins(row.workedMinutes)}</td>
        <td style={{ textAlign: 'right', color: '#d97706', fontWeight: 500 }}>{formatMins(row.overtimeMinutes)}</td>
      </tr>
    ));
  }

  return (
    <div className="pageContainer">
      <Link href="/dashboard/reports" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Grouped Summary Report</div>
      </div>

      <div className="card">
        <div className="filtersRow">
          <ReportFilters {...filters} style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '0.5rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
          <div className="filterGroup">
            <label className="filterLabel">Date From*</label>
            <input type="date" className="filterInput" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Date To*</label>
            <input type="date" className="filterInput" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Group By*</label>
            <select className="filterInput" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              <option value="Any">Any</option>
              <option value="Branch">Branch</option>
              <option value="Department">Department</option>
              <option value="Designation">Designation</option>
            </select>
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
              if (tableData.length === 0) return;
              const rows = tableData.map(emp => ({
                'EMP CODE': emp.empId,
                'EMPLOYEE NAME': emp.name,
                'BRANCH': emp.branch,
                'DEPARTMENT': emp.department,
                'DESIGNATION': emp.designation,
                'WORKED HOURS': formatMin(emp.totalWorked),
                'OVERTIME': formatMin(emp.totalOvertime)
              }));
              exportToCSV('grouped-summary.csv', rows);
            }}>
              <Download size={16} style={{ marginRight: '8px' }} />
              Export
            </button>
            <button className="btn btnPrimary">More Filters</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">Grouped Summary</h2>
            </div>
            <p className="tableSubtitle">Summary of total worked hours and overtime for the selected date range.</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="dataTable">
            <thead>
              <tr>
                <th>EMP CODE</th>
                <th>EMPLOYEE NAME</th>
                <th>BRANCH</th>
                <th>DEPARTMENT</th>
                <th>DESIGNATION</th>
                <th style={{ textAlign: 'right' }}>WORKED HOURS</th>
                <th style={{ textAlign: 'right' }}>OVERTIME</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>Loading summary data...</td>
                </tr>
              ) : tableData.length > 0 ? (
                groupedRender
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No data available in table</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
