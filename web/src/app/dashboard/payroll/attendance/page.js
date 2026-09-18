'use client';
import React, { useState, useEffect } from 'react';
import { Upload, Download, RefreshCw, Search, CheckCircle, XCircle, Save } from 'lucide-react';
import ActionToolbar from '@/components/ActionToolbar';
import MultiSelect from '@/components/MultiSelect';
import Dialog from '@/components/Dialog';

export function getLeaveAbbreviation(leaveType) {
  if (!leaveType) return 'CL';
  const lt = leaveType.toLowerCase().trim();
  if (lt.includes('casual') || lt === 'cl') return 'CL';
  if (lt.includes('earned') || lt.includes('paid') || lt === 'el' || lt === 'pl') return 'EL';
  if (lt.includes('sick') || lt.includes('medical') || lt === 'sl') return 'SL';
  if (lt.includes('without pay') || lt.includes('unpaid') || lt === 'lwp') return 'LWP';
  if (lt.includes('coff') || lt.includes('compensatory') || lt === 'c-off') return 'C-off';
  return 'CL';
}

export function resolveDayAttendance(emp, col, approvedLeaves = []) {
  const att = emp?.attendances?.find(a => a.date === col.fullDate);
  const rawStatus = att?.status;

  // 1. If manually edited by user in this session, respect that edit
  if (att?.isManual) {
    return rawStatus;
  }

  // 2. Check if there is an approved leave for this employee on this date
  const leave = approvedLeaves.find(l => 
    l.employeeId === emp?.id && 
    col.fullDate >= l.startDate && 
    col.fullDate <= l.endDate
  );

  if (leave) {
    return getLeaveAbbreviation(leave.leaveType);
  }

  // 3. Normalize raw status from database
  if (rawStatus) {
    if (rawStatus === 'Present') return 'P';
    if (rawStatus === 'Absent') return 'A';
    if (rawStatus === 'Half Day' || rawStatus === 'HD') return 'HD';
    if (rawStatus === 'Holiday') return 'H';
    if (rawStatus === 'Weekly Off') return 'W-off';
    if (rawStatus === 'Leave' || rawStatus === 'L') return 'CL';
    if (['P', 'A', 'HD', 'CL', 'SL', 'EL', 'C-off', 'LWP', 'W-off', 'H'].includes(rawStatus)) {
      return rawStatus;
    }
  }

  // 4. Default rules based on calendar day
  if (col.isHoliday) return 'H';
  if (col.isSunday) return 'W-off';
  return 'A';
}

export default function PayrollAttendance() {
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [data, setData] = useState(null);
  
  // Filters
  const [globalDepts, setGlobalDepts] = useState([]);
  const [globalBranches, setGlobalBranches] = useState([]);
  const [department, setDepartment] = useState('');
  const [branch, setBranch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');

  // MultiSelect states
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  
  const [loading, setLoading] = useState(false);

  // New state for approval workflow
  const [isApprovedMode, setIsApprovedMode] = useState(false);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Dialog state
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null, onCancel: null });

  // Fetch cycles on load
  useEffect(() => {
    fetch('/api/payroll/cycles')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setCycles(d);
          if (d.length > 0) setSelectedCycleId(d[0].id);
        }
      });

    // Fetch master departments and branches for synchronization
    fetch('/api/synchronization?type=departments')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) { setGlobalDepts(d); setSelectedDepartments(d.map(x => x.name || x)); } });
      
    fetch('/api/synchronization?type=branches')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) { setGlobalBranches(d); setSelectedBranches(d.map(x => x.name || x)); } });
  }, []);

  const fetchAttendance = async () => {
    if (!selectedCycleId) return;
    setLoading(true);
    setSelectedEmps([]);
    try {
      const q = new URLSearchParams({ cycleId: selectedCycleId });
      if (department) q.append('department', department);
      if (branch) q.append('branch', branch);
      
      const res = await fetch(`/api/payroll/attendance?${q}`, { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCycleId) fetchAttendance();
  }, [selectedCycleId]);

  const handleStatusChange = async (employeeId, dateStr, newStatus) => {
    // Auto-select row if edited
    if (!selectedEmps.includes(employeeId)) {
      setSelectedEmps(prev => [...prev, employeeId]);
    }

    // Optimistic update
    const updatedEmployees = data.employees.map(emp => {
      if (emp.id !== employeeId) return emp;
      
      const existingAtt = emp.attendances.find(a => a.date === dateStr);
      let newAttendances = [...emp.attendances];
      
      if (existingAtt) {
        newAttendances = newAttendances.map(a => a.date === dateStr ? { ...a, status: newStatus, isManual: true } : a);
      } else {
        newAttendances.push({ employeeId, date: dateStr, status: newStatus, isManual: true });
      }
      return { ...emp, attendances: newAttendances };
    });

    setData({ ...data, employees: updatedEmployees });

    // Auto-save the specific edit to the database immediately
    try {
      await fetch('/api/attendance/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ employeeId, date: dateStr, status: newStatus }]
        })
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  // Generate date range columns
  const getDateColumns = () => {
    if (!data?.cycle) return [];
    const start = new Date(data.cycle.startDate);
    const end = new Date(data.cycle.endDate);
    const columns = [];
    let current = new Date(start);
    while (current <= end) {
      const fullDate = current.toISOString().split('T')[0];
      const isSunday = current.getDay() === 0;
      const isHoliday = data.holidays?.some(h => h.date === fullDate);
      columns.push({
        fullDate,
        dayLabel: String(current.getDate()).padStart(2, '0'),
        isSunday,
        isHoliday
      });
      current.setDate(current.getDate() + 1);
    }
    return columns;
  };

  const dateCols = getDateColumns();
  const totalDays = dateCols.length;

  const filteredEmployees = data?.employees?.filter(emp => {
    if (employeeSearch && !emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) && !emp.empId?.toLowerCase().includes(employeeSearch.toLowerCase())) {
      return false;
    }
    
    // Approval filter
    let isEmpApproved = false;
    dateCols.forEach(col => {
       const att = emp.attendances?.find(a => a.date === col.fullDate);
       if (att && att.isApproved) isEmpApproved = true;
    });

    if (isApprovedMode && !isEmpApproved) return false;
    if (!isApprovedMode && isEmpApproved) return false;

    return true;
  });

  const calculateAggregates = (emp) => {
    const counts = { P: 0, A: 0, L: 0, H: 0, W: 0 };
    let unpaidDays = 0;

    dateCols.forEach(col => {
      const s = resolveDayAttendance(emp, col, data?.approvedLeaves || []);

      if (s === 'P' || s === 'Present') counts.P++;
      else if (s === 'A' || s === 'Absent') { counts.A++; unpaidDays++; }
      else if (s === 'LWP') { counts.A++; unpaidDays++; }
      else if (s === 'H' || s === 'Holiday') counts.H++;
      else if (s === 'W-off' || s === 'W') counts.W++;
      else if (['CL', 'SL', 'EL', 'C-off', 'Leave', 'L'].includes(s)) counts.L++;
    });
    
    const wageDays = totalDays - unpaidDays; 
    return { ...counts, wageDays };
  };

  const handleExportExcel = () => {
    if (!data || !filteredEmployees) return;
    const headers = ['Pay Cycle', 'Employee Name', 'Emp ID', 'Department', 'Branch', 'Total Days', 'Wage Days', 'P', 'A', 'L', 'H', 'W', ...dateCols.map(c => c.dayLabel)];
    
    const rows = filteredEmployees.map(emp => {
      const agg = calculateAggregates(emp);
      const row = [
        `"${data.cycle.name}"`,
        `"${emp.name}"`,
        `"${emp.empId}"`,
        `"${emp.department || ''}"`,
        `"${emp.branch || ''}"`,
        totalDays,
        agg.wageDays,
        agg.P, agg.A, agg.L, agg.H, agg.W
      ];
      
      dateCols.forEach(col => {
        const status = resolveDayAttendance(emp, col, data?.approvedLeaves || []);
        row.push(status);
      });
      return row;
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_${data.cycle.name}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedEmps(filteredEmployees.map(emp => emp.id));
    else setSelectedEmps([]);
  };

  const handleSelectEmp = (empId) => {
    setSelectedEmps(prev => prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]);
  };

  const handleSaveEdits = async () => {
    if (selectedEmps.length === 0) {
      alert("Please select at least one employee to save edits.");
      return;
    }
    setIsSaving(true);
    const updates = [];

    selectedEmps.forEach(empId => {
      const emp = data.employees.find(e => e.id === empId);
      if (!emp) return;
      // Instead of looping through all 30 days, we should only save what exists in optimistic state.
      // But actually, we implemented auto-save in handleStatusChange, so we don't strictly need this to loop over 30 days.
      // However, if the user explicitly hits Save Edits, we should just save their actual DB attendance, not invented defaults.
      dateCols.forEach(col => {
         const att = emp.attendances.find(a => a.date === col.fullDate);
         if (att) {
           updates.push({
             employeeId: empId,
             date: col.fullDate,
             status: att.status
           });
         }
      });
    });

    try {
      const res = await fetch('/api/attendance/bulk-update', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ updates })
      });
      if (res.ok) {
         setSelectedEmps([]);
         fetchAttendance();
         alert('Successfully saved edits!');
      } else {
         alert('Failed to save edits');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving edits');
    }
    setIsSaving(false);
  };

  const handleSave = () => {
    if (selectedEmps.length === 0) {
      alert("Please select at least one employee.");
      return;
    }
    const targetApprovalState = !isApprovedMode;
    
    const msg = targetApprovalState
      ? 'Are you sure you want to approve this attendance record? Once approved, it cannot be modified.'
      : 'Are you sure you want to unapprove? This will allow modifications again.';
      
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: targetApprovalState ? 'Approve Attendance' : 'Unapprove Attendance',
      message: msg,
      onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        
        setIsSaving(true);
        const updates = [];

        selectedEmps.forEach(empId => {
          const emp = data.employees.find(e => e.id === empId);
          if (!emp) return;
          dateCols.forEach(col => {
             const status = resolveDayAttendance(emp, col, data?.approvedLeaves || []);

             updates.push({
               employeeId: empId,
               date: col.fullDate,
               status: status
             });
          });
        });

        try {
          const res = await fetch('/api/attendance/bulk-update', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ updates, isApproved: targetApprovalState })
          });
          if (res.ok) {
             setSelectedEmps([]);
             fetchAttendance();
             alert(`Successfully ${targetApprovalState ? 'approved' : 'unapproved'} attendance!`);
          } else {
             alert('Failed to update attendance');
          }
        } catch (e) {
          console.error(e);
          alert('Error saving attendance');
        }
        setIsSaving(false);
      }
    });
  };


  return (
    <div>
      {/* Top Header Controls */}
      <div style={{ background: 'white', padding: '1rem', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0284c7' }}>Pay Cycle</label>
            <select value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem' }}>
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name} ({c.startDate} to {c.endDate})</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0284c7' }}>Department</label>
            <MultiSelect
              options={globalDepts.map(d => d.name || d)}
              selected={selectedDepartments}
              onChange={(vals) => { setSelectedDepartments(vals); }}
              placeholder="Select Department"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0284c7' }}>Branch</label>
            <MultiSelect
              options={globalBranches.map(b => b.name || b)}
              selected={selectedBranches}
              onChange={(vals) => { setSelectedBranches(vals); }}
              placeholder="Select Branch"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0284c7' }}>Employee Search</label>
            <input 
              type="text" 
              placeholder="Name or ID" 
              value={employeeSearch} 
              onChange={e => setEmployeeSearch(e.target.value)} 
              style={{ padding: '0.4rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem' }} 
            />
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#64748b', cursor: 'pointer' }}>
              <input type="radio" name="approval" checked={!isApprovedMode} onChange={() => setIsApprovedMode(false)} style={{ transform: 'scale(1.2)' }} /> Not Approved
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#64748b', cursor: 'pointer' }}>
              <input type="radio" name="approval" checked={isApprovedMode} onChange={() => setIsApprovedMode(true)} style={{ transform: 'scale(1.2)' }} /> Approved
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-outline" onClick={fetchAttendance}><RefreshCw size={14} /> Refresh</button>
            <button className="btn-outline" onClick={handleExportExcel} style={{ color: '#059669', borderColor: '#059669' }}><Download size={14} /> Export Excel</button>
            <button className="btn-primary" onClick={fetchAttendance}><Search size={14} /> Search</button>
          </div>
        </div>
      </div>

      <ActionToolbar onReset={fetchAttendance} shareTitle="Payroll Attendance" onSave={handleSaveEdits} />

      <div style={{ marginTop: '0.5rem', marginBottom: '1rem', display: 'flex', gap: '12px' }}>
        <button className="btn-primary" onClick={handleSaveEdits} disabled={isSaving || selectedEmps.length === 0} style={{ padding: '8px 24px', background: '#0ea5e9', border: 'none', borderRadius: '6px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: (isSaving || selectedEmps.length === 0) ? 'not-allowed' : 'pointer' }}>
          <Save size={16} />
          Save Edits
        </button>
        <button className="btn-primary" onClick={handleSave} disabled={isSaving || selectedEmps.length === 0} style={{ padding: '8px 24px', background: '#10b981', border: 'none', borderRadius: '6px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: (isSaving || selectedEmps.length === 0) ? 'not-allowed' : 'pointer' }}>
          <Save size={16} />
          {isSaving ? 'Saving...' : (isApprovedMode ? `Unapprove Selected (${selectedEmps.length})` : `Approve Selected (${selectedEmps.length})`)}
        </button>
      </div>

      {/* Main Matrix Area */}
      <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* Sub Header */}
        <div style={{ display: 'flex', gap: '1rem', background: '#f8fafc', padding: '0.5rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>
            Total Count: {filteredEmployees?.length || 0}
          </div>
          {data?.cycle && (
            <div style={{ background: '#f1f5f9', color: '#475569', padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.8rem', fontWeight: 500 }}>
              From: {data.cycle.startDate} To: {data.cycle.endDate}
            </div>
          )}
        </div>

        {/* Matrix Scrollable Container */}
        <div style={{ overflowX: 'auto', maxHeight: '60vh', position: 'relative' }}>
          <table style={{ minWidth: 'max-content', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
              {/* Header Row 1 */}
              <tr style={{ background: '#0284c7', color: 'white' }}>
                <th rowSpan={2} style={{ padding: '8px', background: '#0284c7', position: 'sticky', left: 0, zIndex: 30, borderRight: '1px solid #0369a1', textAlign: 'center' }}>
                  <input type="checkbox" checked={filteredEmployees?.length > 0 && selectedEmps.length === filteredEmployees.length} onChange={handleSelectAll} style={{ transform: 'scale(1.2)', cursor: 'pointer' }} />
                </th>
                <th rowSpan={2} style={{ padding: '8px 12px', textAlign: 'left', minWidth: 200, position: 'sticky', left: 35, background: '#0284c7', zIndex: 30, borderRight: '1px solid #0369a1' }}>Employee Details</th>
                <th rowSpan={2} style={{ padding: '8px', background: '#10b981', borderRight: '1px solid #059669', width: 60 }}>Total Days</th>
                <th rowSpan={2} style={{ padding: '8px', background: '#10b981', borderRight: '1px solid #059669', width: 60 }}>Wage Days</th>
                <th colSpan={5} style={{ padding: '8px', background: '#9333ea', borderRight: '1px solid #7e22ce' }}>Summary</th>
                <th colSpan={dateCols.length} style={{ padding: '8px', background: '#334155' }}>Date-wise Attendance</th>
              </tr>
              {/* Header Row 2 */}
              <tr style={{ background: '#0ea5e9', color: 'white' }}>
                <th style={{ padding: '6px', background: '#a855f7', width: 35 }}>P</th>
                <th style={{ padding: '6px', background: '#a855f7', width: 35 }}>A</th>
                <th style={{ padding: '6px', background: '#a855f7', width: 35 }}>L</th>
                <th style={{ padding: '6px', background: '#a855f7', width: 35 }}>H</th>
                <th style={{ padding: '6px', background: '#a855f7', width: 35, borderRight: '1px solid #7e22ce' }}>W</th>
                {dateCols.map(col => (
                  <th key={col.fullDate} style={{ padding: '6px', width: 45, background: '#475569', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>{col.dayLabel}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={100} style={{ padding: '2rem', textAlign: 'center' }}>Loading attendance...</td></tr>
              ) : filteredEmployees?.map((emp, idx) => {
                const agg = calculateAggregates(emp);
                const isChecked = selectedEmps.includes(emp.id);
                return (
                  <tr key={emp.id} style={{ background: isChecked ? '#f0f9ff' : (idx % 2 === 0 ? 'white' : '#f8fafc'), borderBottom: '1px solid #e2e8f0' }}>
                    {/* Checkbox Column */}
                    <td style={{ padding: '8px', position: 'sticky', left: 0, background: isChecked ? '#f0f9ff' : (idx % 2 === 0 ? 'white' : '#f8fafc'), zIndex: 10, borderRight: '1px solid #e2e8f0', textAlign: 'center' }}>
                       <input type="checkbox" checked={isChecked} onChange={() => handleSelectEmp(emp.id)} style={{ transform: 'scale(1.2)', cursor: 'pointer' }} />
                    </td>

                    {/* Frozen Employee Column */}
                    <td style={{ padding: '8px 12px', position: 'sticky', left: 35, background: isChecked ? '#f0f9ff' : (idx % 2 === 0 ? 'white' : '#f8fafc'), zIndex: 10, borderRight: '2px solid #cbd5e1' }}>
                      <div style={{ fontWeight: 600, color: '#0369a1' }}>{emp.name}</div>
                      <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{emp.empId} | {emp.designation || 'Employee'}</div>
                    </td>
                    
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#059669', borderRight: '1px solid #e2e8f0' }}>{totalDays}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#059669', borderRight: '1px solid #e2e8f0', background: isChecked ? '#d1fae5' : '#ecfdf5' }}>{agg.wageDays}</td>
                    
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#16a34a' }}>{agg.P}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#dc2626' }}>{agg.A}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#d97706' }}>{agg.L}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#0284c7' }}>{agg.H}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#4f46e5', borderRight: '2px solid #cbd5e1' }}>{agg.W}</td>
                    
                    {/* Dynamic Date Cells */}
                    {dateCols.map(col => {
                      const status = resolveDayAttendance(emp, col, data?.approvedLeaves || []);
                      
                      let color = '#334155';
                      let bgColor = 'transparent';
                      if (status === 'P') { color = '#16a34a'; bgColor = '#ecfdf5'; }
                      else if (['A', 'LWP'].includes(status)) { color = '#dc2626'; bgColor = '#fef2f2'; }
                      else if (status === 'W-off') { color = '#4f46e5'; bgColor = '#eef2ff'; }
                      else if (status === 'H') { color = '#0284c7'; bgColor = '#f0f9ff'; }
                      else if (status === 'HD') { color = '#2563eb'; bgColor = '#dbeafe'; }
                      else if (['CL', 'SL', 'EL', 'C-off', 'L', 'Leave'].includes(status)) { color = '#b45309'; bgColor = '#fef3c7'; }

                      return (
                        <td key={col.fullDate} style={{ padding: 0, borderRight: '1px solid #e2e8f0', textAlign: 'center', background: isApprovedMode ? '#f8fafc' : bgColor }}>
                          <select 
                            value={status} 
                            disabled={isApprovedMode}
                            onChange={(e) => handleStatusChange(emp.id, col.fullDate, e.target.value)}
                            style={{ 
                              width: '100%', height: '100%', padding: '8px 4px', border: 'none', 
                              background: 'transparent', color: color, fontWeight: 700,
                              cursor: isApprovedMode ? 'not-allowed' : 'pointer', appearance: 'none', textAlign: 'center'
                            }}>
                            <option value="-">-</option>
                            <option value="P">P</option>
                            <option value="HD">HD</option>
                            <option value="A">A</option>
                            <option value="CL">CL</option>
                            <option value="SL">SL</option>
                            <option value="EL">EL</option>
                            <option value="C-off">C-off</option>
                            <option value="LWP">LWP</option>
                            <option value="W-off">W-off</option>
                            <option value="H">H</option>
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {filteredEmployees?.length === 0 && (
                <tr>
                  <td colSpan={100} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    No employee data found for the selected approval status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <Dialog 
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onConfirm={dialogConfig.onConfirm}
        onCancel={dialogConfig.onCancel}
      />
    </div>
  );
}
