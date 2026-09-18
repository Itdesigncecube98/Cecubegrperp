'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download } from 'lucide-react';
import { exportToCSV } from '../../../../lib/exportUtils';
import ReportFilters, { useReportFilters } from '../../../../components/ReportFilters';
import '../../attendance/attendance.css';

// Tries to extract a number from a string like "2 hours" or "2"
function parseHours(hourStr) {
  if (!hourStr) return 0;
  const match = hourStr.match(/(\d+(\.\d+)?)/);
  if (match) return parseFloat(match[1]);
  return 0;
}

export default function MonthlyOvertimeReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);
  const reportFilters = useReportFilters();
  
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const [month, setMonth] = useState(defaultMonth);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Calculate start and end date from the selected YYYY-MM
      const [y, m] = month.split('-');
      const year = parseInt(y, 10);
      const monthIdx = parseInt(m, 10) - 1;
      
      const firstDay = new Date(year, monthIdx, 1);
      const lastDay = new Date(year, monthIdx + 1, 0);
      
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];

      const res = await fetch(`/api/reports/overtime?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        // Aggregate by employee
        const agg = {};
        for (const row of data) {
          const empId = row.employeeId;
          if (!agg[empId]) {
            agg[empId] = {
              id: empId,
              empId: row.employee?.empId || '-',
              name: row.employee?.name || '-',
              department: row.employee?.department || '-',
              totalHours: 0,
              assignmentCount: 0,
              dates: []
            };
          }
          agg[empId].totalHours += parseHours(row.hours);
          agg[empId].assignmentCount += 1;
          agg[empId].dates.push(row.date);
        }
        setTableData(Object.values(agg));
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
    if (month) {
      fetchData();
    }
  }, [month]);

  const handleClear = () => {
    setMonth(defaultMonth);
    setSearch('');
  };

  const filteredData = reportFilters.applyFilters(
    tableData.filter(row => 
      row.name.toLowerCase().includes(search.toLowerCase()) || 
      row.empId.toLowerCase().includes(search.toLowerCase())
    ),
    (row) => ({ name: row.name, empId: row.empId, siteOffice: row.siteOffice, department: row.department })
  );

  const handleExport = () => {
    const rows = filteredData.map(r => ({
      'Emp ID': r.empId,
      'Employee Name': r.name,
      'Department': r.department,
      'Total Overtime Hours': r.totalHours.toFixed(1),
      'Overtime Days Count': r.assignmentCount,
      'Assigned Dates': r.dates.join(', ')
    }));
    exportToCSV(`monthly-overtime-${month}.csv`, rows);
  };

  return (
    <div className="pageContainer">
      <Link href="/dashboard/reports" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Monthly Overtime Report</div>
      </div>

      <div className="card">
        <div className="filtersRow">
          <ReportFilters {...reportFilters} style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '0.5rem' }} />
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="filterGroup">
              <label className="filterLabel">Select Month</label>
              <input 
                type="month" 
                className="filterInput" 
                value={month} 
                onChange={e => setMonth(e.target.value)} 
              />
            </div>
            <div className="filterGroup" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: '1rem', flex: 'none' }}>
              <button className="btn btnSecondary" onClick={handleClear}>Clear</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div className="tableTitleArea">
            <h2 className="tableTitle">Monthly Aggregation</h2>
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
                <th>Emp ID</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Total Overtime Hours</th>
                <th>Overtime Days Count</th>
                <th>Assigned Dates</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No records found for this month.</td></tr>
              ) : (
                filteredData.map(row => (
                  <tr key={row.id}>
                    <td>{row.empId}</td>
                    <td>{row.name}</td>
                    <td>{row.department}</td>
                    <td><strong style={{ color: '#0f172a' }}>{row.totalHours.toFixed(1)} hrs</strong></td>
                    <td>{row.assignmentCount} days</td>
                    <td>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {row.dates.slice(0, 3).join(', ')}
                        {row.dates.length > 3 ? ` +${row.dates.length - 3} more` : ''}
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
