'use client';

import React, { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import ActionToolbar from '@/components/ActionToolbar';
import MultiSelect from '@/components/MultiSelect';

export default function LeaveEncashment() {
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [asOnDate, setAsOnDate] = useState('');

  // Editable row state
  const [edits, setEdits] = useState({});

  useEffect(() => {
    const today = new Date();
    setAsOnDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    
    setLoading(true);
    fetch('/api/payroll/leave-encashment')
      .then(r => r.json())
      .then(data => {
        const empList = Array.isArray(data) ? data : [];
        setAllEmployees(empList);
        
        const initialEdits = {};
        empList.forEach(emp => {
          let amountPerDay = 0;
          if (emp.grossSalary) {
             amountPerDay = emp.grossSalary / 30;
          }

          initialEdits[emp.id] = {
             leaveType: 'Earned Leave',
             encashedDays: emp.maxEncashable > 0 ? emp.maxEncashable : '',
             amountPerDay: amountPerDay.toFixed(2),
             message: ''
          };
        });
        setEdits(initialEdits);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

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

  const handleSave = async () => {
    // Find all rows where encashedDays is provided
    const toSave = filteredEmployees.filter(emp => {
       const e = edits[emp.id];
       return e && parseFloat(e.encashedDays) > 0;
    });

    if (toSave.length === 0) {
      alert("No valid encashment days entered to save.");
      return;
    }

    setSaving(true);
    let successCount = 0;
    
    for (const emp of toSave) {
      const payload = {
        employeeId: emp.id,
        asOnDate,
        leaveType: edits[emp.id].leaveType,
        encashedDays: parseFloat(edits[emp.id].encashedDays),
        amountPerDay: parseFloat(edits[emp.id].amountPerDay),
        message: edits[emp.id].message
      };

      try {
        const res = await fetch('/api/payroll/leave-encashment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) successCount++;
      } catch (e) {
        console.error(e);
      }
    }

    alert(`Successfully processed ${successCount} encashment(s)!`);
    setSaving(false);
    // Refresh page or re-fetch data to update balances
    window.location.reload();
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
            <input type="month" value={asOnDate} onChange={e => setAsOnDate(e.target.value)} />
          </div>
        </div>
      </div>

      <ActionToolbar onSave={handleSave} shareTitle="Leave Encashment" />

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
              <th style={{ padding: '10px' }}>LEAVE NAME</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>SYSTEM BAL.</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>MAX ENC.</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>ENC. LEAVES</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>AMT. PER DAY</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>ENC. AMOUNT</th>
              <th style={{ padding: '10px' }}>MESSAGE</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>Loading records...</td></tr>
            ) : filteredEmployees.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>No records found.</td></tr>
            ) : filteredEmployees.map((row, idx) => {
              const edit = edits[row.id] || { leaveType: 'Earned Leave', encashedDays: '', amountPerDay: '0', message: '' };
              const encDays = parseFloat(edit.encashedDays) || 0;
              const amtPerDay = parseFloat(edit.amountPerDay) || 0;
              const encAmount = (encDays * amtPerDay).toFixed(2);
              
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
              
              const isNotEligible = row.monthsSinceJoining < 8;
              
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
                      style={{ width: '100px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right' }}
                      value={edit.amountPerDay}
                      onChange={e => handleEditChange(row.id, 'amountPerDay', e.target.value)}
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
