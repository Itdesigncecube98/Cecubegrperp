'use client';

import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, FileDown, Edit3 } from 'lucide-react';
import AppModal from '@/components/AppModal';
import MultiSelect from '@/components/MultiSelect';

export default function MonthlyChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ year: '2026-2027', department: '', employeeId: '' });
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { employeeId, month, amount, filingId, year }
  const [editAmount, setEditAmount] = useState('');

  const monthsHeader = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

  useEffect(() => {
    fetchData();
    fetchDepartments();
    fetch('/api/synchronization?type=siteoffices').then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        const names = d.map(x => x.name || x.siteOfficeName || x).filter(Boolean);
        setBranches(names);
        setSelectedBranches(names);
      }
    }).catch(console.error);
    fetch('/api/employees').then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        setEmployees(d);
        setSelectedEmployees(d.map(e => `${e.name} (${e.empId})`));
      }
    }).catch(console.error);
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/synchronization?type=departments');
      if (res.ok) {
        const json = await res.json();
        setDepartments(json);
        setSelectedDepartments(json.map(d => d.name || d));
      }
    } catch (error) {
      console.error('Failed to fetch departments', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ adminView: 'true' });
      if (filters.year) params.append('year', filters.year);
      if (filters.department) params.append('department', filters.department);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);

      const res = await fetch(`/api/tds?${params.toString()}`);
      if (res.ok) {
        const employees = await res.json();
        
        const mappedData = employees.map(emp => {
          let total = 0;
          // Store raw filing object for editing purposes
          const monthsData = Array(12).fill(null).map((_, i) => {
            const m = monthsHeader[i];
            const filing = emp.tdsFilings.find(f => f.month === m);
            if (filing) {
              total += filing.amount;
              return { amount: filing.amount.toFixed(2), filingId: filing.id };
            }
            return { amount: '0.00', filingId: null };
          });
          
          return {
            id: emp.id,
            empNo: emp.empId || 'N/A',
            name: emp.name || 'Unknown',
            dept: emp.department || 'N/A',
            position: emp.position || 'N/A',
            total: total.toFixed(2),
            months: monthsData
          };
        });
        
        setData(mappedData);
      }
    } catch (error) {
      console.error('Failed to fetch TDS data', error);
    }
    setLoading(false);
  };

  const handleReset = () => {
    setFilters({ year: '2026-2027', department: '', employeeId: '' });
    setTimeout(fetchData, 0);
  };

  const openEditModal = (empId, monthIndex, cellData) => {
    setEditingCell({
      employeeId: empId,
      month: monthsHeader[monthIndex],
      year: filters.year,
      filingId: cellData.filingId
    });
    setEditAmount(cellData.amount === '0.00' ? '' : cellData.amount);
    setModalOpen(true);
  };

  const handleSaveTds = async () => {
    if (!editAmount || isNaN(editAmount)) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      if (editingCell.filingId) {
        // Update existing
        await fetch('/api/tds', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCell.filingId,
            amount: editAmount
          })
        });
      } else {
        // Create new
        await fetch('/api/tds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: editingCell.employeeId,
            month: editingCell.month,
            year: editingCell.year,
            amount: editAmount
          })
        });
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save TDS', error);
      alert('Failed to save TDS');
    }
  };

  const exportToExcel = () => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }
    
    const headers = ['Emp No', 'Name', 'Department', 'Position', 'Total TDS', ...monthsHeader];
    
    const rows = data.map(r => [
      r.empNo,
      r.name,
      r.dept,
      r.position,
      r.total,
      ...r.months.map(m => m.amount)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${v}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TDS_Report_${filters.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="filter-bar" style={{ flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ width: '100%', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Filter Criteria
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
          <div className="filter-group">
            <label>Organization / Branch</label>
            <MultiSelect options={branches} selected={selectedBranches} onChange={setSelectedBranches} placeholder="Select Branch" />
          </div>
          <div className="filter-group">
            <label>Department</label>
            <MultiSelect options={departments.map(d => d.name || d)} selected={selectedDepartments} onChange={setSelectedDepartments} placeholder="Select Department" />
          </div>
          <div className="filter-group">
            <label>Employee</label>
            <MultiSelect options={employees.map(e => `${e.name} (${e.empId})`)} selected={selectedEmployees} onChange={setSelectedEmployees} placeholder="Select Employee" />
          </div>
          <div className="filter-group">
            <label>Financial Year</label>
            <select value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})}>
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
            </select>
          </div>
        </div>
        <div className="filter-actions" style={{ width: '100%', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }} onClick={handleReset}>
            <RotateCcw size={14} /> Reset
          </button>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }} onClick={fetchData}>
            <Search size={14} /> Search
          </button>
        </div>
      </div>

      <div className="action-bar" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ backgroundColor: '#e0f2fe', color: 'var(--tds-primary)', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
            Total Employees: {data.length}
          </div>
          <button className="btn-primary" style={{ backgroundColor: '#0ea5e9' }} onClick={exportToExcel}>
            <FileDown size={14} /> Export to excel
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <table style={{ minWidth: '1600px', width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Emp No</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Name</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Department</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Position</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#0ea5e9' }}>Total TDS</th>
              {monthsHeader.map(m => (
                <th key={m} style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.8rem' }}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan="17" style={{ textAlign: 'center', padding: '1rem' }}>Loading...</td></tr>
            ) : data.length === 0 ? (
               <tr><td colSpan="17" style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>No Employees found</td></tr>
            ) : data.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{r.empNo}</td>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{r.dept}</td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{r.position}</td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>{r.total}</td>
                {r.months.map((m, idx) => (
                  <td key={idx} style={{ padding: '0.4rem', textAlign: 'center' }}>
                    <div 
                      onClick={() => openEditModal(r.id, idx, m)}
                      style={{ 
                        cursor: 'pointer', 
                        padding: '0.4rem', 
                        borderRadius: '4px',
                        backgroundColor: parseFloat(m.amount) > 0 ? '#ecfdf5' : '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        color: parseFloat(m.amount) > 0 ? '#059669' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0ea5e9'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                      title="Click to add/edit TDS"
                    >
                      <span>{m.amount}</span>
                      <Edit3 size={12} style={{ opacity: 0.5 }} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AppModal isOpen={modalOpen} title={`Update TDS for ${editingCell?.month} ${editingCell?.year}`} onClose={() => setModalOpen(false)} onConfirm={handleSaveTds} confirmLabel="Save TDS" size="sm">
        <div style={{ padding: '1rem 0' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>TDS Amount *</label>
          <input 
            type="number" 
            step="0.01" 
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }} 
            value={editAmount} 
            onChange={(e) => setEditAmount(e.target.value)}
            placeholder="Enter amount (e.g. 1500.00)"
            autoFocus
          />
        </div>
      </AppModal>
    </div>
  );
}
