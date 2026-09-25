'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download } from 'lucide-react';
import { exportToCSV } from '../../../../lib/exportUtils';
import MultiSelect from '../../../../components/MultiSelect';
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
  
  const [employeesList, setEmployeesList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 10);
  const [startDate, setStartDate] = useState(fmt(monday));
  const [endDate, setEndDate] = useState(fmt(sunday));

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/daily-trend?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) {
        const data = await res.json();
        
        const results = data.map(day => {
           const dateObj = new Date(day.fullDate);
           const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
           
           return {
             date: day.fullDate,
             dayName: dayName,
             all: day.all || 0,
             present: day.Present + day.COff, // Combine normal present + compensatory off present
             absent: day.Absent,
             late: day.Late || 0,
             earlyGoing: 0,
             lcEg: day.Late || 0, // Using late as LC/EG
             holiday: day.Holiday,
             wo: day.Off,
             halfDay: day.HalfDay || 0,
             isHoliday: day.Holiday > 0 || day.Off > 0
           };
        });
        
        results.sort((a, b) => a.date.localeCompare(b.date));
        setTableData(results);
      }
    } catch (e) { 
      console.error(e); 
    }
    setLoading(false);
  };

  useEffect(() => {
    async function loadFilters() {
      try {
        const [empRes, branchRes, deptRes] = await Promise.all([
          fetch('/api/employees'),
          fetch('/api/synchronization?type=siteoffices'),
          fetch('/api/synchronization?type=departments')
        ]);
        
        if (empRes.ok) {
          const data = await empRes.json();
          if (Array.isArray(data)) {
            setEmployeesList(data);
            setSelectedEmployees(data.map(e => `${e.name} (${e.empId})`));
          }
        }
        if (branchRes.ok) {
          const data = await branchRes.json();
          const names = data.map(d => d.name || d.siteOfficeName || d);
          setBranches(names);
          setSelectedBranches(names);
        }
        if (deptRes.ok) {
          const data = await deptRes.json();
          const names = data.map(d => d.name || d.departmentName || d);
          setDepartments(names);
          setSelectedDepartments(names);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadFilters();
  }, []);

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
        <div className="filtersRow" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <div className="filterGroup">
            <label className="filterLabel">Organization / Branch</label>
            <MultiSelect
              options={branches}
              selected={selectedBranches}
              onChange={setSelectedBranches}
              placeholder="Select Branch"
            />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Department</label>
            <MultiSelect
              options={departments}
              selected={selectedDepartments}
              onChange={setSelectedDepartments}
              placeholder="Select Department"
            />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Employee</label>
            <MultiSelect
              options={employeesList.map(e => `${e.name} (${e.empId})`)}
              selected={selectedEmployees}
              onChange={setSelectedEmployees}
              placeholder="Select Employee"
            />
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
                  <tr key={row.date} style={row.isHoliday ? { background: '#fee2e2' } : {}}>
                    <td>{row.date.split('-').reverse().join('-')} ({row.dayName})</td>
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
