'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Download, RefreshCw, Search, CheckCircle, XCircle, Save } from 'lucide-react';
import ActionToolbar from '@/components/ActionToolbar';
import MultiSelect from '@/components/MultiSelect';
import Dialog from '@/components/Dialog';
import { getEmployeeWeekoffDays } from '@/lib/attendanceCalendar';
import { resolveDayAttendance } from '@/lib/payrollAttendance';
export { getLeaveAbbreviation, resolveDayAttendance } from '@/lib/payrollAttendance';

export default function PayrollAttendance() {
  const router = useRouter();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [data, setData] = useState(null);
  
  // Filters
  const [globalDepts, setGlobalDepts] = useState([]);
  const [globalBranches, setGlobalBranches] = useState([]);
  const [department, setDepartment] = useState('');
  const [branch, setBranch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [focusedEmployeeIds, setFocusedEmployeeIds] = useState([]);

  // MultiSelect states
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  
  const [loading, setLoading] = useState(false);

  // New state for approval workflow
  const [isApprovedMode, setIsApprovedMode] = useState(false);
  const [showAllAttendance, setShowAllAttendance] = useState(false);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [pendingEdits, setPendingEdits] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPushingToSalary, setIsPushingToSalary] = useState(false);
  const [dragFillEnabled, setDragFillEnabled] = useState(false);
  const [dragFillStatus, setDragFillStatus] = useState('P');
  const [salaryIssueEmployees, setSalaryIssueEmployees] = useState({});
  const draggingFillRef = useRef(false);
  const visitedFillCellsRef = useRef(new Set());

  useEffect(() => {
    const stopDragFill = () => { draggingFillRef.current = false; };
    window.addEventListener('pointerup', stopDragFill);
    window.addEventListener('pointercancel', stopDragFill);
    return () => {
      window.removeEventListener('pointerup', stopDragFill);
      window.removeEventListener('pointercancel', stopDragFill);
    };
  }, []);
  
  // Dialog state
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null, onCancel: null });

  // Fetch cycles on load
  useEffect(() => {
    fetch('/api/payroll/cycles')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setCycles(d);
          const query = new URLSearchParams(window.location.search);
          const requestedCycleId = query.get('cycleId');
          const requestedEmployeeIds = query.get('employeeIds') || query.get('employeeId');
          const requestedAttendanceMode = query.get('attendanceMode');
          if (requestedEmployeeIds) {
            setFocusedEmployeeIds(requestedEmployeeIds.split(',').filter(Boolean));
          }
          if (requestedAttendanceMode === 'approved') { setIsApprovedMode(true); setShowAllAttendance(false); }
          else if (requestedAttendanceMode === 'pending') { setIsApprovedMode(false); setShowAllAttendance(false); }
          const requestedCycle = d.find(cycle => cycle.id === requestedCycleId);
          if (requestedCycle || d.length > 0) setSelectedCycleId(requestedCycle?.id || d[0].id);
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
      setSelectedEmps((json.employees || [])
        .filter(employee => focusedEmployeeIds.includes(employee.id))
        .map(employee => employee.id));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCycleId) fetchAttendance();
  }, [selectedCycleId]);

  const handleStatusChange = (employeeId, dateStr, newStatus) => {
    const currentAttendance = data?.employees?.find(emp => emp.id === employeeId)?.attendances?.find(att => att.date === dateStr);
    if (isApprovedMode || (showAllAttendance && currentAttendance?.isApproved)) return;

    // Auto-select row if edited
    setSelectedEmps(prev => prev.includes(employeeId) ? prev : [...prev, employeeId]);

    setData(previous => {
      if (!previous) return previous;
      return {
        ...previous,
        employees: previous.employees.map(emp => {
          if (emp.id !== employeeId) return emp;
          const attendances = emp.attendances || [];
          const currentAttendance = attendances.find(att => att.date === dateStr);
          const updatedAttendance = { ...currentAttendance, employeeId, date: dateStr, status: newStatus, isApproved: false, isManual: true };
          return {
            ...emp,
            attendances: currentAttendance
              ? attendances.map(att => att.date === dateStr ? updatedAttendance : att)
              : [...attendances, updatedAttendance],
          };
        }),
      };
    });

    setPendingEdits(previous => [
      ...previous.filter(edit => edit.employeeId !== employeeId || edit.date !== dateStr),
      { employeeId, date: dateStr, status: newStatus, isApproved: false },
    ]);
  };

  const applyDragFill = (employeeId, dateStr) => {
    if (!dragFillEnabled || isApprovedMode) return;
    const key = `${employeeId}|${dateStr}`;
    if (visitedFillCellsRef.current.has(key)) return;
    if (showAllAttendance) {
      const attendance = data?.employees?.find(emp => emp.id === employeeId)?.attendances?.find(att => att.date === dateStr);
      if (attendance?.isApproved) return;
    }
    visitedFillCellsRef.current.add(key);
    handleStatusChange(employeeId, dateStr, dragFillStatus);
  };

  const startDragFill = (event, employeeId, dateStr) => {
    if (!dragFillEnabled || isApprovedMode || event.button !== 0) return;
    event.preventDefault();
    draggingFillRef.current = true;
    visitedFillCellsRef.current = new Set();
    applyDragFill(employeeId, dateStr);
  };

  const continueDragFill = (employeeId, dateStr) => {
    if (draggingFillRef.current) applyDragFill(employeeId, dateStr);
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
      const dayName = current.toLocaleDateString('en-US', { weekday: 'long' });
      const announcement = data.announcements?.find(item => item.date === fullDate);
      const isWorkingDay = announcement?.isWorkingDay === true;
      const isHoliday = !isWorkingDay && (data.holidays?.some(h => h.date === fullDate) || announcement?.isHoliday === true);
      const isWeekOff = !isWorkingDay && getEmployeeWeekoffDays(data.workWeeks || []).includes(dayName);
      columns.push({
        fullDate,
        dayLabel: String(current.getDate()).padStart(2, '0'),
        isSunday: dayName === 'Sunday',
        isWeekOff,
        isHoliday,
        isWorkingDay,
        dayName,
        weekoffTypes: data.weekoffTypes || [],
        workWeeks: data.workWeeks || [],
        title: isHoliday ? announcement?.subject || data.holidays?.find(h => h.date === fullDate)?.name : isWorkingDay ? 'Working Day' : isWeekOff ? 'Weekly Off' : '',
      });
      current.setDate(current.getDate() + 1);
    }
    return columns;
  };

  const dateCols = getDateColumns();
  const totalDays = dateCols.length;

  const isEmployeeFullyApproved = emp => {
    const attendances = emp.attendances || [];
    return attendances.length > 0 && attendances.every(att => att.isApproved);
  };
  const filteredEmployees = data?.employees?.filter(emp => {
    if (employeeSearch && !emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) && !emp.empId?.toLowerCase().includes(employeeSearch.toLowerCase())) {
      return false;
    }
    if (showAllAttendance) return true;
    const isEmpFullyApproved = isEmployeeFullyApproved(emp);
    if (isApprovedMode && !isEmpFullyApproved) return false;
    if (!isApprovedMode && isEmpFullyApproved) return false;

    return true;
  }).sort((a, b) => String(a.empId || '').localeCompare(String(b.empId || ''), undefined, { numeric: true, sensitivity: 'base' }));
  const allEmployeeCount = data?.employees?.length || 0;
  const approvedEmployeeCount = data?.employees?.filter(isEmployeeFullyApproved).length || 0;
  const notApprovedEmployeeCount = allEmployeeCount - approvedEmployeeCount;
  const salaryCalculationEmployeeIds = new Set((data?.payrollRecords || []).map(record => record.employeeId));
  const selectableAttendanceEmployees = (filteredEmployees || []).filter(emp =>
    !isApprovedMode || !salaryCalculationEmployeeIds.has(emp.id)
  );
  const eligibleAttendanceActionEmployeeIds = isApprovedMode
    ? selectedEmps.filter(employeeId => !salaryCalculationEmployeeIds.has(employeeId))
    : selectedEmps;
  const finalizedPayrollEmployeeIds = new Set(
    (data?.payrollRecords || [])
      .filter(record => !['PENDING', 'MISSING'].includes(record.status))
      .map(record => record.employeeId)
  );
  const pushableEmployeeCount = (filteredEmployees || [])
    .filter(emp => selectedEmps.includes(emp.id) && emp.attendances?.length > 0 && emp.attendances.every(att => att.isApproved) && !finalizedPayrollEmployeeIds.has(emp.id))
    .length;
  const selectedApprovedEmployeeCount = (filteredEmployees || []).filter(emp =>
    selectedEmps.includes(emp.id) && emp.attendances?.length > 0 && emp.attendances.every(att => att.isApproved)
  ).length;
  const pushToSalaryDisabled = isPushingToSalary ||
    pushableEmployeeCount === 0 ||
    data?.cycle?.status === 'COMPLETED';

  const calculateAggregates = (emp) => {
    const counts = { P: 0, A: 0, L: 0, H: 0, W: 0, U: 0 };
    let unpaidDays = 0;
    let unmarkedDays = 0;

    dateCols.forEach(col => {
      const s = resolveDayAttendance(emp, col, data?.approvedLeaves || []);

      if (s === 'P' || s === 'Present') counts.P++;
      else if (s === 'A' || s === 'Absent') { counts.A++; unpaidDays++; }
      else if (s === 'LWP') { counts.A++; unpaidDays++; }
      else if (s === 'HD' || s === 'Half Day') unpaidDays += 0.5;
      else if (s === 'H' || s === 'Holiday') counts.H++;
      else if (s === 'W-off' || s === 'W') counts.W++;
      else if (['CL', 'SL', 'EL', 'C-off', 'Leave', 'L'].includes(s)) counts.L++;
      else if (s === '-') unmarkedDays++;
    });
    
    const wageDays = totalDays - unpaidDays - unmarkedDays;
    return { ...counts, wageDays };
  };

  const handleExportExcel = () => {
    if (!data || !filteredEmployees) return;
    const headers = ['Pay Cycle', 'Employee Name', 'Emp ID', 'Department', 'Branch', 'Total Days', 'Wage Days', 'P', 'A', 'L', 'H', 'W', 'Not Marked', ...dateCols.map(c => c.dayLabel)];
    
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
        agg.P, agg.A, agg.L, agg.H, agg.W, agg.U
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
    if (e.target.checked) setSelectedEmps(selectableAttendanceEmployees.map(emp => emp.id));
    else setSelectedEmps([]);
  };

  const handleSelectEmp = (empId) => {
    setSelectedEmps(prev => prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]);
  };

  const handleSaveEdits = async () => {
    if (pendingEdits.length === 0) {
      alert("There are no attendance edits to save.");
      return;
    }
    setIsSaving(true);

    try {
      const res = await fetch('/api/attendance/bulk-update', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ updates: pendingEdits })
      });
      const result = await res.json();
      if (!res.ok || !result.success || result.count !== pendingEdits.length) {
         throw new Error(result.error || 'Some attendance edits were not saved.');
      }
      setPendingEdits([]);
      setSelectedEmps([]);
      await fetchAttendance();
      alert('Successfully saved edits!');
    } catch (e) {
      console.error(e);
      alert(e.message || 'Error saving edits');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    const targetApprovalState = !isApprovedMode;
    const employeeIdsToUpdate = targetApprovalState
      ? selectedEmps
      : selectedEmps.filter(employeeId => !salaryCalculationEmployeeIds.has(employeeId));
    if (employeeIdsToUpdate.length === 0) {
      if (!targetApprovalState && selectedEmps.length > 0) {
        alert('These employees already have salary records in Salary Calculation, so their attendance cannot be unapproved.');
        return;
      }
      alert("Please select at least one employee.");
      return;
    }
    
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

        employeeIdsToUpdate.forEach(empId => {
          const emp = data.employees.find(e => e.id === empId);
          if (!emp) return;
          dateCols.forEach(col => {
             const status = resolveDayAttendance(emp, col, data?.approvedLeaves || []);
             if (status === '-') return;

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
             body: JSON.stringify({ updates, isApproved: targetApprovalState, cycleId: selectedCycleId })
          });
          const result = await res.json();
          if (res.ok && result.success && result.count === updates.length) {
             setPendingEdits(previous => previous.filter(edit => !employeeIdsToUpdate.includes(edit.employeeId)));
             setSelectedEmps([]);
             setIsApprovedMode(targetApprovalState);
             setShowAllAttendance(false);
             await fetchAttendance();
             const skippedCount = selectedEmps.length - employeeIdsToUpdate.length;
             alert(`Successfully ${targetApprovalState ? 'approved' : 'unapproved'} attendance!${skippedCount ? ` ${skippedCount} employee(s) already pushed to Salary Calculation were skipped.` : ''}`);
          } else {
             alert(result.error || 'Some attendance records were not updated.');
          }
        } catch (e) {
          console.error(e);
          alert('Error saving attendance');
        }
        setIsSaving(false);
      }
    });
  };

  const handlePushToSalaryCalculation = async () => {
    const checkedEmployeeIds = new Set(selectedEmps);
    const employeeIds = (filteredEmployees || [])
      .filter(emp => checkedEmployeeIds.has(emp.id) && emp.attendances?.length > 0 && emp.attendances.every(att => att.isApproved))
      .map(emp => emp.id);
    if (!selectedCycleId || employeeIds.length === 0) {
      alert('Tick at least one approved employee to push to Salary Calculation.');
      return;
    }

    setIsPushingToSalary(true);
    setSalaryIssueEmployees({});
    try {
      const cycleResponse = await fetch(`/api/payroll/cycles/${encodeURIComponent(selectedCycleId)}`, { cache: 'no-store' });
      const cycleData = await cycleResponse.json();
      if (!cycleResponse.ok || !Array.isArray(cycleData.payrollRecords)) {
        throw new Error(cycleData.error || 'Could not check the existing salary records for this cycle.');
      }
      if (cycleData.status === 'COMPLETED') {
        throw new Error('This pay cycle is completed and cannot be reprocessed.');
      }

      const finalizedPayrollEmployeeIds = new Set(
        cycleData.payrollRecords
          .filter(record => !['PENDING', 'MISSING'].includes(record.status))
          .map(record => record.employeeId)
      );
      const configuredCycleEmployeeIds = (cycleData.selectedEmployees || [])
        .filter(employeeId => employeeId !== '__NO_EMPLOYEES_SELECTED__');
      const cycleWasExplicitlyEmptied = (cycleData.selectedEmployees || []).includes('__NO_EMPLOYEES_SELECTED__');
      const currentPayrollEmployeeIds = cycleData.payrollRecords.map(record => record.employeeId);
      const existingCycleEmployeeIds = new Set([...configuredCycleEmployeeIds, ...currentPayrollEmployeeIds]);
      const eligibleEmployeeIds = employeeIds.filter(employeeId => !finalizedPayrollEmployeeIds.has(employeeId));
      const skippedCount = employeeIds.length - eligibleEmployeeIds.length;

      // A manually emptied cycle has the sentinel above. Re-add only employees
      // explicitly checked and pushed by the user; an empty selection remains unrestricted.
      const employeesToRestore = eligibleEmployeeIds.filter(employeeId => !existingCycleEmployeeIds.has(employeeId));
      if (cycleWasExplicitlyEmptied || employeesToRestore.length > 0) {
        const selectedEmployees = [...new Set([...configuredCycleEmployeeIds, ...currentPayrollEmployeeIds, ...eligibleEmployeeIds])];
        const updateResponse = await fetch(`/api/payroll/cycles/${encodeURIComponent(selectedCycleId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cycleData.name,
            startDate: cycleData.startDate,
            endDate: cycleData.endDate,
            paymentDate: cycleData.paymentDate,
            status: cycleData.status,
            selectedEmployees,
          }),
        });
        const updateResult = await updateResponse.json();
        if (!updateResponse.ok) throw new Error(updateResult.error || 'Could not add the selected employees back to this pay cycle.');
      }

      if (eligibleEmployeeIds.length === 0) {
        if (skippedCount > 0) {
          alert('Selected employees already have approved or posted salary records. They were not pushed again.');
          return;
        }
        alert('No salary records need to be created or updated for the selected employees.');
        return;
      }

      const response = await fetch(`/api/payroll/cycles/${encodeURIComponent(selectedCycleId)}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: eligibleEmployeeIds,
          considerBonus: false,
          considerLeaveEncash: true,
          considerTds: true,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        if (Array.isArray(result.salaryDiagnostics) && result.salaryDiagnostics.length > 0) {
          const missingEmployeeIds = result.salaryDiagnostics.map(diagnostic => diagnostic.employeeId);
          setSalaryIssueEmployees(Object.fromEntries(
            result.salaryDiagnostics.map(diagnostic => [diagnostic.employeeId, diagnostic])
          ));
          setSelectedEmps(previous => previous.filter(employeeId => !missingEmployeeIds.includes(employeeId)));
          const names = result.salaryDiagnostics.map(diagnostic => `${diagnostic.name} (${diagnostic.employeeCode})`).join(', ');
          throw new Error(`${result.error} Red rows show affected employees: ${names}`);
        }
        const attendanceReview = result.employeesNeedingAttendanceReview?.join(', ');
        throw new Error(attendanceReview ? `${result.error} Employees: ${attendanceReview}` : result.error || 'Could not push attendance to salary calculation.');
      }

      if (skippedCount > 0) {
        alert(`${eligibleEmployeeIds.length} employee(s) pushed. Skipped ${skippedCount} already approved or posted.`);
      }
      router.push(`/dashboard/payroll/salary-calculation?cycleId=${encodeURIComponent(selectedCycleId)}`);
    } catch (error) {
      alert(error.message || 'Could not push attendance to salary calculation.');
    } finally {
      setIsPushingToSalary(false);
    }
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
              onChange={e => {
                setEmployeeSearch(e.target.value);
                setFocusedEmployeeIds([]);
              }}
              style={{ padding: '0.4rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem' }} 
            />
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#64748b', cursor: 'pointer' }}>
              <input type="radio" name="approval" checked={showAllAttendance} onChange={() => { setIsApprovedMode(false); setShowAllAttendance(true); }} style={{ transform: 'scale(1.2)' }} /> All ({allEmployeeCount})
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#64748b', cursor: 'pointer' }}>
              <input type="radio" name="approval" checked={!showAllAttendance && !isApprovedMode} onChange={() => { setShowAllAttendance(false); setIsApprovedMode(false); }} style={{ transform: 'scale(1.2)' }} /> Not Approved ({notApprovedEmployeeCount})
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#64748b', cursor: 'pointer' }}>
              <input type="radio" name="approval" checked={!showAllAttendance && isApprovedMode} onChange={() => { setShowAllAttendance(false); setIsApprovedMode(true); }} style={{ transform: 'scale(1.2)' }} /> Approved ({approvedEmployeeCount})
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

      <div style={{ marginTop: '0.5rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600 }}>
          Drag-fill status
          <select value={dragFillStatus} onChange={event => setDragFillStatus(event.target.value)} disabled={isApprovedMode} style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 5, background: '#fff', fontWeight: 700, color: '#0369a1' }}>
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
            <option value="-">Clear</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => { setDragFillEnabled(enabled => !enabled); draggingFillRef.current = false; visitedFillCellsRef.current = new Set(); }}
          disabled={isApprovedMode}
          aria-pressed={dragFillEnabled}
          style={{ padding: '8px 14px', border: `1px solid ${dragFillEnabled ? '#0284c7' : '#cbd5e1'}`, borderRadius: 6, background: dragFillEnabled ? '#e0f2fe' : '#fff', color: dragFillEnabled ? '#0369a1' : '#475569', fontWeight: 700, cursor: isApprovedMode ? 'not-allowed' : 'pointer', opacity: isApprovedMode ? .6 : 1 }}
        >
          {dragFillEnabled ? 'Drag Fill: On' : 'Drag Fill: Off'}
        </button>
        <span style={{ alignSelf: 'center', color: '#64748b', fontSize: 12 }}>
          {dragFillEnabled ? `Drag across this unapproved employee's dates to apply ${dragFillStatus}. Edited dates will be unapproved. Then click Save Edits.` : 'Turn on Drag Fill to change multiple attendance cells at once.'}
        </span>
        <button className="btn-primary" onClick={handleSaveEdits} disabled={isSaving || pendingEdits.length === 0} style={{ padding: '8px 24px', background: '#0ea5e9', border: 'none', borderRadius: '6px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: (isSaving || pendingEdits.length === 0) ? 'not-allowed' : 'pointer' }}>
          <Save size={16} />
          Save Edits
        </button>
        {isApprovedMode && filteredEmployees?.length > 0 && (
          <button
            className="btn-primary"
            onClick={handlePushToSalaryCalculation}
            disabled={pushToSalaryDisabled}
            title={data?.cycle?.status === 'COMPLETED'
              ? 'This pay cycle is completed.'
              : pushableEmployeeCount === 0
                ? selectedApprovedEmployeeCount === 0
                  ? 'Tick approved employee rows to choose who to push.'
                  : 'The selected employees already have approved or posted salary records.'
                : ''}
            style={{ padding: '8px 24px', background: pushToSalaryDisabled ? '#94a3b8' : '#7c3aed', border: 'none', borderRadius: '6px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: isPushingToSalary ? 'wait' : pushToSalaryDisabled ? 'not-allowed' : 'pointer' }}
          >
            {isPushingToSalary
              ? 'Pushing...'
              : data?.cycle?.status === 'COMPLETED'
                ? 'Cycle Completed'
                : pushableEmployeeCount === 0
                  ? selectedApprovedEmployeeCount === 0
                    ? 'Select Employees to Push'
                    : 'Already Pushed to Salary Calculation'
                  : `Push to Salary Calculation (${pushableEmployeeCount})`}
          </button>
        )}
        <button className="btn-primary" onClick={handleSave} disabled={isSaving || eligibleAttendanceActionEmployeeIds.length === 0 || showAllAttendance} title={showAllAttendance ? 'Choose Approved or Not Approved to change approval status.' : isApprovedMode && selectedEmps.length > 0 && eligibleAttendanceActionEmployeeIds.length === 0 ? 'Selected employees already have salary records and cannot be unapproved.' : ''} style={{ padding: '8px 24px', background: '#10b981', border: 'none', borderRadius: '6px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: (isSaving || eligibleAttendanceActionEmployeeIds.length === 0 || showAllAttendance) ? 'not-allowed' : 'pointer' }}>
          <Save size={16} />
          {isSaving ? 'Saving...' : (isApprovedMode ? `Unapprove Selected (${eligibleAttendanceActionEmployeeIds.length})` : `Approve Selected (${eligibleAttendanceActionEmployeeIds.length})`)}
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
                  <input type="checkbox" checked={selectableAttendanceEmployees.length > 0 && selectableAttendanceEmployees.every(emp => selectedEmps.includes(emp.id))} onChange={handleSelectAll} style={{ transform: 'scale(1.2)', cursor: 'pointer' }} />
                </th>
                <th rowSpan={2} style={{ padding: '8px 12px', textAlign: 'left', minWidth: 200, position: 'sticky', left: 35, background: '#0284c7', zIndex: 30, borderRight: '1px solid #0369a1' }}>Employee Details</th>
                <th rowSpan={2} style={{ padding: '8px', background: '#10b981', borderRight: '1px solid #059669', width: 60 }}>Total Days</th>
                <th rowSpan={2} style={{ padding: '8px', background: '#10b981', borderRight: '1px solid #059669', width: 60 }}>Wage Days</th>
                <th colSpan={6} style={{ padding: '8px', background: '#9333ea', borderRight: '1px solid #7e22ce' }}>Summary</th>
                <th colSpan={dateCols.length} style={{ padding: '8px', background: '#334155' }}>Date-wise Attendance</th>
              </tr>
              {/* Header Row 2 */}
              <tr style={{ background: '#0ea5e9', color: 'white' }}>
                <th style={{ padding: '6px', background: '#a855f7', width: 35 }}>P</th>
                <th style={{ padding: '6px', background: '#a855f7', width: 35 }}>A</th>
                <th style={{ padding: '6px', background: '#a855f7', width: 35 }}>L</th>
                <th style={{ padding: '6px', background: '#a855f7', width: 35 }}>H</th>
                <th style={{ padding: '6px', background: '#a855f7', width: 35 }}>W</th>
                <th style={{ padding: '6px', background: '#a855f7', width: 75, borderRight: '1px solid #7e22ce' }}>Not Marked</th>
                {dateCols.map(col => (
                  <th key={col.fullDate} title={`${col.fullDate}${col.title ? ` · ${col.title}` : ''}`} style={{ padding: '6px', width: 45, background: col.isHoliday ? '#b45309' : col.isWorkingDay ? '#1d4ed8' : col.isWeekOff ? '#64748b' : '#475569', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>{col.dayLabel}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={100} style={{ padding: '2rem', textAlign: 'center' }}>Loading attendance...</td></tr>
              ) : filteredEmployees?.map((emp, idx) => {
                const agg = calculateAggregates(emp);
                const isChecked = selectedEmps.includes(emp.id);
                const salaryCalculationLocked = isApprovedMode && salaryCalculationEmployeeIds.has(emp.id);
                const salaryIssue = salaryIssueEmployees[emp.id];
                return (
                  <tr key={emp.id} title={salaryIssue?.reason} style={{ background: salaryIssue ? '#fee2e2' : isChecked ? '#f0f9ff' : (idx % 2 === 0 ? 'white' : '#f8fafc'), borderBottom: salaryIssue ? '1px solid #f87171' : '1px solid #e2e8f0' }}>
                    {/* Checkbox Column */}
                    <td style={{ padding: '8px', position: 'sticky', left: 0, background: salaryIssue ? '#fee2e2' : isChecked ? '#f0f9ff' : (idx % 2 === 0 ? 'white' : '#f8fafc'), zIndex: 10, borderRight: '1px solid #e2e8f0', textAlign: 'center' }}>
                       <input type="checkbox" checked={isChecked && !salaryCalculationLocked} disabled={salaryCalculationLocked} title={salaryCalculationLocked ? 'This attendance has been pushed to Salary Calculation and cannot be unapproved.' : ''} onChange={() => handleSelectEmp(emp.id)} style={{ transform: 'scale(1.2)', cursor: salaryCalculationLocked ? 'not-allowed' : 'pointer' }} />
                    </td>

                    {/* Frozen Employee Column */}
                    <td style={{ padding: '8px 12px', position: 'sticky', left: 35, background: salaryIssue ? '#fee2e2' : isChecked ? '#f0f9ff' : (idx % 2 === 0 ? 'white' : '#f8fafc'), zIndex: 10, borderRight: '2px solid #cbd5e1' }}>
                      <div style={{ fontWeight: 700, color: salaryIssue ? '#b91c1c' : '#0369a1' }}>
                        {emp.name}
                        {salaryIssue && <span title={`${salaryIssue.reason} Basic: ₹${salaryIssue.legacySalaryFields.basicSalary}, HRA: ₹${salaryIssue.legacySalaryFields.hra}, Special allowance: ₹${salaryIssue.legacySalaryFields.specialAllowance}, Conveyance: ₹${salaryIssue.legacySalaryFields.conveyance}, Medical: ₹${salaryIssue.legacySalaryFields.medical}`} style={{ display: 'inline-block', marginLeft: 8, padding: '2px 6px', borderRadius: 4, background: '#b91c1c', color: 'white', fontSize: 10, fontWeight: 800 }}>SALARY MISSING</span>}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{emp.empId} | {emp.designation || 'Employee'}</div>
                      {salaryCalculationLocked && <div style={{ marginTop: 3, color: '#b45309', fontSize: 10, fontWeight: 700 }}>Pushed to Salary Calculation · attendance locked</div>}
                      {salaryIssue && <div style={{ marginTop: 3, color: '#991b1b', fontSize: 10, fontWeight: 700 }}>
                        No salary revision; legacy values — Basic {salaryIssue.legacySalaryFields.basicSalary}, HRA {salaryIssue.legacySalaryFields.hra}, Special {salaryIssue.legacySalaryFields.specialAllowance}, Conveyance {salaryIssue.legacySalaryFields.conveyance}, Medical {salaryIssue.legacySalaryFields.medical}
                      </div>}
                    </td>
                    
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#059669', borderRight: '1px solid #e2e8f0' }}>{totalDays}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: salaryIssue ? '#b91c1c' : '#059669', borderRight: '1px solid #e2e8f0', background: salaryIssue ? '#fecaca' : isChecked ? '#d1fae5' : '#ecfdf5' }}>{agg.wageDays}</td>
                    
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#16a34a' }}>{agg.P}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#dc2626' }}>{agg.A}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#d97706' }}>{agg.L}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#0284c7' }}>{agg.H}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#4f46e5' }}>{agg.W}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#64748b', borderRight: '2px solid #cbd5e1' }}>{agg.U}</td>
                    
                    {/* Dynamic Date Cells */}
                    {dateCols.map(col => {
                      const status = resolveDayAttendance(emp, col, data?.approvedLeaves || []);
                      const isCellApproved = Boolean(emp.attendances?.find(att => att.date === col.fullDate)?.isApproved);
                      const isCellLocked = isApprovedMode || (showAllAttendance && isCellApproved);
                      
                      let color = '#334155';
                      let bgColor = 'transparent';
                      if (status === 'P') { color = '#16a34a'; bgColor = '#ecfdf5'; }
                      else if (['A', 'LWP'].includes(status)) { color = '#dc2626'; bgColor = '#fef2f2'; }
                      else if (status === 'W-off') { color = '#4f46e5'; bgColor = '#eef2ff'; }
                      else if (status === 'H') { color = '#0284c7'; bgColor = '#f0f9ff'; }
                      else if (status === 'HD') { color = '#2563eb'; bgColor = '#dbeafe'; }
                      else if (['CL', 'SL', 'EL', 'C-off', 'L', 'Leave'].includes(status)) { color = '#b45309'; bgColor = '#fef3c7'; }

                      return (
                        <td key={col.fullDate} style={{ padding: 0, borderRight: '1px solid #e2e8f0', textAlign: 'center', background: salaryIssue ? '#fee2e2' : isCellLocked ? '#f8fafc' : bgColor }}>
                          {dragFillEnabled ? (
                            <div
                              role="button"
                              aria-label={`${emp.name}, ${col.fullDate}: ${status}${isCellApproved ? ', already approved' : ''}`}
                              title={isCellLocked ? 'Approved attendance is locked.' : `Drag to apply ${dragFillStatus}; saving will unapprove this date.`}
                              onPointerDown={event => startDragFill(event, emp.id, col.fullDate)}
                              onPointerEnter={() => continueDragFill(emp.id, col.fullDate)}
                              onPointerMove={() => continueDragFill(emp.id, col.fullDate)}
                              style={{
                                minWidth: 39, minHeight: 34, display: 'grid', placeItems: 'center', padding: '8px 4px',
                                color: isCellLocked ? '#94a3b8' : color,
                                background: salaryIssue ? '#fee2e2' : isCellLocked ? '#f1f5f9' : bgColor,
                                fontWeight: 700, cursor: isCellLocked ? 'not-allowed' : 'crosshair',
                                userSelect: 'none', touchAction: 'none',
                                outline: !isCellLocked && status === dragFillStatus ? '1px solid #38bdf8' : 'none',
                              }}
                            >
                              {status}
                            </div>
                          ) : (
                            <select
                              value={status}
                              title={isCellLocked ? 'Approved attendance is locked.' : isCellApproved ? 'Editing this date will remove its approval.' : ''}
                              disabled={isCellLocked}
                              onChange={event => handleStatusChange(emp.id, col.fullDate, event.target.value)}
                              style={{
                                width: '100%', height: '100%', padding: '8px 4px', border: 'none',
                                background: 'transparent', color: isCellLocked ? '#94a3b8' : color, fontWeight: 700,
                                cursor: isCellLocked ? 'not-allowed' : 'pointer', appearance: 'none', textAlign: 'center',
                              }}
                            >
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
                          )}
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
