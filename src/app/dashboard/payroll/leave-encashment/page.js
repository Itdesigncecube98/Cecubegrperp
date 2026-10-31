'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import MultiSelect from '@/components/MultiSelect';

async function fetchLeaveEncashmentEmployees(month) {
  const response = await fetch(`/api/payroll/leave-encashment?asOnDate=${encodeURIComponent(month)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load leave balances.');
  return Array.isArray(data) ? data : [];
}

function createInitialEdits(employees) {
  return Object.fromEntries(employees.map(employee => [
    employee.id,
    {
      leaveType: 'Earned Leave',
      encashedDays: '',
      amountPerDay: ((Number(employee.grossSalary) || 0) / 26).toFixed(2),
      message: '',
    },
  ]));
}

export default function LeaveEncashment() {
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [asOnDate, setAsOnDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const initialMonth = useRef(asOnDate);

  // Editable row state
  const [edits, setEdits] = useState({});

  useEffect(() => {
    let active = true;
    fetchLeaveEncashmentEmployees(initialMonth.current)
      .then(employees => {
        if (!active) return;
        setAllEmployees(employees);
        setEdits(createInitialEdits(employees));
      })
      .catch(error => {
        if (active) {
          console.error('Failed to load leave balances:', error);
          alert(error.message || 'Failed to load leave balances.');
        }
      })
      .finally(() => setLoading(false));
    return () => { active = false; };
  }, []);

  const handleMonthChange = async month => {
    setAsOnDate(month);
    setLoading(true);
    try {
      const employees = await fetchLeaveEncashmentEmployees(month);
      setAllEmployees(employees);
      setEdits(createInitialEdits(employees));
    } catch (error) {
      console.error('Failed to load leave balances:', error);
      alert(error.message || 'Failed to load leave balances.');
    } finally {
      setLoading(false);
    }
  };

  const uniqueDepts = [...new Set(allEmployees.map(r => r.department).filter(Boolean))];
  const uniqueEmps = [...new Set(allEmployees.map(r => `${r.name} (${r.empId})`))];

  const filteredEmployees = allEmployees.filter(r => {
    const isAllDepts = selectedDepts.length === 0 || selectedDepts.length === uniqueDepts.length;
    const isAllEmps = selectedEmps.length === 0 || selectedEmps.length === uniqueEmps.length;

    const deptMatch = isAllDepts || (r.department && selectedDepts.includes(r.department));
    const empLabel = `${r.name} (${r.empId})`;
    const empMatch = isAllEmps || selectedEmps.includes(empLabel);

    return deptMatch && empMatch;
  });

  const handleEditChange = (empId, field, value) => {
    setEdits(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value
      }
    }));
  };

  const saveEncashment = async employee => {
    const edit = edits[employee.id];
    const encashedDays = Number(edit?.encashedDays);
    if (!Number.isFinite(encashedDays) || encashedDays <= 0) {
      throw new Error(`Enter valid encashment days for ${employee.name}.`);
    }

    const response = await fetch('/api/payroll/leave-encashment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: employee.id,
        asOnDate,
        leaveType: edit.leaveType,
        encashedDays,
        message: edit.message,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || `Could not encash leave for ${employee.name}.`);
    }
    return result;
  };

  const handleSave = async () => {
    const toSave = filteredEmployees.filter(employee =>
      Number(edits[employee.id]?.encashedDays) > 0
    );

    if (toSave.length === 0) {
      alert('No valid encashment days entered to save.');
      return;
    }

    setSaving(true);
    const failures = [];
    for (const employee of toSave) {
      try {
        await saveEncashment(employee);
      } catch (error) {
        failures.push(`${employee.name}: ${error.message}`);
      }
    }

    if (failures.length > 0) {
      alert(`${toSave.length - failures.length} encashment(s) saved. ${failures.length} failed:\n${failures.join('\n')}`);
    } else {
      alert(`Successfully processed ${toSave.length} encashment(s)!`);
    }
    if (failures.length < toSave.length) {
      window.location.reload();
      return;
    }
    setSaving(false);
  };

  const handleSaveEmployee = async employee => {
    setSaving(true);
    try {
      await saveEncashment(employee);
      alert(`Leave encashment saved for ${employee.name}.`);
      window.location.reload();
    } catch (error) {
      console.error(`Failed to save leave encashment for ${employee.name}:`, error);
      alert(error.message || `Could not encash leave for ${employee.name}.`);
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="filter-bar">
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', gap: '1rem', width: '100%' }}>
          <div className="filter-group">
            <label>Department</label>
            <MultiSelect options={uniqueDepts} selected={selectedDepts} onChange={setSelectedDepts} placeholder="Select Department" />
          </div>
          <div className="filter-group">
            <label>Employee</label>
            <MultiSelect options={uniqueEmps} selected={selectedEmps} onChange={setSelectedEmps} placeholder="Select Employee" />
          </div>
          <div className="filter-group">
            <label>As on Date</label>
            <input type="month" value={asOnDate} onChange={e => {
              void handleMonthChange(e.target.value);
            }} />
          </div>
        </div>
      </div>

      <p style={{ margin: '0.75rem 0', color: '#475569', fontSize: '0.85rem' }}>
        Earned Leave accrues at 1.5 days per month after 10 months of service. The leave year starts in April, and unused days carry forward until encashed.
      </p>

      <div style={{ marginTop: '0.5rem', marginBottom: '1rem', display: 'flex' }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '8px 24px', background: '#0ea5e9', border: 'none', borderRadius: '6px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: saving ? 'not-allowed' : 'pointer' }}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', minHeight: 300 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0ea5e9', color: 'white', textAlign: 'left', fontSize: '0.8rem' }}>
              <th style={{ padding: '10px' }}>EMP. NO.</th>
              <th style={{ padding: '10px' }}>NAME</th>
              <th style={{ padding: '10px' }}>DEPARTMENT</th>
              <th style={{ padding: '10px' }}>JOINING DATE</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>TENURE (MOS)</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>ELIGIBLE EL</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>EL TAKEN</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>EL ENCASHED</th>
              <th style={{ padding: '10px' }}>LEAVE NAME</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>SYSTEM BAL.</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>MAX ENC.</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>ENC. LEAVES</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>AMT. PER DAY</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>ENC. AMOUNT</th>
              <th style={{ padding: '10px' }}>MESSAGE</th>
              <th style={{ padding: '10px' }}>SALARY STATUS</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={17} style={{ textAlign: 'center', padding: '2rem' }}>Loading records...</td></tr>
            ) : filteredEmployees.length === 0 ? (
              <tr><td colSpan={17} style={{ textAlign: 'center', padding: '2rem' }}>No records found.</td></tr>
            ) : filteredEmployees.map((row, idx) => {
              const edit = edits[row.id] || { leaveType: 'Earned Leave', encashedDays: '', amountPerDay: '0', message: '' };
              const encDays = parseFloat(edit.encashedDays) || 0;
              const encAmount = ((Number(row.grossSalary) || 0) * encDays / 26).toFixed(2);
              const allMonthEncashments = (row.leaveEncashments || []).filter(encashment => encashment.asOnDate === asOnDate);
              const monthEncashments = allMonthEncashments.filter(encashment => !encashment.cancelledAt);
              const wasCancelled = allMonthEncashments.some(encashment => encashment.cancelledAt);
              const includedInPayroll = monthEncashments.some(encashment => encashment.payCycleId);
              const processedInPayroll = monthEncashments.some(encashment => encashment.isProcessed);
              
              let balance = 0;
              let maxInput = 0;
              if (edit.leaveType === 'Earned Leave') {
                balance = row.leaveBalance?.earnedLeaves || 0;
                maxInput = row.maxEncashable || 0;
              }
              else if (edit.leaveType === 'Casual Leave') {
                balance = row.leaveBalance?.casualLeaves || 0;
                maxInput = balance;
              }
              else if (edit.leaveType === 'Leave Without Pay') {
                balance = row.leaveBalance?.leaveWithoutPay || 0;
                maxInput = balance;
              }
              else if (edit.leaveType === 'Compensatory Leave') {
                balance = row.leaveBalance?.compensatoryLeaves || 0;
                maxInput = balance;
              }
              
              const isNotEligible = row.monthsSinceJoining < 10;
              
              return (
                <tr key={row.id} style={{ background: isNotEligible ? '#fff1f2' : (idx % 2 === 0 ? 'white' : '#f8fafc'), borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', opacity: isNotEligible ? 0.85 : 1 }}>
                  <td style={{ padding: '8px', color: isNotEligible ? '#e11d48' : '#0f172a', fontWeight: 600 }}>
                    {row.empId}
                  </td>
                  <td style={{ padding: '8px' }}>{row.name}</td>
                  <td style={{ padding: '8px' }}>{row.department || '-'}</td>
                  <td style={{ padding: '8px' }}>{row.joinedDate ? new Date(row.joinedDate).toLocaleDateString('en-GB') : '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: isNotEligible ? '#e11d48' : 'inherit', fontWeight: isNotEligible ? 600 : 400 }}>{row.monthsSinceJoining}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{row.earnedLeaveQuota}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{row.earnedLeavesTaken}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{row.earnedLeavesEncashed}</td>
                  <td style={{ padding: '8px', fontWeight: 600 }}>
                    Earned Leave
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{balance}</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: '#0ea5e9' }}>{maxInput}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <input 
                      type="number" 
                      min="0"
                      max={maxInput}
                      style={{ width: '80px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right' }}
                      value={edit.encashedDays}
                      onChange={e => {
                        let val = e.target.value;
                        if (parseFloat(val) > maxInput) val = maxInput.toString();
                        handleEditChange(row.id, 'encashedDays', val);
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <input 
                      type="number" 
                      step="0.01"
                      readOnly
                      title="Gross salary divided by 26 working days"
                      style={{ width: '100px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right', background: '#f8fafc', color: '#475569' }}
                      value={edit.amountPerDay}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>₹{encAmount}</td>
                  <td style={{ padding: '8px' }}>
                     <input 
                      type="text" 
                      style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      value={edit.message}
                      onChange={e => handleEditChange(row.id, 'message', e.target.value)}
                      placeholder="Optional"
                    />
                  </td>
                  <td style={{ padding: '8px', whiteSpace: 'nowrap', color: processedInPayroll ? '#15803d' : includedInPayroll ? '#0369a1' : '#64748b' }}>
                    {processedInPayroll ? 'Salary posted' : includedInPayroll ? 'In salary calculation' : monthEncashments.length ? 'Ready for calculation' : wasCancelled ? 'Cancelled — ready to encash' : '-'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleSaveEmployee(row)}
                      disabled={saving || encDays <= 0 || encDays > maxInput || processedInPayroll || includedInPayroll}
                      title={maxInput > 0 ? `Encash up to ${maxInput} available EL day(s)` : 'No earned leave is currently available to encash'}
                      style={{
                        padding: '6px 10px',
                        border: 'none',
                        borderRadius: '4px',
                        background: '#0ea5e9',
                        color: 'white',
                        cursor: saving || encDays <= 0 || encDays > maxInput || processedInPayroll || includedInPayroll ? 'not-allowed' : 'pointer',
                        opacity: saving || encDays <= 0 || encDays > maxInput || processedInPayroll || includedInPayroll ? 0.5 : 1,
                      }}
                    >
                      Encash
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
