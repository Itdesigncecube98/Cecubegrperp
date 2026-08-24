'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Info, Search, Download } from 'lucide-react';
import '../../attendance/attendance.css';

export default function LeaveBalances() {
  const [balances, setBalances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [empRes, balRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/leaves/balance')
      ]);
      const emps = await empRes.json();
      const bals = await balRes.json();

      setEmployees(Array.isArray(emps) ? emps : []);
      setBalances(Array.isArray(bals) ? bals : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getEmp = (id) => employees.find(emp => emp.id === id || emp.id === String(id));
  const getEmpName = (id) => getEmp(id)?.name || 'Unknown';
  const getEmpCode = (id) => getEmp(id)?.empId || '-';
  const getEmpDept = (id) => getEmp(id)?.department || '-';

  const filteredBalances = balances.filter(b => {
    if (!searchTerm) return true;
    const name = getEmpName(b.employeeId).toLowerCase();
    const code = getEmpCode(b.employeeId)?.toLowerCase() || '';
    return name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
  });

  const handleExportExcel = async () => {
    try {
      const response = await fetch('/api/leaves/balance/export');
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leave_balances_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to export Excel. Please try again.');
    }
  };

  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <h1 className="pageTitle">Team Leave Balances</h1>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">Team Leave Balances</h2>
              <Info size={16} className="infoIcon" />
            </div>
            <p className="tableSubtitle">The below table shows the leave balances of all employees in your team.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="searchControl" style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
              <input 
                type="text" 
                className="searchInput" 
                placeholder="Search employee..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>
            <button
              onClick={handleExportExcel}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: '#16a34a', color: '#fff', border: 'none',
                padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap'
              }}
            >
              <Download size={16} /> Export Excel
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table className="dataTable">
            <thead>
              <tr>
                <th>EMPLOYEE NAME</th>
                <th>EMP CODE</th>
                <th>DEPARTMENT</th>
                <th>CASUAL LEAVE (CL)</th>
                <th>EARNED LEAVE (EL)</th>
                <th style={{ color: '#7c3aed' }}>COMP. OFF (C-OFF)</th>
                <th>LWP USED</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading balances...</td>
                </tr>
              ) : filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No data available in table</td>
                </tr>
              ) : (
                filteredBalances.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600, color: '#1f2937' }}>{getEmpName(b.employeeId)}</td>
                    <td style={{ color: '#6b7280' }}>{getEmpCode(b.employeeId)}</td>
                    <td style={{ color: '#6b7280' }}>{getEmpDept(b.employeeId)}</td>
                    <td style={{ color: '#2563eb', fontWeight: 600 }}>{b.casualLeaves ?? 0}</td>
                    <td style={{ color: '#16a34a', fontWeight: 600 }}>{b.earnedLeaves ?? 0}</td>
                    <td style={{ color: '#7c3aed', fontWeight: 700 }}>{b.compensatoryLeaves ?? 0}</td>
                    <td style={{ color: '#ca8a04', fontWeight: 600 }}>{b.leaveWithoutPay ?? 0}</td>
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
