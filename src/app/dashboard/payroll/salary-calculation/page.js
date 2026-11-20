'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, Calculator, Printer, FileDown, FileText } from 'lucide-react';
import MultiSelect from '@/components/MultiSelect';
import SalarySlipModal from './SalarySlipModal';
import Dialog from '@/components/Dialog';

export default function SalaryCalculation() {
  const router = useRouter();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [records, setRecords] = useState([]);
  const [cycleBonusIncentives, setCycleBonusIncentives] = useState([]);
  const [selectedRecordForSlip, setSelectedRecordForSlip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [approvingSelected, setApprovingSelected] = useState(false);
  const [removingMissing, setRemovingMissing] = useState(false);
  const selectAllRef = useRef(null);
  
  // Dialog state
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null, onCancel: null });
  
  // Filters
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedEmps, setSelectedEmps] = useState([]);

  // Checkbox states
  const [considerBonus, setConsiderBonus] = useState(false);
  const [considerLeaveEncash, setConsiderLeaveEncash] = useState(true);
  const [considerTds, setConsiderTds] = useState(true);

  useEffect(() => {
    fetch('/api/payroll/cycles')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setCycles(d);
          const requestedCycleId = new URLSearchParams(window.location.search).get('cycleId');
          const requestedCycle = d.find(cycle => cycle.id === requestedCycleId);
          if (requestedCycle || d.length > 0) setSelectedCycleId(requestedCycle?.id || d[0].id);
        }
      });
  }, []);

  const fetchDetails = async () => {
    if (!selectedCycleId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/cycles/${selectedCycleId}`);
      const data = await res.json();
      const recs = data.payrollRecords || [];
      setRecords(recs);
      setSelectedRecordIds([]);
      setCycleBonusIncentives(data.bonusIncentives || []);
      
      const uniqueDepts = [...new Set(recs.map(r => r.employee?.department).filter(Boolean))];
      const uniqueBranches = [...new Set(recs.map(r => r.employee?.branch).filter(Boolean))];
      const uniqueEmps = [...new Set(recs.map(r => r.employee ? `${r.employee.name} (${r.employee.empId})` : null).filter(Boolean))];

      setSelectedDepts(uniqueDepts);
      setSelectedBranches(uniqueBranches);
      setSelectedEmps(uniqueEmps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [selectedCycleId]);

  const handleCalculate = async () => {
    if (!selectedCycleId) return;
    const employeesToCalculate = records.filter(record =>
      ['PENDING', 'MISSING'].includes(record.status) &&
      (selectedRecordIds.length === 0 || selectedRecordIds.includes(record.id))
    );
    if (selectedRecordIds.length > 0 && employeesToCalculate.length === 0) {
      alert('Select at least one pending or missing salary record to calculate.');
      return;
    }
    if (employeesToCalculate.length === 0) {
      alert('There are no pending or missing salary records to calculate.');
      return;
    }

    setProcessing(true);
    try {
      const postCalculation = async employeeIds => {
        const response = await fetch(`/api/payroll/cycles/${selectedCycleId}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeIds, considerBonus, considerLeaveEncash, considerTds }),
        });
        return { response, result: await response.json() };
      };

      let employeeIds = [...new Set(employeesToCalculate.map(record => record.employeeId))];
      const skippedEmployees = new Map();
      let { response: res, result: json } = await postCalculation(employeeIds);

      // Validation responses happen before any payroll rows are written. Exclude those
      // employees and retry the remaining valid employees so one bad row cannot block a batch.
      for (let attempt = 0; attempt < 3 && !res.ok; attempt++) {
        const attendanceIssues = json.employeesNeedingAttendanceReview || [];
        const salaryIssues = json.employeesNeedingSalary || [];
        const issueIds = new Set([...attendanceIssues, ...salaryIssues].map(String));
        if (issueIds.size === 0) break;

        const blockedEmployeeIds = new Set();
        for (const record of employeesToCalculate) {
          if (!employeeIds.includes(record.employeeId)) continue;
          const identifiers = [record.employeeId, record.employee?.id, record.employee?.empId].filter(Boolean).map(String);
          const matchedIssue = identifiers.find(identifier => issueIds.has(identifier));
          if (!matchedIssue) continue;
          blockedEmployeeIds.add(record.employeeId);
          const reason = attendanceIssues.some(issue => String(issue) === matchedIssue)
            ? 'attendance missing or unapproved'
            : 'salary revision/legacy salary data missing';
          skippedEmployees.set(record.employeeId, `${record.employee?.name || matchedIssue} (${record.employee?.empId || matchedIssue}): ${reason}`);
        }
        if (blockedEmployeeIds.size === 0) break;
        employeeIds = employeeIds.filter(employeeId => !blockedEmployeeIds.has(employeeId));
        if (employeeIds.length === 0) break;
        ({ response: res, result: json } = await postCalculation(employeeIds));
      }
      if (json.success && skippedEmployees.size > 0) {
        await fetchDetails();
        alert(`Processed ${json.processedCount} records. Skipped ${skippedEmployees.size}: ${[...skippedEmployees.values()].join('; ')}`);
        return;
      }
      if (json.success) {
        await fetchDetails();
        alert(`✅ Processed ${json.processedCount} records successfully!`);
      } else {
        const attendanceEmployees = (json.employeesNeedingAttendanceReview || []).map(employeeId => {
          const employee = records.find(record =>
            record.employee?.empId === employeeId ||
            record.employeeId === employeeId ||
            record.employee?.id === employeeId
          )?.employee;
          return employee ? `${employee.name} (${employee.empId})` : employeeId;
        });
        const attendanceMessage = attendanceEmployees.length > 0
          ? `\nAttendance missing or unapproved for: ${attendanceEmployees.join(', ')}.\nApprove their attendance, then retry.`
          : '';
        alert(`❌ Error: ${json.error}${attendanceMessage}`);
      }
    } catch (e) {
      alert(`❌ Network error: ${e.message}`);
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveMissing = async () => {
    const employeeIds = [...new Set(selectedMissingRecords.map(record => record.employeeId))];
    if (!employeeIds.length || !selectedCycleId) return;
    if (!window.confirm(`Remove ${employeeIds.length} selected missing employee(s) from this pay cycle? Attendance and employee records will remain untouched.`)) return;

    setRemovingMissing(true);
    try {
      const response = await fetch(`/api/payroll/cycles/${encodeURIComponent(selectedCycleId)}/remove-missing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not remove missing employees.');
      await fetchDetails();
      alert(`${result.removedCount} missing employee(s) removed from this pay cycle. Attendance and employee records were not deleted.`);
    } catch (error) {
      alert(error.message || 'Could not remove missing employees.');
    } finally {
      setRemovingMissing(false);
    }
  };

  const uniqueDepts = [...new Set(records.map(r => r.employee?.department).filter(Boolean))];
  const uniqueBranches = [...new Set(records.map(r => r.employee?.branch).filter(Boolean))];
  const uniqueEmps = [...new Set(records.map(r => r.employee ? `${r.employee.name} (${r.employee.empId})` : null).filter(Boolean))];

  const handleToggleApprove = (id, newStatus) => {
    const isApproving = newStatus === 'APPROVED';
    const msg = isApproving 
      ? 'Are you sure you want to approve this salary record? Once approved, it cannot be modified.' 
      : 'Move this approved salary back to Salary Calculation? The approval voucher will be reversed. You can then reopen Attendance and unapprove attendance for reconsideration.';
      
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: isApproving ? 'Approve Salary' : 'Unapprove Salary',
      message: msg,
      onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(
            isApproving
              ? `/api/payroll/records/${id}/toggle-status`
              : '/api/payroll/records/unpost-to-salary-calculation',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(isApproving ? { status: newStatus } : { recordIds: [id] })
            }
          );
          const json = await res.json();
          if (res.ok && json.success) {
            setRecords(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
          } else {
            alert(json.error || 'Failed to update status');
          }
        } catch (e) {
          alert('Error updating status');
          console.error(e);
        }
      }
    });
  };

  const filteredRecords = records.filter(r => {
    const isAllDepts = selectedDepts.length === 0 || selectedDepts.length === uniqueDepts.length;
    const isAllBranches = selectedBranches.length === 0 || selectedBranches.length === uniqueBranches.length;
    const isAllEmps = selectedEmps.length === 0 || selectedEmps.length === uniqueEmps.length;

    const deptMatch = isAllDepts || (r.employee?.department && selectedDepts.includes(r.employee.department));
    const branchMatch = isAllBranches || (r.employee?.branch && selectedBranches.includes(r.employee.branch));
    const empLabel = r.employee ? `${r.employee.name} (${r.employee.empId})` : null;
    const empMatch = isAllEmps || (empLabel && selectedEmps.includes(empLabel));

    return deptMatch && branchMatch && empMatch;
  }).sort((a, b) => String(a.employee?.empId || '').localeCompare(String(b.employee?.empId || ''), undefined, { numeric: true, sensitivity: 'base' }));

  const totalProcessed = filteredRecords.filter(r => r.status === 'PROCESSED').length;
  const missingPayrollRecordCount = filteredRecords.filter(record => record.missingPayrollRecord).length;
  const totalNetPay = filteredRecords
    .filter(record => !record.missingPayrollRecord)
    .reduce((sum, record) => sum + (record.netPay || 0), 0)
    .toFixed(2);
  const visibleRecordIds = filteredRecords.map(record => record.id);
  const selectedVisibleCount = visibleRecordIds.filter(id => selectedRecordIds.includes(id)).length;
  const selectedPendingRecords = records.filter(record => selectedRecordIds.includes(record.id) && record.status === 'PENDING');
  const selectedMissingRecords = filteredRecords.filter(record => record.missingPayrollRecord && selectedRecordIds.includes(record.id));
  const approvedRecords = filteredRecords.filter(record => record.status === 'APPROVED');
  const selectedCycle = cycles.find(cycle => cycle.id === selectedCycleId);
  const cycleCanBeChanged = selectedCycle?.status !== 'COMPLETED';

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleRecordIds.length;
    }
  }, [selectedVisibleCount, visibleRecordIds.length]);

  const toggleRecordSelection = (id, checked) => {
    setSelectedRecordIds(previous => checked
      ? (previous.includes(id) ? previous : [...previous, id])
      : previous.filter(recordId => recordId !== id));
  };

  const openAttendanceForEmployees = salaryRecords => {
    if (!selectedCycleId || salaryRecords.length === 0) return;
    const query = new URLSearchParams({
      cycleId: selectedCycleId,
      employeeIds: salaryRecords.map(record => record.employeeId).join(','),
      attendanceMode: salaryRecords.every(record => !record.attendanceReviewRequired) ? 'approved' : 'pending',
    });
    router.push(`/dashboard/payroll/attendance?${query.toString()}`);
  };

  const handleApproveSelected = () => {
    const pending = selectedPendingRecords;
    if (!pending.length) return;
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Approve Selected Salaries',
      message: `Approve ${pending.length} selected pending salary record${pending.length === 1 ? '' : 's'}? Approved records can no longer be edited.`,
      onCancel: () => setDialogConfig(previous => ({ ...previous, isOpen: false })),
      onConfirm: async () => {
        setDialogConfig(previous => ({ ...previous, isOpen: false }));
        setApprovingSelected(true);
        const succeeded = [];
        const failed = [];
        for (const record of pending) {
          try {
            const response = await fetch(`/api/payroll/records/${record.id}/toggle-status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'APPROVED' })
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Approval failed');
            succeeded.push(record.id);
          } catch (error) {
            failed.push({ id: record.id, error: error.message });
          }
        }
        if (succeeded.length) {
          setRecords(previous => previous.map(record => succeeded.includes(record.id) ? { ...record, status: 'APPROVED' } : record));
          setSelectedRecordIds(previous => previous.filter(id => !succeeded.includes(id)));
        }
        setApprovingSelected(false);
        if (failed.length) {
          alert(`${succeeded.length} approved. ${failed.length} failed: ${failed.map(item => item.error).join('; ')}`);
        } else {
          alert(`${succeeded.length} salary record${succeeded.length === 1 ? '' : 's'} approved.`);
        }
      }
    });
  };

  const handleSlipSaveSuccess = (updatedRecord, updatedBonusIncentives) => {
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? { ...r, ...updatedRecord } : r));
    if (updatedBonusIncentives) {
      setCycleBonusIncentives(updatedBonusIncentives);
    }
    setSelectedRecordForSlip(prev => prev && prev.id === updatedRecord.id ? { ...prev, ...updatedRecord } : prev);
  };

  return (
    <div>
      <div className="filter-bar">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', width: '100%' }}>
          <div className="filter-group">
            <label>Pay Code</label>
            <select value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)}>
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Organization / Branch</label>
            <MultiSelect options={uniqueBranches} selected={selectedBranches} onChange={setSelectedBranches} placeholder="Select Branch" />
          </div>
          <div className="filter-group">
            <label>Department</label>
            <MultiSelect options={uniqueDepts} selected={selectedDepts} onChange={setSelectedDepts} placeholder="Select Department" />
          </div>
          <div className="filter-group">
            <label>Employee</label>
            <MultiSelect options={uniqueEmps} selected={selectedEmps} onChange={setSelectedEmps} placeholder="Select Employee" />
          </div>
        </div>
      </div>

      <div className="filter-bar" style={{ marginTop: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              checked={considerLeaveEncash}
              onChange={event => setConsiderLeaveEncash(event.target.checked)}
            />
            Include leave encashment for this pay cycle
          </label>
          <button className="btn-primary" onClick={handleCalculate} disabled={processing} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: processing ? '#94a3b8' : '#0ea5e9' }}>
            {processing ? <RefreshCw className="spin" size={16} /> : <Calculator size={16} />} 
            {processing ? 'Processing...' : 'Calculate'}
          </button>
          <button className="btn-primary" onClick={handleRemoveMissing} disabled={removingMissing || selectedMissingRecords.length === 0 || !cycleCanBeChanged} title="Remove selected MISSING employees from this pay cycle; attendance and employee records stay intact." style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: removingMissing || selectedMissingRecords.length === 0 || !cycleCanBeChanged ? '#94a3b8' : '#dc2626' }}>
            {removingMissing ? 'Removing...' : `Remove Missing${selectedMissingRecords.length ? ` (${selectedMissingRecords.length})` : ''}`}
          </button>
          <button className="btn-primary" onClick={() => window.print()} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#0ea5e9' }}>
            <Printer size={16} /> Print
          </button>
          <button className="btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderColor: 'var(--pay-primary)', color: 'var(--pay-primary)' }}>
            <FileDown size={16} /> Export To excel
          </button>
        </div>
      </div>

      <div className="summary-badges">
        <div className="summary-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>{filteredRecords.length} Employees</div>
        <div className="summary-badge green">Salary Processed : {totalProcessed}</div>
        <div className="summary-badge blue">Pending: {filteredRecords.length - totalProcessed}</div>
        {selectedRecordIds.length > 0 && <div className="summary-badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>{selectedRecordIds.length} selected</div>}
        <button className="btn-primary" onClick={handleApproveSelected} disabled={approvingSelected || selectedPendingRecords.length === 0 || !cycleCanBeChanged} style={{ marginLeft: 'auto', backgroundColor: approvingSelected || selectedPendingRecords.length === 0 || !cycleCanBeChanged ? '#94a3b8' : '#10b981' }}>
          {approvingSelected ? 'Approving...' : `Approve selected${selectedPendingRecords.length ? ` (${selectedPendingRecords.length})` : ''}`}
        </button>
        <button
          className="btn-primary"
          onClick={() => openAttendanceForEmployees(selectedPendingRecords)}
          disabled={selectedPendingRecords.length === 0 || !cycleCanBeChanged}
          title={selectedPendingRecords.length === 0 ? 'Select pending salaries to review their attendance.' : 'Open the selected employees in Attendance. Previously approved attendance remains approved until you unapprove it there.'}
          style={{ backgroundColor: selectedPendingRecords.length === 0 || !cycleCanBeChanged ? '#94a3b8' : '#0284c7' }}
        >
          Push to Attendance{selectedPendingRecords.length > 0 ? ` (${selectedPendingRecords.length})` : ''}
        </button>
        <button
          className="btn-primary"
          onClick={() => router.push(`/dashboard/payroll/post-salary?payCycleId=${encodeURIComponent(selectedCycleId)}`)}
          disabled={approvedRecords.length === 0}
          title={approvedRecords.length === 0 ? 'Approve salary records before sending them to Post Salary.' : `Open ${approvedRecords.length} approved salary record(s) in Post Salary.`}
          style={{ backgroundColor: approvedRecords.length === 0 ? '#94a3b8' : '#7c3aed' }}
        >
          Push to Post Salary{approvedRecords.length > 0 ? ` (${approvedRecords.length})` : ''}
        </button>
      </div>

      {missingPayrollRecordCount > 0 && (
        <div role="status" style={{ margin: '0.75rem 0', padding: '0.8rem 1rem', border: '1px solid #fca5a5', borderRadius: 8, background: '#fef2f2', color: '#991b1b', fontSize: '0.85rem' }}>
          <strong>{missingPayrollRecordCount} salary calculation record(s) are missing.</strong> These rows show salary revision estimates, not saved payroll records. Attendance data remains separate. Click <strong>Calculate</strong> to rebuild valid records; employees with unapproved attendance or no salary data will be skipped and identified.
        </div>
      )}

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px 8px 0 0', minHeight: 300 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
              <th style={{ padding: '10px', width: '40px' }}><input ref={selectAllRef} type="checkbox" aria-label="Select all visible payroll records" checked={visibleRecordIds.length > 0 && selectedVisibleCount === visibleRecordIds.length} onChange={event => {
                const visible = new Set(visibleRecordIds);
                setSelectedRecordIds(previous => event.target.checked
                  ? [...new Set([...previous, ...visibleRecordIds])]
                  : previous.filter(id => !visible.has(id)));
              }} /></th>
              <th style={{ padding: '10px' }}>EMP NO</th>
              <th style={{ padding: '10px' }}>NAME</th>
              <th style={{ padding: '10px' }}>POSITION</th>
              <th style={{ padding: '10px' }}>DEPT</th>
              <th style={{ padding: '10px' }}>BRANCH</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>W. DAYS</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>ABSENT</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>LEAVE ENC.</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>EARNING</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>DEDUCTION</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>NET SALARY</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} style={{ textAlign: 'center', padding: '2rem' }}>Loading records...</td></tr>
            ) : filteredRecords.length === 0 ? (
              <tr><td colSpan={13} style={{ textAlign: 'center', padding: '2rem' }}>No records found. Click Calculate to process.</td></tr>
            ) : filteredRecords.map((row, idx) => (
              <tr key={row.id} style={{ background: row.missingPayrollRecord ? '#fef2f2' : idx % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: row.missingPayrollRecord ? '#b91c1c' : undefined }}>
                <td style={{ padding: '8px' }}><input type="checkbox" aria-label={`Select ${row.employee?.name || 'employee'} payroll record`} checked={selectedRecordIds.includes(row.id)} disabled={!cycleCanBeChanged} onChange={event => toggleRecordSelection(row.id, event.target.checked)} /></td>
                <td style={{ padding: '8px', color: row.missingPayrollRecord ? '#b91c1c' : '#0284c7', fontWeight: 600 }}>{row.employee?.empId}</td>
                <td style={{ padding: '8px' }}>
                  {row.missingPayrollRecord ? (
                    <span title={row.salaryRevisionEffectiveFrom ? `Latest salary revision effective ${row.salaryRevisionEffectiveFrom}` : 'No salary revision found'} style={{ color: '#b91c1c', fontWeight: 700 }}>
                      {row.employee?.name} · Payroll missing
                    </span>
                  ) : <button
                    type="button"
                    onClick={() => setSelectedRecordForSlip(row)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '4px 6px',
                      margin: '-4px -6px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#0284c7',
                      fontWeight: 600,
                      font: 'inherit',
                      textAlign: 'left',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e0f2fe';
                      e.currentTarget.style.color = '#0369a1';
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#0284c7';
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                    title="Click to view & edit Salary Slip"
                  >
                    <span>{row.employee?.name}</span>
                    <FileText size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
                  </button>}
                </td>
                <td style={{ padding: '8px' }}>{row.employee?.designation}</td>
                <td style={{ padding: '8px' }}>{row.employee?.department || '-'}</td>
                <td style={{ padding: '8px' }}>{row.employee?.branch || '-'}</td>
                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#16a34a' }}>{row.workingDays}</td>
                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#dc2626' }}>{row.absentDays}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: row.missingPayrollRecord ? '#b91c1c' : '#d97706' }}>₹{row.leaveEncashment?.toFixed(2) || '0.00'}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: row.missingPayrollRecord ? '#b91c1c' : undefined }}>₹{row.grossPay?.toFixed(2)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: '#b91c1c' }}>₹{row.totalDeductions?.toFixed(2)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: row.missingPayrollRecord ? '#b91c1c' : '#059669', background: row.missingPayrollRecord ? '#fee2e2' : '#ecfdf5' }}>₹{row.netPay?.toFixed(2)}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  {row.missingPayrollRecord ? (
                    <span title={row.salaryRevisionEffectiveFrom ? `Salary shown from revision effective ${row.salaryRevisionEffectiveFrom}` : 'No salary revision found'} style={{ color: '#b91c1c', fontWeight: 800 }}>MISSING</span>
                  ) : row.status === 'PENDING' ? (
                    <button 
                      onClick={() => handleToggleApprove(row.id, 'APPROVED')}
                      style={{ background: '#10b981', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Approve
                    </button>
                  ) : row.status === 'APPROVED' ? (
                    <button
                      onClick={() => handleToggleApprove(row.id, 'PENDING')}
                      disabled={!cycleCanBeChanged}
                      title={!cycleCanBeChanged ? 'Completed pay cycle salaries cannot be unapproved.' : 'Reverse approval and return this salary to Salary Calculation.'}
                      style={{ background: !cycleCanBeChanged ? '#94a3b8' : '#dc2626', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: !cycleCanBeChanged ? 'not-allowed' : 'pointer' }}
                    >
                      Unapprove
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>POSTED</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 8px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-primary" onClick={handleCalculate} disabled={processing} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: processing ? '#94a3b8' : '#0ea5e9' }}>
          {processing ? <RefreshCw className="spin" size={16} /> : <Calculator size={16} />} 
          {processing ? 'Processing...' : 'Calculate'}
        </button>
        <div style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: '600' }}>
          Total Net: ₹{totalNetPay}
        </div>
      </div>

      {/* Interactive Salary Slip Modal */}
      {selectedRecordForSlip && (
        <SalarySlipModal
          record={selectedRecordForSlip}
          cycleName={cycles.find(c => c.id === selectedCycleId)?.name}
          cycleStatus={cycles.find(c => c.id === selectedCycleId)?.status}
          bonusIncentives={cycleBonusIncentives}
          onClose={() => setSelectedRecordForSlip(null)}
          onSaveSuccess={handleSlipSaveSuccess}
        />
      )}

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
