'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download } from 'lucide-react';
import { exportToCSV } from '../../../../lib/exportUtils';
import '../../attendance/attendance.css';

function fmt(dateObj) {
  return dateObj.toISOString().split('T')[0];
}

export default function EmployeeOvertimeReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [employees, setEmployees] = useState([]);

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(fmt(firstDay));
  const [endDate, setEndDate] = useState(fmt(lastDay));
  const [employeeId, setEmployeeId] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch('/api/employees');
        const data = await res.json();
        if (Array.isArray(data)) setEmployees(data);
      } catch (e) {
        console.error(e);
      }
    }
    loadEmployees();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/overtime?startDate=${startDate}&endDate=${endDate}&employeeId=${employeeId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTableData(data);
      } else {
        setTableData([]);
      }
    } catch (e) {
      console.error(e);
      setTableData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    fetchData();
  }, [startDate, endDate, employeeId]);

  const handleClear = () => {
    setStartDate(fmt(firstDay));
    setEndDate(fmt(lastDay));
    setEmployeeId('all');
    setSearch('');
  };

  const filteredData = tableData.filter(row => 
    row.employee?.name?.toLowerCase().includes(search.toLowerCase()) || 
    row.employee?.empId?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const rows = filteredData.map(r => ({
      'Date': r.date,
      'Emp ID': r.employee?.empId || '-',
      'Employee Name': r.employee?.name || '-',
      'Department': r.employee?.department || '-',
      'Designation': r.employee?.designation || '-',
      'Hours': r.hours || '-',
      'Reason': r.reason || '-',
      'Status': r.status
    }));
    exportToCSV(`employee-overtime-${startDate}-to-${endDate}.csv`, rows);
  };

  return (
    <div className="pageContainer">
      <Link href="/dashboard/reports" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Employee Overtime Report</div>
      </div>

      <div className="card">
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Employee</label>
            <select className="filterInput" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
              <option value="all">All Employees</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.empId})</option>
              ))}
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
          
          <div className="filterGroup" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: '1rem', flex: 'none' }}>
            <button className="btn btnSecondary" onClick={handleClear}>Clear</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div className="tableTitleArea">
            <h2 className="tableTitle">Overtime Records</h2>
          </div>
          <div className="actionButtons">
            <button className="btn btnOutline" onClick={handleExport} disabled={filteredData.length === 0}>
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        <div className="tableControls">
          <div className="entriesControl">
            Show
            <select className="entriesSelect">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
            entries
          </div>
          <div className="searchControl">
            Search:
            <input 
              type="text" 
              className="searchInput" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Emp name or ID..."
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Emp ID</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Hours</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No records found in this range.</td></tr>
              ) : (
                filteredData.map(row => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>{row.employee?.empId || '-'}</td>
                    <td>{row.employee?.name || '-'}</td>
                    <td>{row.employee?.department || '-'}</td>
                    <td>{row.employee?.designation || '-'}</td>
                    <td><strong>{row.hours || '-'}</strong></td>
                    <td>{row.reason || '-'}</td>
                    <td>
                      <span style={{ 
                        background: '#dcfce7', color: '#166534', 
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 
                      }}>
                        {row.status}
                      </span>
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
