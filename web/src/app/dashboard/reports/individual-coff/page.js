'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, Download, User } from 'lucide-react';
import * as XLSX from 'xlsx';
import '../../attendance/attendance.css';
import '../reports.css';

function IndividualCoffContent() {
  const searchParams = useSearchParams();
  const initialEmpId = searchParams.get('empId');
  
  const today = new Date();
  const currentMonthStr = today.toISOString().slice(0, 7); // YYYY-MM

  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(initialEmpId || '');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.json())
      .then(d => setEmployees(d))
      .catch(console.error);
  }, []);

  const fetchData = () => {
    if (selectedEmp) {
      setLoading(true);
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month}-${lastDay}`;

      fetch(`/api/reports/coff?employeeId=${selectedEmp}&startDate=${startDate}&endDate=${endDate}`)
        .then(r => r.json())
        .then(d => {
          setReportData(d);
          setLoading(false);
        })
        .catch(e => {
          console.error(e);
          setLoading(false);
        });
    } else {
      setReportData(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedEmp, selectedMonth]);

  const exportExcel = () => {
    if (!reportData || !reportData.leaveRequests) return;
    
    const ws = XLSX.utils.json_to_sheet(reportData.leaveRequests.map(r => ({
      'Type': r.leaveType,
      'Start Date': r.startDate,
      'End Date': r.endDate,
      'Half Day': r.isHalfDay ? 'Yes' : 'No',
      'Reason': r.reason,
      'Status': r.status,
      'Applied On': new Date(r.appliedOn).toLocaleDateString()
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Individual COff');
    XLSX.writeFile(wb, `${reportData.name.replace(/\\s+/g, '_')}_COff_Report.xlsx`);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <Link href="/dashboard/reports/team-coff" className="backLink">
            <ChevronLeft size={16} /> Back to Team Report
          </Link>
          <h1 className="pageTitle" style={{ marginTop: '0.5rem' }}>Individual COff Report</h1>
        </div>
        <button className="primaryButton" onClick={exportExcel} disabled={loading || !reportData || reportData.leaveRequests?.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
          <Download size={16} /> Export Excel
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="filtersRow" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="filterGroup" style={{ flex: 1, minWidth: '200px' }}>
            <label className="filterLabel">Select Employee*</label>
            <select 
              className="formSelect filterInput" 
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(e.target.value)}
            >
              <option value="">-- Select an employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.empId || 'No ID'})</option>
              ))}
            </select>
          </div>
          <div className="filterGroup" style={{ flex: 1, minWidth: '150px' }}>
            <label className="filterLabel">Select Month*</label>
            <input 
              type="month" 
              className="filterInput" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
            />
          </div>
          <div className="filterGroup" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="primaryButton" onClick={fetchData} disabled={!selectedEmp} style={{ padding: '8px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: selectedEmp ? 'pointer' : 'not-allowed', height: '38px', opacity: selectedEmp ? 1 : 0.6 }}>
              View
            </button>
          </div>
        </div>
      </div>

      {loading && <p>Loading data...</p>}
      
      {!loading && reportData && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#111827' }}>{reportData.name}</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#6b7280' }}>{reportData.department}</p>
            </div>
            <div style={{ background: '#ecfdf5', padding: '10px 16px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <span style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: 600, display: 'block' }}>COff Balance</span>
              <span style={{ fontSize: '1.25rem', color: '#047857', fontWeight: 800 }}>{reportData.leaveBalance?.compensatoryLeaves || 0}</span>
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', color: '#374151', marginBottom: '1rem' }}>COff Requests History</h3>
          <div className="tableContainer">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Applied On</th>
                </tr>
              </thead>
              <tbody>
                {reportData.leaveRequests?.map(req => (
                  <tr key={req.id}>
                    <td>{req.startDate}</td>
                    <td>{req.endDate}</td>
                    <td>{req.isHalfDay ? '0.5 Day' : '1 Day'}</td>
                    <td>{req.reason}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                        background: req.status.includes('APPROVED') ? '#dcfce7' : req.status.includes('REJECTED') ? '#fee2e2' : '#fef3c7',
                        color: req.status.includes('APPROVED') ? '#166534' : req.status.includes('REJECTED') ? '#991b1b' : '#92400e'
                      }}>
                        {req.status}
                      </span>
                    </td>
                    <td>{new Date(req.appliedOn).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(!reportData.leaveRequests || reportData.leaveRequests.length === 0) && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No COff requests found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export default function IndividualCoffReport() {
  return (
    <div className="pageContainer">
      <Suspense fallback={<div>Loading...</div>}>
        <IndividualCoffContent />
      </Suspense>
    </div>
  );
}
