'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Info, Download, Search, Calendar } from 'lucide-react';
import '../attendance.css';

export default function MyAttendanceRecords() {
  const [employee, setEmployee] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const todayStr = new Date().toISOString().split('T')[0];
  const monthAgoStr = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(monthAgoStr);
  const [endDate, setEndDate] = useState(todayStr);

  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    const adminData = sessionStorage.getItem('adminData');
    if (empData) {
      const parsed = JSON.parse(empData);
      setEmployee(parsed);
      fetchRecords(parsed.id, monthAgoStr, todayStr);
    } else if (adminData) {
      setIsAdmin(true);
      fetch('/api/employees')
        .then(r => r.json())
        .then(emps => {
          if (emps && emps.length > 0) {
            setAllEmployees(emps);
            setEmployee(emps[0]);
            fetchRecords(emps[0].id, monthAgoStr, todayStr);
          } else { setLoading(false); }
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleEmployeeChange = (empId) => {
    const emp = allEmployees.find(e => e.id === empId);
    if (emp) { setEmployee(emp); fetchRecords(emp.id, startDate, endDate); }
  };

  const fetchRecords = async (id, from, to) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/stats?employeeId=${id}`);
      const stats = await res.json();
      const dbMap = {};
      if (Array.isArray(stats)) {
        stats.forEach(month => {
          (month.details || []).forEach(d => { dbMap[d.date] = d; });
        });
      }
      const allRecs = [];
      const start = new Date(from);
      const end = new Date(to);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
        const rec = dbMap[dateStr];
        let timeIn = '-', timeOut = '-', workedHours = '-';
        let attStatus = rec ? rec.status : 'Not Marked';
        let shiftType = rec ? (rec.shiftType || 'Day') : '-';
        if (rec && rec.timeSlots && rec.timeSlots.length > 0) {
          const slots = rec.timeSlots;
          timeIn = slots[0]?.in || '-';
          timeOut = slots[slots.length - 1]?.out || '-';
          let totalMins = 0;
          slots.forEach(slot => {
            if (slot.in && slot.out) {
              const [inH, inM] = slot.in.split(':').map(Number);
              const [outH, outM] = slot.out.split(':').map(Number);
              totalMins += (outH * 60 + outM) - (inH * 60 + inM);
            }
          });
          workedHours = totalMins > 0 ? `${Math.floor(totalMins/60)}h ${totalMins%60}m` : '0h 0m';
        }
        allRecs.push({ date: dateStr, dayName, timeIn, timeOut, workedHours, shiftType, attStatus });
      }
      allRecs.sort((a, b) => b.date.localeCompare(a.date));
      setRecords(allRecs);
      applyFilters(allRecs, statusFilter, search);
    } catch (e) {
      console.error(e);
      setRecords([]); setFiltered([]);
    } finally { setLoading(false); }
  };

  const applyFilters = (recs, status, q) => {
    let f = [...recs];
    if (status !== 'All') f = f.filter(r => r.attStatus === status);
    if (q.trim()) {
      const lq = q.toLowerCase();
      f = f.filter(r => r.date.includes(lq) || r.attStatus.toLowerCase().includes(lq));
    }
    setFiltered(f);
  };

  const handleView = () => { if (employee) fetchRecords(employee.id, startDate, endDate); };
  const handleClear = () => {
    setStartDate(monthAgoStr); setEndDate(todayStr);
    setStatusFilter('All'); setSearch('');
    if (employee) fetchRecords(employee.id, monthAgoStr, todayStr);
  };

  useEffect(() => { applyFilters(records, statusFilter, search); }, [statusFilter, search]);

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'present') return 'badge-success';
    if (s === 'late') return 'badge-warning';
    if (s === 'absent') return 'badge-danger';
    if (s === 'not marked') return 'badge-secondary';
    return 'badge-secondary';
  };

  const handleExport = () => {
    const headers = ['Date', 'Day', 'Time In', 'Time Out', 'Worked Hours', 'Shift', 'Status'];
    const rows = filtered.map(r => [r.date, r.dayName, r.timeIn, r.timeOut, r.workedHours, r.shiftType, r.attStatus]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance_${startDate}_${endDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const presentCount = filtered.filter(r => r.attStatus === 'Present').length;
  const absentCount = filtered.filter(r => r.attStatus === 'Absent').length;

  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink"><ChevronLeft size={16} /> Back to Dashboard</Link>
      <h1 className="pageTitle">Attendance Records</h1>
      <div className="tabsContainer">
        <Link href="/dashboard/attendance/my-records" className="tab active">My Attendance Records</Link>
        <Link href="/dashboard/attendance/team-records" className="tab">Team Attendance Records</Link>
      </div>

      <div className="card">
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Start Date</label>
            <input type="date" className="filterInput" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">End Date</label>
            <input type="date" className="filterInput" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Attendance Status</label>
            <select className="filterInput" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Not Marked">Not Marked</option>
            </select>
          </div>
        </div>
        <div className="filterActions">
          <button className="btn btnPrimary" onClick={handleView}><Calendar size={14} style={{marginRight:4}}/> View</button>
          <button className="btn btnPrimary" onClick={handleClear}>Clear</button>
        </div>
      </div>

      {/* Employee selector for admin */}
      {isAdmin && allEmployees.length > 0 && (
        <div className="card" style={{ padding: '1rem', marginBottom: '0.5rem' }}>
          <label className="filterLabel" style={{ marginBottom: 6, display: 'block' }}>Select Employee</label>
          <select
            className="filterInput"
            value={employee?.id || ''}
            onChange={e => handleEmployeeChange(e.target.value)}
            style={{ maxWidth: 320 }}
          >
            {allEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.empId || emp.id})</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        {[{label:'PRESENT',value:presentCount,color:'#22c55e'},{label:'ABSENT',value:absentCount,color:'#ef4444'},{label:'TOTAL DAYS',value:filtered.length,color:'#6366f1'}].map(({label,value,color}) => (
          <div key={label} className="card" style={{flex:1,textAlign:'center',padding:'1rem'}}>
            <div style={{fontSize:'1.8rem',fontWeight:700,color}}>{value}</div>
            <div style={{fontSize:'0.75rem',color:'#6b7280',marginTop:2}}>{label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea"><h2 className="tableTitle">My Attendance Records</h2><Info size={16} className="infoIcon"/></div>
            <p className="tableSubtitle">{employee?.name} &nbsp;|&nbsp; {startDate} to {endDate}</p>
          </div>
          <div className="actionButtons">
            <button className="btnOutline" onClick={handleExport}><Download size={14}/> Export CSV</button>
          </div>
        </div>
        <div className="tableControls">
          <div className="searchControl" style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}>
            <Search size={14}/>
            <input type="text" className="searchInput" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table className="dataTable">
            <thead>
              <tr>
                <th>DATE</th><th>DAY</th><th>EMP CODE</th><th>NAME</th>
                <th>TIME IN</th><th>TIME OUT</th><th>WORKED HOURS</th><th>SHIFT</th><th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{textAlign:'center',padding:'2rem'}}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="9" style={{textAlign:'center',padding:'2rem'}}>No records found</td></tr>
              ) : filtered.map((r,i) => (
                <tr key={i}>
                  <td>{r.date}</td>
                  <td style={{color:'#6b7280'}}>{r.dayName}</td>
                  <td>{employee?.empId || '-'}</td>
                  <td>{employee?.name || '-'}</td>
                  <td style={{color:r.timeIn!=='-'?'#22c55e':'#9ca3af'}}>{r.timeIn}</td>
                  <td style={{color:r.timeOut!=='-'?'#ef4444':'#9ca3af'}}>{r.timeOut}</td>
                  <td style={{fontWeight:600}}>{r.workedHours}</td>
                  <td>{r.shiftType}</td>
                  <td><span className={`badge ${getStatusBadgeClass(r.attStatus)}`}>{r.attStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && <div style={{padding:'0.75rem 1rem',fontSize:'0.85rem',color:'#6b7280'}}>Showing {filtered.length} records</div>}
      </div>
    </div>
  );
}
