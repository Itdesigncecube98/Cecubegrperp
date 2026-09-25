'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, Calculator, FileDown } from 'lucide-react';
import MultiSelect from '@/components/MultiSelect';

export default function BonusIncentive() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [religions, setReligions] = useState([]);
  
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);

  // Pay cycles
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  
  const [bonusType, setBonusType] = useState('bonus');

  // Store the raw fetched employees
  const [allFetchedEmployees, setAllFetchedEmployees] = useState([]);
  // Store the displayed table data
  const [data, setData] = useState([]);

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

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
        setAllFetchedEmployees(d);
        
        // Populate options
        setEmployees(d);
        setSelectedEmployees(d.map(e => `${e.name} (${e.empId})`));
        
        // Populate initial table data
        const initialData = d.map(e => ({
          id: e.id,
          empNo: e.empId,
          name: e.name,
          dept: e.department,
          pos: e.designation,
          status: 'Working',
          doj: e.joinedDate,
          branch: e.branch || e.siteOffice,
          basis: 0, 
          percent: 0, 
          amount: 0, 
          message: '',
          bonusStatus: 'NOT_SAVED'
        }));
        setAllFetchedEmployees(initialData);
        setData(initialData);
      }
    }).catch(console.error);

    // Fetch pay cycles
    fetch('/api/payroll/cycles').then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        setCycles(d);
        if (d.length > 0) setSelectedCycleId(d[0].id);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedCycleId || allFetchedEmployees.length === 0) return;

    fetch(`/api/payroll/bonus?cycleId=${selectedCycleId}&type=${bonusType}`)
      .then(r => r.json())
      .then(saved => {
        if (!Array.isArray(saved)) return;
        
        const mapRow = row => {
          const s = saved.find(x => x.employeeId === row.id);
          if (s) {
            return {
              ...row,
              basis: s.basis || 0,
              percent: s.percent || 0,
              amount: s.amount || 0,
              message: s.message || '',
              bonusStatus: s.status || 'SAVED'
            };
          }
          return { ...row, basis: 0, percent: 0, amount: 0, message: '', bonusStatus: 'NOT_SAVED' };
        };

        setAllFetchedEmployees(prev => prev.map(mapRow));
        setData(prev => prev.map(mapRow));
      })
      .catch(console.error);
  }, [selectedCycleId, allFetchedEmployees.length, bonusType]);

  const handleSearch = () => {
    let filtered = allFetchedEmployees.filter(emp => {
      const empLabel = `${emp.name} (${emp.empNo})`;
      const deptMatch = selectedDepartments.length === 0 || selectedDepartments.includes(emp.dept);
      const branchMatch = selectedBranches.length === 0 || selectedBranches.includes(emp.branch);
      const empMatch = selectedEmployees.length === 0 || selectedEmployees.includes(empLabel);
      
      return deptMatch && branchMatch && empMatch;
    });

    setData(filtered);
  };

  const handleReset = () => {
    setSelectedDepartments(departments);
    setSelectedBranches(branches);
    setSelectedEmployees(employees.map(e => `${e.name} (${e.empId})`));
    
    setData(allFetchedEmployees);
  };

  const handleSaveOrAdd = async (action) => {
    if (!selectedCycleId) {
      alert("Please select a Pay Cycle first.");
      return;
    }

    // Get all rows that have an amount > 0 or basis > 0
    const items = data
      .filter(row => parseFloat(row.amount) > 0 || parseFloat(row.basis) > 0 || row.message)
      .map(row => ({
        employeeId: row.id,
        basis: parseFloat(row.basis),
        percent: parseFloat(row.percent),
        amount: parseFloat(row.amount),
        message: row.message
      }));

    if (items.length === 0) {
      alert("No data to save.");
      return;
    }

    try {
      const type = bonusType;
      const res = await fetch('/api/payroll/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId: selectedCycleId, type, items, action })
      });
      
      const json = await res.json();
      if (json.success) {
        alert(action === 'SAVE' ? `Successfully saved drafts for ${json.updatedCount} employees!` : `Successfully added to salary for ${json.updatedCount} employees!`);
        window.location.reload();
      } else {
        alert("Error: " + json.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error saving.");
    }
  };

  const handleRowChange = (id, field, value) => {
    setData(prevData => prevData.map(row => {
      if (row.id === id) {
        const newRow = { ...row, [field]: value };
        // Auto-calculate amount if basis or percent changes
        if (field === 'basis' || field === 'percent') {
          const basis = parseFloat(newRow.basis) || 0;
          const percent = parseFloat(newRow.percent) || 0;
          newRow.amount = (basis * percent / 100).toFixed(2);
        }
        return newRow;
      }
      return row;
    }));
  };

  return (
    <div>
      <div className="filter-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', width: '100%' }}>
        <div className="filter-group">
          <label>Department</label>
          <MultiSelect options={departments} selected={selectedDepartments} onChange={setSelectedDepartments} placeholder="Select Department" />
        </div>
        <div className="filter-group">
          <label>Location / Branch</label>
          <MultiSelect options={branches} selected={selectedBranches} onChange={setSelectedBranches} placeholder="Select Branch" />
        </div>
        <div className="filter-group">
          <label>Employee</label>
          <MultiSelect options={employees.map(e => `${e.name} (${e.empId})`)} selected={selectedEmployees} onChange={setSelectedEmployees} placeholder="Select Employee" />
        </div>
      </div>

      <div className="filter-bar" style={{ marginTop: '-0.5rem' }}>
        <div className="filter-group">
          <label>Pay Cycle</label>
          <select value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
            <option value="">-- Select Cycle --</option>
            {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Type</label>
          <select>
            <option value="Approved">Approved</option>
          </select>
        </div>
        <div className="filter-group" style={{ justifyContent: 'flex-end', paddingBottom: '0.5rem' }}>
          <div className="radio-group">
            <label>
              <input type="radio" name="bonusType" value="bonus" checked={bonusType === 'bonus'} onChange={(e) => setBonusType(e.target.value)} />
              Bonus
            </label>
            <label>
              <input type="radio" name="bonusType" value="incentive" checked={bonusType === 'incentive'} onChange={(e) => setBonusType(e.target.value)} />
              Incentive
            </label>
          </div>
        </div>
      </div>

      <div className="filter-bar" style={{ marginTop: '-0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', alignItems: 'center' }}>
        <div className="checkbox-group">
          <input type="checkbox" id="resigned" />
          <label htmlFor="resigned">Show Resigned Employees</label>
        </div>

        <div className="filter-actions">
          <button className="btn-outline" onClick={handleReset} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <RefreshCw size={16} /> Reset
          </button>
          <button className="btn-primary" onClick={handleSearch} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Search size={16} /> Search
          </button>
        </div>
      </div>

      <div className="summary-badges" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="summary-badge" style={{ backgroundColor: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd' }}>
            Total Records: {data.length}
          </div>
          <button onClick={() => handleSaveOrAdd('SAVE')} className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#3b82f6' }}>
            Save Drafts
          </button>
          <button onClick={() => handleSaveOrAdd('ADD_TO_SALARY')} className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#10b981' }}>
            Add To Salary
          </button>
          <button className="btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderColor: 'var(--pay-primary)', color: 'var(--pay-primary)' }}>
            <FileDown size={16} /> Export To excel
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" /></th>
              <th>emp no</th>
              <th>name</th>
              <th>dept</th>
              <th>position</th>
              <th>status</th>
              <th>date of joining</th>
              <th>basis</th>
              <th>%</th>
              <th>amount</th>
              <th>message</th>
              <th>saved status</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id}>
                <td><input type="checkbox" /></td>
                <td>{row.empNo}</td>
                <td style={{ color: 'var(--text-color)', fontWeight: '500' }}>{row.name}</td>
                <td>{row.dept}</td>
                <td>{row.pos}</td>
                <td>{row.status}</td>
                <td>{row.doj}</td>
                <td style={{ padding: '4px' }}>
                  <input 
                    type="number" 
                    value={row.basis} 
                    onChange={(e) => handleRowChange(row.id, 'basis', e.target.value)}
                    style={{ width: '80px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </td>
                <td style={{ padding: '4px' }}>
                  <input 
                    type="number" 
                    value={row.percent} 
                    onChange={(e) => handleRowChange(row.id, 'percent', e.target.value)}
                    style={{ width: '60px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </td>
                <td style={{ padding: '4px' }}>
                  <input 
                    type="number" 
                    value={row.amount} 
                    onChange={(e) => handleRowChange(row.id, 'amount', e.target.value)}
                    style={{ width: '100px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </td>
                <td style={{ padding: '4px' }}>
                  <input 
                    type="text" 
                    value={row.message} 
                    onChange={(e) => handleRowChange(row.id, 'message', e.target.value)}
                    style={{ width: '100px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </td>
                <td style={{ fontWeight: 600, color: row.bonusStatus === 'ADDED_TO_SALARY' ? '#10b981' : (row.bonusStatus === 'SAVED' ? '#3b82f6' : '#94a3b8') }}>
                  {row.bonusStatus === 'ADDED_TO_SALARY' ? 'Salary Added' : (row.bonusStatus === 'SAVED' ? 'Draft' : 'Not Saved')}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No employees found matching the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
