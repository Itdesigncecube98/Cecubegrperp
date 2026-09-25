'use client';
import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, FileDown } from 'lucide-react';
import MultiSelect from '@/components/MultiSelect';
import ArrearsHistoryModal from './ArrearsHistoryModal';

export default function ArrearsCalculation() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);


  
  // Table Data
  const [employeeTableData, setEmployeeTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState(null);

  // Arrears Settings
  const [arrearsType, setArrearsType] = useState('months');
  const [arrearsDays, setArrearsDays] = useState(0);

  useEffect(() => {
    fetch('/api/synchronization?type=siteoffices').then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        const names = d.map(x => x.name || x.siteOfficeName || x).filter(Boolean);
        setBranches(names);
        setSelectedBranches(names);
      }
    }).catch(console.error);

    fetch('/api/synchronization?type=departments').then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        const names = d.map(x => x.name || x.departmentName || x).filter(Boolean);
        setDepartments(names);
        setSelectedDepartments(names);
      }
    }).catch(console.error);

    fetch('/api/employees').then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        setEmployees(d);
        setSelectedEmployees(d.map(e => `${e.name} (${e.empId})`));
      }
    }).catch(console.error);


    fetchTableData();
  }, []);

  const fetchTableData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees?details=false');
      const data = await res.json();
      if (Array.isArray(data)) {
        // filter logic can be applied here based on dropdowns if needed
        setEmployeeTableData(data);
      }
    } catch (e) {
      console.error('Failed to fetch employees:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Ideally apply selected filters here. For now, fetch all.
    fetchTableData();
  };

  const handleReset = () => {
    setSelectedBranches([]);
    setSelectedDepartments([]);
    setSelectedEmployees([]);
    fetchTableData();
  };


  return (
    <div>
      <div className="filter-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', width: '100%' }}>
        <div className="filter-group">
          <label>Organization / Branch</label>
          <MultiSelect options={branches} selected={selectedBranches} onChange={setSelectedBranches} placeholder="Select Branch" />
        </div>
        <div className="filter-group">
          <label>Department</label>
          <MultiSelect options={departments} selected={selectedDepartments} onChange={setSelectedDepartments} placeholder="Select Department" />
        </div>
        <div className="filter-group">
          <label>Employee</label>
          <MultiSelect options={employees.map(e => `${e.name} (${e.empId})`)} selected={selectedEmployees} onChange={setSelectedEmployees} placeholder="Select Employee" />
        </div>
      </div>

      <div className="filter-bar" style={{ marginTop: '-0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', alignItems: 'center' }}>
        {/* Removed Arrears Status Dropdown */}
        
        <div className="filter-group" style={{ flex: 2 }}>
          <label>Arrears Mode</label>
          <div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #bae6fd' }}>
              <RefreshCw size={14} /> Smart Day-Wise Calculation Enabled
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Automatically detects mid-month revisions (e.g. 15th Dec)</span>
          </div>
        </div>

        <div className="filter-actions">
          <button className="btn-outline" onClick={handleReset} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <RefreshCw size={16} /> Reset
          </button>
          <button className="btn-primary" onClick={handleSearch} disabled={loading} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Search size={16} /> {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="summary-badges" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="summary-badge" style={{ backgroundColor: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd' }}>
            Total Employees: {employeeTableData.length}
          </div>
          <button className="btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderColor: 'var(--pay-primary)', color: 'var(--pay-primary)' }}>
            <FileDown size={16} /> Export To excel
          </button>
        </div>
        
        {/* Pagination removed as per request */}
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" title="Select All" /></th>
              <th>emp id</th>
              <th>emp name</th>
              <th>dept</th>
              <th>branch</th>
              <th>action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
            ) : employeeTableData.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No employees found</td></tr>
            ) : (
              employeeTableData.map(row => (
                <tr key={row.id}>
                  <td><input type="checkbox" /></td>
                  <td style={{ fontWeight: '600' }}>{row.empId}</td>
                  <td style={{ color: 'var(--primary-color)', fontWeight: '500' }}>{row.name}</td>
                  <td>{row.department || '-'}</td>
                  <td>{row.branch || '-'}</td>
                  <td>
                    <button 
                      onClick={() => setSelectedEmployeeForHistory(row)}
                      style={{ background: '#0284c7', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      View Arrears History
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedEmployeeForHistory && (
        <ArrearsHistoryModal 
          employee={selectedEmployeeForHistory} 
          arrearsType={arrearsType}
          arrearsDays={arrearsDays}
          onClose={() => setSelectedEmployeeForHistory(null)} 
        />
      )}
    </div>
  );
}
