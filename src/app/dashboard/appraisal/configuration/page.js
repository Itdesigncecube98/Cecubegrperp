'use client';
import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckSquare } from 'lucide-react';

export default function AppraisalConfiguration() {
  const [processes, setProcesses] = useState([]);
  const [questionSets, setQuestionSets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedProcess, setSelectedProcess] = useState('');
  const [department, setDepartment] = useState('Select');
  const [employeeIdFilter, setEmployeeIdFilter] = useState('Select');

  // Actions
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [selectedQuestionSet, setSelectedQuestionSet] = useState('');

  // Dropdown options computed from data
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();

  useEffect(() => {
    // Fetch Processes and Question Sets
    fetch('/api/appraisal/processes').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setProcesses(data);
        if (data.length > 0) setSelectedProcess(data[0].id);
      }
    }).catch(console.error);

    fetch('/api/appraisal/question-sets').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setQuestionSets(data);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [selectedProcess]);

  const fetchAssignments = () => {
    if (!selectedProcess) return;
    setLoading(true);
    const query = new URLSearchParams({
      processId: selectedProcess,
      department,
      employeeId: employeeIdFilter
    });
    
    fetch(`/api/appraisal/assignments?${query.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEmployees(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleReset = () => {
    setDepartment('Select');
    setEmployeeIdFilter('Select');
    // We fetch assignments right after reset
    setTimeout(fetchAssignments, 0);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEmployees(new Set(employees.map(emp => emp.id)));
    } else {
      setSelectedEmployees(new Set());
    }
  };

  const handleSelectOne = (id) => {
    const newSet = new Set(selectedEmployees);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedEmployees(newSet);
  };

  const handleApplyQuestionSet = async () => {
    if (selectedEmployees.size === 0) return alert('Please select at least one employee.');
    if (!selectedQuestionSet) return alert('Please select a Question Set.');

    try {
      const res = await fetch('/api/appraisal/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: Array.from(selectedEmployees),
          processId: selectedProcess,
          questionSetId: selectedQuestionSet
        })
      });

      if (res.ok) {
        alert('Question set applied successfully!');
        setSelectedEmployees(new Set()); // clear selection
        fetchAssignments(); // refresh data
      } else {
        const err = await res.json();
        alert('Failed: ' + err.error);
      }
    } catch (error) {
      console.error(error);
      alert('Error applying question set.');
    }
  };

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <div className="filter-group">
          <label>Appraisal Process <span style={{ color: 'red' }}>*</span></label>
          <select value={selectedProcess} onChange={e => setSelectedProcess(e.target.value)}>
            <option value="">Select Process</option>
            {processes.map(p => (
              <option key={p.id} value={p.id}>{p.name} {p.startDate ? `=> ${p.startDate}` : ''}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Department</label>
          <select value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="Select">Select</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Employee</label>
          <select value={employeeIdFilter} onChange={e => setEmployeeIdFilter(e.target.value)}>
            <option value="Select">Select</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-actions" style={{ alignItems: 'flex-end', paddingBottom: '2px' }}>
          <button className="btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={handleReset}>
            <RefreshCw size={16} /> Reset
          </button>
          <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={fetchAssignments}>
            <Search size={16} /> Search
          </button>
        </div>
      </div>

      <div className="action-bar" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={selectedQuestionSet} 
            onChange={e => setSelectedQuestionSet(e.target.value)}
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            <option value="">-- Select Question Set --</option>
            {questionSets.map(qs => (
              <option key={qs.id} value={qs.id}>{qs.name}</option>
            ))}
          </select>
          <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#0891b2' }} onClick={handleApplyQuestionSet}>
            <CheckSquare size={16} /> Apply Question Set
          </button>
        </div>

      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--app-glass-border)', borderRadius: '12px', minHeight: '300px' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading assignments...</div>
        ) : (
          <table style={{ width: '100%', minWidth: '1000px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={employees.length > 0 && selectedEmployees.size === employees.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Name</th>
                <th>Question Set</th>
                <th>Position</th>
                <th>Department</th>
                <th>Appraisal Assignment</th>
                <th>Self Appraisal</th>
                <th>Appraiser Name</th>
                <th>Appraisal Status</th>
                <th>Reviewer Name</th>
                <th>Reviewer Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No employees found for the selected criteria.</td>
                </tr>
              ) : (
                employees.map(row => (
                  <tr key={row.id}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedEmployees.has(row.id)}
                        onChange={() => handleSelectOne(row.id)}
                      />
                    </td>
                    <td style={{ fontWeight: '500' }}>{row.name}</td>
                    <td>{row.qset}</td>
                    <td>{row.position}</td>
                    <td>{row.department}</td>
                    <td>{row.appAssign}</td>
                    <td>{row.self}</td>
                    <td>{row.appName}</td>
                    <td>{row.appStatus}</td>
                    <td>{row.revName}</td>
                    <td>{row.revStatus}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
