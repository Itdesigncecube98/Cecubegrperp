'use client';
import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import MultiSelect from '@/components/MultiSelect';

export default function AppraisalSummary() {
  const [showIncrement, setShowIncrement] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);

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
  }, []);

  // Note: the screenshot shows an empty table
  const mockData = [];

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem' }}>
        <div className="filter-group">
          <label>Financial Year</label>
          <select><option>2026-2027</option></select>
        </div>
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
        <div className="filter-group">
          <label>Type</label>
          <select><option>Annual Summary</option></select>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--app-glass-border)', paddingBottom: '1.5rem', alignItems: 'flex-end' }}>
        <div className="filter-group" style={{ maxWidth: '300px' }}>
          <label>Slab</label>
          <select><option>B</option></select>
        </div>

        <div className="filter-actions">
          <button className="btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <RefreshCw size={16} /> Reset
          </button>
          <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Search size={16} /> Search
          </button>
        </div>
      </div>

      <div 
        style={{ 
          background: 'rgba(255, 255, 255, 0.6)', 
          border: '1px solid #cbd5e1', 
          borderRadius: '8px', 
          marginBottom: '1rem',
          overflow: 'hidden'
        }}
      >
        <button 
          onClick={() => setShowIncrement(!showIncrement)}
          style={{ 
            width: '100%', 
            padding: '1rem', 
            background: 'transparent', 
            border: 'none', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer',
            color: 'var(--app-text-muted)',
            fontWeight: '600'
          }}
        >
          Increment % for performance Slabs
          {showIncrement ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>
        {showIncrement && (
          <div style={{ padding: '1rem', borderTop: '1px solid #cbd5e1', background: 'white' }}>
            {/* Content for the accordion would go here */}
            <p style={{ color: 'var(--app-text-muted)', fontSize: '0.9rem' }}>No increment slabs defined.</p>
          </div>
        )}
      </div>

      <div className="action-bar" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--app-text-main)' }}>Result</h3>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--app-glass-border)', borderRadius: '12px' }}>
        <table>
          <thead>
            <tr>
              <th>Emp Code</th>
              <th>Employee Name</th>
              <th>Branch</th>
              <th>Department</th>
              <th>Position</th>
              <th>Designation</th>
              <th>Location</th>
              <th>Cost Center</th>
              <th>Slab</th>
              <th>Reporting To</th>
              <th>Reviewer</th>
            </tr>
          </thead>
          <tbody>
            {mockData.length > 0 ? (
              mockData.map(row => (
                <tr key={row.id}>
                  <td>{row.code}</td>
                  <td>{row.name}</td>
                  <td>{row.branch}</td>
                  <td>{row.dept}</td>
                  <td>{row.pos}</td>
                  <td>{row.desig}</td>
                  <td>{row.loc}</td>
                  <td>{row.cost}</td>
                  <td>{row.slab}</td>
                  <td>{row.rep}</td>
                  <td>{row.rev}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" className="empty-state">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
