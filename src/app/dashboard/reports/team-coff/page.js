'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import ReportFilters, { useReportFilters } from '../../../../components/ReportFilters';
import '../../attendance/attendance.css';
import '../reports.css';

export default function TeamCoffReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const filters = useReportFilters();

  const today = new Date();
  const currentMonthStr = today.toISOString().slice(0, 7); // YYYY-MM
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const fetchData = () => {
    setLoading(true);
    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    fetch(`/api/reports/coff?startDate=${startDate}&endDate=${endDate}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(item => ({
      'Emp ID': item.empId || '-',
      'Name': item.name,
      'Department': item.department,
      'COff Balance': item.balance,
      'COff Taken': item.taken,
      'COff Pending': item.pending
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Team COff');
    XLSX.writeFile(wb, `Team_COff_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="pageContainer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <Link href="/dashboard/reports" className="backLink">
            <ChevronLeft size={16} /> Back to Reports
          </Link>
          <h1 className="pageTitle" style={{ marginTop: '0.5rem' }}>Team Compensatory Off (COff) Report</h1>
        </div>
        <button className="primaryButton" onClick={exportExcel} disabled={loading || data.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
          <Download size={16} /> Export Excel
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="filtersRow">
          <ReportFilters {...filters} style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '0.5rem' }} />
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="filterGroup">
              <label className="filterLabel">Select Month*</label>
              <input 
                type="month" 
                className="filterInput" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)} 
              />
            </div>
            <button className="primaryButton" onClick={fetchData} style={{ padding: '8px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', height: '38px' }}>
              View
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="tableContainer">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Emp ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>COff Balance</th>
                  <th>COff Taken</th>
                  <th>COff Pending</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filters.applyFilters(data).map(emp => (
                  <tr key={emp.id}>
                    <td>{emp.empId || '-'}</td>
                    <td>{emp.name}</td>
                    <td>{emp.department}</td>
                    <td style={{ fontWeight: 600, color: '#059669' }}>{emp.balance}</td>
                    <td>{emp.taken}</td>
                    <td>{emp.pending}</td>
                    <td>
                      <Link 
                        href={`/dashboard/reports/individual-coff?empId=${emp.id}`}
                        style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
                      >
                        <FileText size={14} /> View Detailed
                      </Link>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No data found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
