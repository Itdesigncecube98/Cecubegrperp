'use client';
import React, { useState, useEffect } from 'react';
import { PlusCircle, FileDown, Pencil, Trash2, Search, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import AppModal from '@/components/AppModal';
import ActionToolbar from '@/components/ActionToolbar';

const EMPTY = { cycle: '', startDate: '', endDate: '', freq: 'Monthly', employees: 'All Employees', selectedEmployeeIds: [], status: 'Open' };

export default function PayCycle() {
  const [fromDate, setFromDate] = useState('2025-08-01');
  const [toDate, setToDate] = useState('2026-08-31');
  const [status, setStatus] = useState('All');
  const [data, setData] = useState([]);
  const [modal, setModal] = useState({ open: false, mode: 'add' });
  const [form, setForm] = useState(EMPTY);
  const [delModal, setDelModal] = useState({ open: false, id: null });

  // Employee Selection State
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [empData, setEmpData] = useState([]);
  const [empSearch, setEmpSearch] = useState('');
  const [empBranch, setEmpBranch] = useState('');
  const [empLocation, setEmpLocation] = useState('');
  const [tempSelectedEmps, setTempSelectedEmps] = useState([]);

  const fetchCycles = async () => {
    try {
      const res = await fetch('/api/payroll/cycles');
      const json = await res.json();
      if (Array.isArray(json)) {
        const formatted = json.map(c => ({
          ...c,
          period: `${c.startDate} to ${c.endDate}`,
          freq: 'Monthly',
          selectedEmployeeIds: c.selectedEmployees || [],
          employees: c.selectedEmployees?.length > 0 ? `${c.selectedEmployees.length} Selected` : 'All Employees',
          cycle: c.name,
          count: c._count?.payrollRecords || 0
        }));
        setData(formatted);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  useEffect(() => {
    if (empModalOpen && empData.length === 0) {
      fetch('/api/employees')
        .then(r => r.json())
        .then(d => setEmpData(Array.isArray(d) ? d : []))
        .catch(e => console.error(e));
    }
  }, [empModalOpen]);

  const openAdd = () => { setForm(EMPTY); setModal({ open: true, mode: 'add' }); };
  const openEdit = (row) => { setForm({ ...row }); setModal({ open: true, mode: 'edit' }); };
  const openDel = (id) => setDelModal({ open: true, id });

  const handleSave = async () => {
    if (!form.cycle) return;
    
    const startDate = form.startDate;
    const endDate = form.endDate;
    
    if (!startDate || !endDate) {
      alert("Please select start and end dates");
      return;
    }

    try {
      if (modal.mode === 'add') {
        await fetch('/api/payroll/cycles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.cycle,
            startDate,
            endDate,
            status: form.status || 'Open',
            selectedEmployees: form.employees === 'All Employees' ? [] : (form.selectedEmployeeIds || [])
          })
        });
      } else {
        await fetch(`/api/payroll/cycles/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.cycle,
            startDate,
            endDate,
            status: form.status,
            selectedEmployees: form.employees === 'All Employees' ? [] : (form.selectedEmployeeIds || [])
          })
        });
      }
      fetchCycles();
      setModal({ open: false });
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleDelete = async () => {
    try {
      await fetch(`/api/payroll/cycles/${delModal.id}`, { method: 'DELETE' });
      fetchCycles();
      setDelModal({ open: false, id: null });
    } catch (e) {
      console.error(e);
    }
  };

  const renderField = ({ label, field, type = 'text', options }) => (
    <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{label}</label>
      {options
        ? <select value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={{ padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }}>
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        : <input type={type} value={form[field] || ''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
            style={{ padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }} />
      }
    </div>
  );

  const filteredEmps = empData.filter(e => {
    if (empSearch && !e.name.toLowerCase().includes(empSearch.toLowerCase()) && !e.empId?.toLowerCase().includes(empSearch.toLowerCase())) return false;
    if (empBranch && e.branch !== empBranch) return false;
    if (empLocation && e.locationName !== empLocation) return false;
    return true;
  });

  const uniqueBranches = [...new Set(empData.map(e => e.branch).filter(Boolean))];
  const uniqueLocations = [...new Set(empData.map(e => e.siteOffice).filter(Boolean))];

  const filteredData = data.filter(row => {
    let match = true;
    
    // Status filter
    if (status !== 'All') {
      // Normalize statuses for comparison (in case backend has DRAFT but frontend means Open)
      const rowStatus = row.status?.toUpperCase() || '';
      const filterStatus = status.toUpperCase();
      if (filterStatus === 'OPEN' && !['OPEN', 'DRAFT'].includes(rowStatus)) match = false;
      if (filterStatus === 'CLOSED' && rowStatus !== 'CLOSED') match = false;
    }
    
    // Date filter
    if (fromDate && row.startDate) {
      if (new Date(row.startDate) < new Date(fromDate)) match = false;
    }
    if (toDate && row.endDate) {
      if (new Date(row.endDate) > new Date(toDate)) match = false;
    }
    
    return match;
  });

  const exportToExcel = () => {
    const exportData = filteredData.map(row => ({
      "Pay Cycle": row.cycle,
      "Status": row.status,
      "Period": row.period,
      "Frequency": row.freq,
      "Employees": row.employees
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pay Cycles");
    XLSX.writeFile(workbook, "Pay_Cycles_Export.xlsx");
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem' }}>Filter Criteria</h3>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div className="filter-group">
            <label>From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option>All</option><option>Open</option><option>Closed</option>
            </select>
          </div>
        </div>
      </div>

      <ActionToolbar onReset={() => { setFromDate('2025-08-01'); setToDate('2026-08-31'); setStatus('All'); }} shareTitle="Pay Cycle" />

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>Pay Cycle</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-outline" style={{ borderColor: '#0284c7', color: '#0284c7' }} onClick={exportToExcel}>
            <FileDown size={14} /> Export To Excel
          </button>
          <button className="btn-primary" onClick={openAdd}>
            <PlusCircle size={14} /> New Pay Cycle
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 10 }}>
        <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px' }}>Pay Cycle</th>
              <th style={{ padding: '12px 16px' }}>Period</th>
              <th style={{ padding: '12px 16px' }}>Frequency</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Employees</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', width: 90 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0284c7' }}>{row.cycle} ({row.status})</td>
                <td style={{ padding: '12px 16px' }}>{row.period}</td>
                <td style={{ padding: '12px 16px' }}>{row.freq}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 500 }}>
                  {row.employees}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    <button className="icon-btn edit-btn" title="Edit" onClick={() => openEdit(row)}><Pencil size={14} /></button>
                    <button className="icon-btn delete-btn" title="Delete" onClick={() => openDel(row.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AppModal isOpen={modal.open} title={modal.mode === 'add' ? 'Add Pay Cycle' : 'Edit Pay Cycle'}
        onClose={() => setModal({ open: false })} onConfirm={handleSave}
        confirmLabel={modal.mode === 'add' ? 'Add' : 'Update'} size="md">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {renderField({ label: "Pay Cycle Name *", field: "cycle" })}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {renderField({ label: "From Date *", field: "startDate", type: "date" })}
            {renderField({ label: "To Date *", field: "endDate", type: "date" })}
          </div>
          {renderField({ label: "Frequency", field: "freq", options: ['Monthly', 'Weekly', 'Bi-Weekly'] })}
          
          {/* Employee Selection Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Select Employees</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select 
                value={form.employees === 'All Employees' ? 'All Employees' : 'Manual Select'} 
                onChange={e => {
                  setForm(p => ({ ...p, employees: e.target.value }));
                }} 
                style={{ flex: 1, padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem' }}>
                <option value="All Employees">All Employees</option>
                <option value="Manual Select">Manual Select</option>
              </select>
            </div>
            
            {(form.employees === 'Manual Select' || form.employees.includes('Selected') || form.selectedEmployeeIds?.length > 0) && (
              <div style={{ marginTop: 8 }}>
                <button 
                  className="btn-outline" 
                  onClick={() => {
                    setTempSelectedEmps([...(form.selectedEmployeeIds || [])]);
                    setEmpModalOpen(true);
                  }}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem' }}
                >
                  <Search size={14} style={{ marginRight: 4 }}/> 
                  {form.selectedEmployeeIds?.length > 0 ? `${form.selectedEmployeeIds.length} Employees Selected` : 'Select Employees Manually'}
                </button>
              </div>
            )}
          </div>

          {renderField({ label: "Status", field: "status", options: ['Open', 'Closed'] })}
        </div>
      </AppModal>

      {/* Delete Modal */}
      <AppModal isOpen={delModal.open} title="Delete Pay Cycle"
        onClose={() => setDelModal({ open: false })} onConfirm={handleDelete}
        confirmLabel="Delete" confirmColor="#ef4444" size="sm">
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Are you sure you want to delete this pay cycle? This action cannot be undone.</p>
      </AppModal>

      {/* Large Employee Select Modal */}
      {empModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 1100, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            
            {/* Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Add Employee for Pay cycle</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600 }}>
                  {tempSelectedEmps.length} Selected
                </div>
                <button onClick={() => setEmpModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
              </div>
            </div>

            {/* Filters */}
            <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0284c7' }}>Branch</label>
                <select value={empBranch} onChange={e => setEmpBranch(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem' }}>
                  <option value="">Select</option>
                  {uniqueBranches.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0284c7' }}>Location</label>
                <select value={empLocation} onChange={e => setEmpLocation(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem' }}>
                  <option value="">Select</option>
                  {uniqueLocations.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0284c7' }}>Search</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="Employee Name or Emp ID" value={empSearch} onChange={e => setEmpSearch(e.target.value)} style={{ flex: 1, padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem' }} />
                  <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', borderRadius: 6 }}><Search size={16} /></button>
                </div>
              </div>
            </div>

            {/* Table Area */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
              <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{ background: '#0ea5e9', color: 'white', textAlign: 'left', fontSize: '0.8rem' }}>
                    <th style={{ padding: '10px 12px' }}>
                      <input type="checkbox" 
                        checked={filteredEmps.length > 0 && tempSelectedEmps.length === filteredEmps.length}
                        onChange={(e) => {
                          if (e.target.checked) setTempSelectedEmps(filteredEmps.map(x => x.id));
                          else setTempSelectedEmps([]);
                        }}
                      />
                    </th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Emp Code</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Branch</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Department</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Location</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Joining Date</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Grade</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Gross Salary</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Employment Type</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Attd Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmps.length === 0 ? (
                    <tr>
                      <td colSpan="11" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No employees found</td>
                    </tr>
                  ) : (
                    filteredEmps.map((emp, index) => {
                      const isSelected = tempSelectedEmps.includes(emp.id);
                      return (
                        <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0', background: isSelected ? '#f0f9ff' : (index % 2 === 0 ? 'white' : '#f8fafc'), fontSize: '0.8rem', color: '#334155' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <input type="checkbox" checked={isSelected} onChange={() => {
                              setTempSelectedEmps(p => p.includes(emp.id) ? p.filter(x => x !== emp.id) : [...p, emp.id]);
                            }} />
                          </td>
                          <td style={{ padding: '8px 12px', color: '#0284c7' }}>{emp.empId || '-'}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 500, color: '#0f172a' }}>{emp.name}</td>
                          <td style={{ padding: '8px 12px' }}>{emp.branch || '-'}</td>
                          <td style={{ padding: '8px 12px' }}>{emp.department || '-'}</td>
                          <td style={{ padding: '8px 12px' }}>{emp.siteOffice || '-'}</td>
                          <td style={{ padding: '8px 12px' }}>{emp.joinedDate || '-'}</td>
                          <td style={{ padding: '8px 12px' }}>{emp.grade || '-'}</td>
                          <td style={{ padding: '8px 12px' }}>{emp.basicSalary ? `₹${emp.basicSalary}` : '-'}</td>
                          <td style={{ padding: '8px 12px' }}>{emp.employeeType || 'Permanent'}</td>
                          <td style={{ padding: '8px 12px' }}>No</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: '#f8fafc', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              <button className="btn-outline" onClick={() => setEmpModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => {
                setForm(p => ({ ...p, selectedEmployeeIds: tempSelectedEmps, employees: 'Manual Select' }));
                setEmpModalOpen(false);
              }}>Confirm Selection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
