'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download, Save, RefreshCw, Search } from 'lucide-react';
import { exportToCSV } from '../../../../lib/exportUtils';
import ReportFilters, { useReportFilters } from '../../../../components/ReportFilters';
import '../../attendance/attendance.css';

function getDaysInRange(startDate, endDate) {
  const days = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function fmt(dateObj) {
  return dateObj.toISOString().split('T')[0];
}

function parseTimeSlots(ts) {
  try { return ts ? JSON.parse(ts) : []; } catch { return []; }
}

export default function AttendanceMuster() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(false);

  const filters = useReportFilters();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(fmt(firstDay));
  const [endDate, setEndDate] = useState(fmt(lastDay));
  const [showGrid, setShowGrid] = useState(false);
  const [days, setDays] = useState([]);

  // State for edits, approval mode filter, and row selection
  const [edits, setEdits] = useState({});
  const [isApprovedMode, setIsApprovedMode] = useState(false); // Filter state
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEmps, setSelectedEmps] = useState([]); // Array of selected employee IDs

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setShowGrid(true);
    setEdits({});
    setSelectedEmps([]);
    const dateRange = getDaysInRange(startDate, endDate);
    setDays(dateRange);

    try {
      const empRes = await fetch('/api/employees');
      const emps = await empRes.json();
      setEmployees(emps);

      const map = {};
      await Promise.all(dateRange.map(async (d) => {
        const dateStr = fmt(d);
        const res = await fetch(`/api/attendance?date=${dateStr}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach(rec => {
            const empId = rec.employee?.id || rec.employeeId;
            if (!map[empId]) map[empId] = {};
            map[empId][dateStr] = rec;
          });
        }
      }));
      setAttendanceMap(map);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const getCellData = (empId, date) => {
    const rec = attendanceMap[empId]?.[date];
    if (!rec) return null;
    const slots = parseTimeSlots(rec.timeSlots);
    const firstIn = slots[0]?.in || '';
    const lastOut = slots[slots.length - 1]?.out || '';
    return { status: rec.status, inTime: firstIn, outTime: lastOut, isApproved: rec.isApproved };
  };

  const getCellDataWithEdits = (empId, dateStr) => {
    const edit = edits[empId]?.[dateStr];
    if (edit) {
      return { status: edit, inTime: '', outTime: '' };
    }
    return getCellData(empId, dateStr);
  };

  const handleStatusChange = (empId, dateStr, newStatus) => {
    setEdits(prev => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || {}),
        [dateStr]: newStatus
      }
    }));
    // Auto-select row if edited
    if (!selectedEmps.includes(empId)) {
      setSelectedEmps(prev => [...prev, empId]);
    }
  };

  const handleSelectAll = (e, filteredEmployees) => {
    if (e.target.checked) {
      setSelectedEmps(filteredEmployees.map(emp => emp.id));
    } else {
      setSelectedEmps([]);
    }
  };

  const handleSelectEmployee = (empId) => {
    setSelectedEmps(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleSave = async () => {
    if (selectedEmps.length === 0) {
      alert("Please select at least one employee to save or approve.");
      return;
    }
    
    setIsSaving(true);
    const updates = [];
    
    selectedEmps.forEach(empId => {
      days.forEach(d => {
        const dStr = fmt(d);
        const data = getCellDataWithEdits(empId, dStr);
        if (data) {
          updates.push({
            employeeId: empId,
            date: dStr,
            status: data.status
          });
        }
      });
    });

    try {
      // The API now expects isApproved to be applied to all the updates we send.
      // If we are currently viewing "Not Approved" and we click save, we are approving them!
      // If we are viewing "Approved" and click save, we might be un-approving them.
      // So the target state is the OPPOSITE of the current filter view.
      const targetApprovalState = !isApprovedMode;

      const res = await fetch('/api/attendance/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, isApproved: targetApprovalState })
      });
      if (res.ok) {
        setEdits({});
        setSelectedEmps([]);
        fetchData();
        alert(`Successfully ${targetApprovalState ? 'approved' : 'unapproved'} attendance!`);
      } else {
        alert('Failed to update attendance');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving attendance');
    }
    setIsSaving(false);
  };

  const handleSaveEdits = async () => {
    if (selectedEmps.length === 0) {
      alert("Please select at least one employee to save edits.");
      return;
    }
    
    setIsSaving(true);
    const updates = [];
    
    selectedEmps.forEach(empId => {
      days.forEach(d => {
        const dStr = fmt(d);
        const data = getCellDataWithEdits(empId, dStr);
        if (data) {
          updates.push({
            employeeId: empId,
            date: dStr,
            status: data.status
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
        setEdits({});
        setSelectedEmps([]);
        fetchData();
        alert('Attendance edits saved successfully!');
      } else {
        alert('Failed to save attendance edits');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving attendance edits');
    }
    setIsSaving(false);
  };

  const statusAbbr = (status) => {
    if (!status) return 'A';
    if (status === 'Present') return 'P';
    if (status === 'Absent') return 'A';
    if (status === 'Late') return 'L';
    if (status === 'Holiday') return 'H';
    if (status === 'Weekly Off') return 'W-off';
    if (status === 'Not Marked') return 'A';
    if (['CL', 'SL', 'EL', 'LWP', 'C-off'].includes(status)) return status;
    return status.substring(0, 2).toUpperCase();
  };

  const fullStatusFromAbbr = (abbr) => {
    const map = {
      'P': 'Present',
      'A': 'Absent',
      'L': 'Late',
      'H': 'Holiday',
      'W-off': 'Weekly Off',
      'CL': 'CL',
      'SL': 'SL',
      'EL': 'EL',
      'C-off': 'COFF',
      'LWP': 'LWP'
    };
    return map[abbr] || 'Present';
  };

  const statusColor = (s) => {
    if (s === 'Present') return '#16a34a';
    if (s === 'Absent' || s === 'Not Marked' || !s) return '#dc2626';
    if (s === 'Late') return '#ea580c';
    if (s === 'Holiday') return '#f59e0b';
    if (s === 'Weekly Off') return '#4f46e5';
    if (['CL', 'SL', 'EL', 'LWP', 'COFF', 'C-off'].includes(s)) return '#0ea5e9';
    return '#374151';
  };

  const getEmployeeSummary = (empId) => {
    let p = 0, a = 0, l = 0, h = 0, w = 0;
    days.forEach(d => {
      const data = getCellDataWithEdits(empId, fmt(d));
      if (data) {
        const abbr = statusAbbr(data.status);
        if (abbr === 'P' || abbr === 'L') p++;
        else if (abbr === 'A' || abbr === 'LWP') a++;
        else if (['CL', 'SL', 'EL', 'C-off'].includes(abbr)) l++;
        else if (abbr === 'H') h++;
        else if (abbr === 'W-off') w++;
      } else {
        a++;
      }
    });
    return { p, a, l, h, w, total: days.length, wage: p + l + h + w };
  };

  const handleClear = () => {
    setStartDate(fmt(firstDay));
    setEndDate(fmt(lastDay));
    setShowGrid(false);
  };

  // Filter employees based on the ReportFilters and the Approval Filter
  const filteredEmployees = filters.applyFilters(employees).filter(emp => {
    // Check if the employee's attendance is generally approved/not approved
    // Since we don't have a month-level approval, we check if AT LEAST ONE record in the range is approved/unapproved.
    // If we are looking for "Approved", we want people who have at least one approved record.
    let isEmpApproved = false;

    days.forEach(d => {
      const rec = attendanceMap[emp.id]?.[fmt(d)];
      if (rec && rec.isApproved) {
        isEmpApproved = true;
      }
    });

    if (isApprovedMode) {
      return isEmpApproved;
    } else {
      return !isEmpApproved;
    }
  });

  return (
    <div className="pageContainer">
      <Link href="/dashboard/reports" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Attendance Muster Report</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#4b5563' }}>
            <input 
              type="radio" 
              name="approvalMode" 
              checked={!isApprovedMode} 
              onChange={() => setIsApprovedMode(false)} 
              style={{ accentColor: '#0ea5e9', transform: 'scale(1.2)' }}
            />
            Not Approved
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#4b5563' }}>
            <input 
              type="radio" 
              name="approvalMode" 
              checked={isApprovedMode} 
              onChange={() => setIsApprovedMode(true)}
              style={{ accentColor: '#0ea5e9', transform: 'scale(1.2)' }}
            />
            Approved
          </label>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn" style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#4b5563', padding: '8px 16px', borderRadius: '6px' }} onClick={fetchData}>
            <RefreshCw size={16} style={{ marginRight: '8px' }} /> Refresh
          </button>
          <button className="btn" style={{ background: '#ffffff', border: '1px solid #10b981', color: '#10b981', padding: '8px 16px', borderRadius: '6px' }} onClick={() => {
            if (filteredEmployees.length === 0) return;
            const rows = filteredEmployees.map(emp => {
              const summary = getEmployeeSummary(emp.id);
              const row = {
                'EMP CODE': emp.empId,
                'NAME': emp.name,
                'TOTAL DAYS': summary.total,
                'WAGE DAYS': summary.wage,
                'P': summary.p,
                'A': summary.a,
                'L': summary.l,
                'H': summary.h,
                'W': summary.w
              };
              days.forEach(d => {
                const dateStr = fmt(d);
                const cellData = getCellDataWithEdits(emp.id, dateStr);
                row[dateStr] = cellData ? statusAbbr(cellData.status) : 'A';
              });
              return row;
            });
            exportToCSV('attendance-muster.csv', rows);
          }}>
            <Download size={16} style={{ marginRight: '8px' }} /> Export Excel
          </button>
          <button className="btn btnPrimary" style={{ background: '#0ea5e9', padding: '8px 20px', borderRadius: '6px' }} onClick={fetchData}>
            <Search size={16} style={{ marginRight: '8px' }} /> Search
          </button>
        </div>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
        <button className="btn btnPrimary" style={{ background: '#0ea5e9', borderRadius: '6px', padding: '8px 24px' }} onClick={handleSaveEdits} disabled={isSaving || selectedEmps.length === 0}>
          <Save size={16} style={{ marginRight: '8px' }} />
          Save Edits
        </button>
        <button className="btn btnPrimary" style={{ background: '#10b981', borderRadius: '6px', padding: '8px 24px' }} onClick={handleSave} disabled={isSaving || selectedEmps.length === 0}>
          <Save size={16} style={{ marginRight: '8px' }} />
          {isSaving ? 'Saving...' : (isApprovedMode ? `Unapprove Selected (${selectedEmps.length})` : `Approve Selected (${selectedEmps.length})`)}
        </button>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="filtersRow">
          <ReportFilters {...filters} style={{ gridTemplateColumns: 'repeat(3,1fr)' }} />
          <div className="filterGroup">
            <label className="filterLabel">Start Date</label>
            <input type="date" className="filterInput" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">End Date</label>
            <input type="date" className="filterInput" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {showGrid && (
        <div className="card" style={{ marginTop: '20px', padding: 0, overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '20px', background: '#f8fafc' }}>
            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}>Total Count: {filteredEmployees.length}</span>
            <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 500, background: '#f1f5f9', padding: '4px 12px', borderRadius: '16px' }}>From: {startDate} To: {endDate}</span>
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>Loading attendance data...</div>
          ) : (
            <table style={{ borderCollapse: 'collapse', minWidth: '100%', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '40px' }} />
                <col style={{ width: '250px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '30px' }} />
                <col style={{ width: '30px' }} />
                <col style={{ width: '30px' }} />
                <col style={{ width: '30px' }} />
                <col style={{ width: '30px' }} />
                {days.map((_, i) => <col key={i} style={{ width: '50px' }} />)}
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ ...thSt, background: '#0ea5e9', borderRight: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      onChange={(e) => handleSelectAll(e, filteredEmployees)} 
                      checked={filteredEmployees.length > 0 && selectedEmps.length === filteredEmployees.length} 
                      style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                    />
                  </th>
                  <th rowSpan={2} style={{ ...thSt, background: '#0ea5e9', color: 'white', borderRight: '1px solid rgba(255,255,255,0.2)' }}>EMPLOYEE DETAILS</th>
                  <th rowSpan={2} style={{ ...thSt, background: '#10b981', color: 'white', borderRight: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>TOTAL DAYS</th>
                  <th rowSpan={2} style={{ ...thSt, background: '#10b981', color: 'white', borderRight: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>WAGE DAYS</th>
                  <th colSpan={5} style={{ ...thSt, background: '#8b5cf6', color: 'white', borderRight: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>SUMMARY</th>
                  <th colSpan={days.length} style={{ ...thSt, background: '#334155', color: 'white', textAlign: 'center' }}>DATE-WISE ATTENDANCE</th>
                </tr>
                <tr>
                  <th style={{ ...thSt, background: '#a78bfa', color: 'white', textAlign: 'center', padding: '4px' }}>P</th>
                  <th style={{ ...thSt, background: '#a78bfa', color: 'white', textAlign: 'center', padding: '4px' }}>A</th>
                  <th style={{ ...thSt, background: '#a78bfa', color: 'white', textAlign: 'center', padding: '4px' }}>L</th>
                  <th style={{ ...thSt, background: '#a78bfa', color: 'white', textAlign: 'center', padding: '4px' }}>H</th>
                  <th style={{ ...thSt, background: '#a78bfa', color: 'white', textAlign: 'center', padding: '4px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>W</th>
                  {days.map(d => {
                    const dStr = String(d.getDate()).padStart(2, '0');
                    return <th key={fmt(d)} style={{ ...thSt, background: '#475569', color: '#38bdf8', textAlign: 'center', padding: '6px' }}>{dStr}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const summary = getEmployeeSummary(emp.id);
                  const isChecked = selectedEmps.includes(emp.id);
                  return (
                    <tr key={emp.id} style={{ background: isChecked ? '#f0f9ff' : '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ ...tdSt, borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleSelectEmployee(emp.id)}
                          style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                        />
                      </td>
                      <td style={{ ...tdSt, borderRight: '1px solid #e5e7eb' }}>
                        <div style={{ color: '#0369a1', fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{emp.name}</div>
                        <div style={{ color: '#6b7280', fontSize: '11px' }}>{emp.empId} | {emp.designation || 'Executive'}</div>
                      </td>
                      <td style={{ ...tdSt, textAlign: 'center', color: '#16a34a', fontWeight: 600, fontSize: '13px', borderRight: '1px solid #e5e7eb' }}>
                        {summary.total}
                      </td>
                      <td style={{ ...tdSt, textAlign: 'center', color: '#16a34a', fontWeight: 600, fontSize: '13px', background: isChecked ? '#d1fae5' : '#ecfdf5', borderRight: '1px solid #e5e7eb' }}>
                        {summary.wage}
                      </td>
                      <td style={{ ...tdSt, textAlign: 'center', color: '#16a34a', fontWeight: 600, borderRight: '1px solid #e5e7eb' }}>{summary.p}</td>
                      <td style={{ ...tdSt, textAlign: 'center', color: '#dc2626', fontWeight: 600, borderRight: '1px solid #e5e7eb' }}>{summary.a}</td>
                      <td style={{ ...tdSt, textAlign: 'center', color: '#d97706', fontWeight: 600, borderRight: '1px solid #e5e7eb' }}>{summary.l}</td>
                      <td style={{ ...tdSt, textAlign: 'center', color: '#0284c7', fontWeight: 600, borderRight: '1px solid #e5e7eb' }}>{summary.h}</td>
                      <td style={{ ...tdSt, textAlign: 'center', color: '#4f46e5', fontWeight: 600, borderRight: '1px solid #e5e7eb' }}>{summary.w}</td>
                      
                      {days.map(d => {
                        const dStr = fmt(d);
                        const data = getCellDataWithEdits(emp.id, dStr);
                        const abbr = data ? statusAbbr(data.status) : '-';
                        return (
                          <td key={dStr} style={{ ...tdSt, textAlign: 'center', borderRight: '1px solid #e5e7eb', padding: '0' }}>
                            <select 
                              value={abbr} 
                              onChange={(e) => handleStatusChange(emp.id, dStr, fullStatusFromAbbr(e.target.value))}
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                border: 'none', 
                                background: 'transparent',
                                color: statusColor(data ? data.status : ''), 
                                fontWeight: 700,
                                textAlign: 'center',
                                outline: 'none',
                                cursor: 'pointer',
                                padding: '12px 0',
                                appearance: 'none',
                                WebkitAppearance: 'none'
                              }}
                            >
                              <option value="-">-</option>
                              <option value="P">P</option>
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
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={9 + days.length} style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
                      No employee data found for the selected approval status.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
      
    </div>
  );
}

const thSt = { padding: '10px 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', verticalAlign: 'middle' };
const tdSt = { padding: '8px', verticalAlign: 'middle', fontSize: '12px', color: '#374151' };
