'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Info, Download, Search, Calendar, Users, ArrowLeft, Clock, CheckCircle, XCircle, MapPin } from 'lucide-react';
import '../attendance.css';

export default function TeamAttendanceRecords() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Detail view states
  const [detailRecords, setDetailRecords] = useState([]);
  const [detailFiltered, setDetailFiltered] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState('');
  const [detailStatus, setDetailStatus] = useState('All');

  const todayStr = new Date().toISOString().split('T')[0];
  const monthAgoStr = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(monthAgoStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Summary stats per employee
  const [empStats, setEmpStats] = useState({});
  const [todayPunchLocations, setTodayPunchLocations] = useState({});
  // Map of date -> { lat, lng } for punch IN locations
  const [punchLocations, setPunchLocations] = useState({});

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees');
      const emps = await res.json();
      setEmployees(Array.isArray(emps) ? emps : []);

      // Load today attendance for quick status
      const [attRes, requestsRes] = await Promise.all([
        fetch(`/api/attendance?date=${todayStr}`),
        fetch(`/api/requests?startDate=${todayStr}&endDate=${todayStr}`)
      ]);
      const [todayAtt, todayRequests] = await Promise.all([attRes.json(), requestsRes.json()]);
      const locationMap = {};
      if (Array.isArray(todayRequests)) {
        todayRequests.forEach(punch => {
          if ((punch.type === 'IN' || punch.type === 'REGULARIZE') && !locationMap[punch.employeeId]) {
            locationMap[punch.employeeId] = {
              lat: punch.latitude != null ? Number(punch.latitude) : null,
              lng: punch.longitude != null ? Number(punch.longitude) : null,
              siteOffice: punch.employee?.siteOffice || ''
            };
          }
        });
      }
      setTodayPunchLocations(locationMap);
      const statsMap = {};
      if (Array.isArray(todayAtt)) {
        todayAtt.forEach(a => {
          statsMap[a.employee?.id || a.employeeId] = {
            status: a.status || 'Not Marked',
            timeIn: '-', timeOut: '-'
          };
          if (a.timeSlots) {
            try {
              const slots = JSON.parse(a.timeSlots);
              if (slots.length > 0) {
                statsMap[a.employee?.id || a.employeeId].timeIn = slots[0]?.in || '-';
                statsMap[a.employee?.id || a.employeeId].timeOut = slots[slots.length-1]?.out || '-';
              }
            } catch(e) {}
          }
        });
      }
      setEmpStats(statsMap);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openEmployeeDetail = async (emp) => {
    setSelectedEmployee(emp);
    setDetailLoading(true);
    setDetailRecords([]);
    setDetailFiltered([]);
    setPunchLocations({});
    try {
      const [statsRes, punchRes, holidayRes] = await Promise.all([
        fetch(`/api/attendance/stats?employeeId=${emp.id}`),
        fetch(`/api/requests?employeeId=${emp.id}&startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/leaves/holidays`)
      ]);
      const stats = await statsRes.json();
      const punches = await punchRes.json();
      const holidays = await holidayRes.json();

      const holMap = {};
      if (Array.isArray(holidays)) {
        holidays.forEach(h => { holMap[h.date] = h.name; });
      }

      // Show saved punch locations, including pending punches awaiting review.
      const locMap = {};
      if (Array.isArray(punches)) {
        punches.forEach(p => {
          if ((p.type === 'IN' || p.type === 'REGULARIZE') && !locMap[p.date]) {
            locMap[p.date] = {
              lat: p.latitude != null ? Number(p.latitude) : null,
              lng: p.longitude != null ? Number(p.longitude) : null,
              siteOffice: p.employee?.siteOffice || ''
            };
          }
        });
      }
      setPunchLocations(locMap);
      const dbMap = {};
      if (Array.isArray(stats)) {
        stats.forEach(month => {
          (month.details || []).forEach(d => { dbMap[d.date] = d; });
        });
      }
      const allRecs = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      const todayStr = new Date().toISOString().split('T')[0];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
        const rec = dbMap[dateStr];
        let timeIn = '-', timeOut = '-', workedHours = '-';
        
        let attStatus = 'Absent';
        if (rec) {
          attStatus = rec.status;
          if ((attStatus === 'Present' || attStatus === 'Late' || attStatus === 'PRESENT') && (holMap[dateStr] || dayName === 'Sun')) {
            attStatus = 'COff';
          }
        } else if (holMap[dateStr]) {
          attStatus = 'Holiday';
        } else if (dayName === 'Sun') {
          attStatus = 'Week Off';
        } else if (dateStr > todayStr) {
          attStatus = '-';
        }

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
      setDetailRecords(allRecs);
      setDetailFiltered(allRecs);
    } catch(e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  useEffect(() => {
    let f = [...detailRecords];
    if (detailStatus !== 'All') f = f.filter(r => r.attStatus === detailStatus);
    if (detailSearch.trim()) {
      const lq = detailSearch.toLowerCase();
      f = f.filter(r => r.date.includes(lq) || r.attStatus.toLowerCase().includes(lq));
    }
    setDetailFiltered(f);
  }, [detailStatus, detailSearch, detailRecords]);

  const handleDetailView = () => { if (selectedEmployee) openEmployeeDetail(selectedEmployee); };

  const renderStatus = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'half day' || s === 'hd') return <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#dbeafe', color: '#2563eb', fontSize: '11px', fontWeight: 700 }}>HD</span>;
    if (s === 'present') return <span className="badge badge-success">{status}</span>;
    if (s === 'late') return <span className="badge badge-warning">{status}</span>;
    if (s === 'absent') return <span className="badge badge-danger">{status}</span>;
    if (s === 'coff') return <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#166534', color: 'white', fontSize: '11px', fontWeight: 700 }}>{status}</span>;
    if (s === 'holiday') return <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', fontSize: '11px', fontWeight: 700 }}>{status}</span>;
    if (s === 'week off') return <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#f3f4f6', color: '#4b5563', fontSize: '11px', fontWeight: 700 }}>{status}</span>;
    if (s === '-') return <span style={{ color: '#9ca3af' }}>-</span>;
    return <span className="badge badge-secondary">{status}</span>;
  };

  const getStatusDot = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'present' || s === 'late') return '#22c55e';
    if (s === 'absent') return '#ef4444';
    return '#9ca3af';
  };

  const handleExport = () => {
    if (!selectedEmployee) return;
    const headers = ['Date', 'Day', 'Time In', 'Time Out', 'Worked Hours', 'Shift', 'Status'];
    const rows = detailFiltered.map(r => [r.date, r.dayName, r.timeIn, r.timeOut, r.workedHours, r.shiftType, r.attStatus]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance_${selectedEmployee.name}_${startDate}_${endDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(search.toLowerCase()) ||
    emp.empId?.toLowerCase().includes(search.toLowerCase()) ||
    emp.department?.toLowerCase().includes(search.toLowerCase())
  );

  const presentCount = detailFiltered.filter(r => r.attStatus === 'Present').length;
  const lateCount = detailFiltered.filter(r => r.attStatus === 'Late').length;
  const absentCount = detailFiltered.filter(r => r.attStatus === 'Absent').length;

  // ======== DETAIL VIEW ========
  if (selectedEmployee) {
    return (
      <div className="pageContainer">
        <button className="backLink" onClick={() => setSelectedEmployee(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#0ea5e9', fontWeight: 600, marginBottom: 8 }}>
          <ArrowLeft size={16} /> Back to Team
        </button>
        <Link href="/dashboard" className="backLink"><ChevronLeft size={16} /> Back to Dashboard</Link>
        <h1 className="pageTitle">Attendance Records</h1>
        <div className="tabsContainer">
          <Link href="/dashboard/attendance/my-records" className="tab">My Attendance Records</Link>
          <Link href="/dashboard/attendance/team-records" className="tab active">Team Attendance Records</Link>
        </div>

        {/* Employee Info Banner */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.2rem 1.5rem', marginBottom: '1rem', background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)', color: '#fff' }}>
          {selectedEmployee.photoUrl ? (
            <>
              <img src={selectedEmployee.photoUrl} alt="avatar" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'none', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 700 }}>
                {selectedEmployee.name?.charAt(0).toUpperCase()}
              </div>
            </>
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 700 }}>
              {selectedEmployee.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedEmployee.name}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>{selectedEmployee.empId || selectedEmployee.id} &nbsp;|&nbsp; {selectedEmployee.department} &nbsp;|&nbsp; {selectedEmployee.designation || 'Employee'}</div>
          </div>
        </div>

        {/* Date Filters */}
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
              <label className="filterLabel">Status</label>
              <select className="filterInput" value={detailStatus} onChange={e => setDetailStatus(e.target.value)}>
                <option value="All">All</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>
          <div className="filterActions">
            <button className="btn btnPrimary" onClick={handleDetailView}><Calendar size={14} style={{marginRight:4}}/> View</button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          {[{label:'PRESENT',value:presentCount,color:'#22c55e'},{label:'LATE',value:lateCount,color:'#f59e0b'},{label:'ABSENT',value:absentCount,color:'#ef4444'},{label:'TOTAL DAYS',value:detailFiltered.length,color:'#0ea5e9'}].map(({label,value,color}) => (
            <div key={label} className="card" style={{flex:1,textAlign:'center',padding:'1rem'}}>
              <div style={{fontSize:'1.8rem',fontWeight:700,color}}>{value}</div>
              <div style={{fontSize:'0.75rem',color:'#6b7280',marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Detail Table */}
        <div className="card">
          <div className="tableHeaderRow">
            <div>
              <div className="tableTitleArea"><h2 className="tableTitle">{selectedEmployee.name} — Attendance</h2><Info size={16} className="infoIcon"/></div>
              <p className="tableSubtitle">{startDate} to {endDate}</p>
            </div>
            <div className="actionButtons">
              <button className="btnOutline" onClick={handleExport}><Download size={14}/> Export CSV</button>
            </div>
          </div>
          <div className="tableControls">
            <div className="searchControl" style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}>
              <Search size={14}/>
              <input type="text" className="searchInput" placeholder="Search..." value={detailSearch} onChange={e=>setDetailSearch(e.target.value)}/>
            </div>
          </div>
          <div style={{overflowX:'auto'}}>
            <table className="dataTable">
              <thead>
                <tr>
                  <th>DATE</th><th>DAY</th><th>EMP CODE</th><th>TIME IN</th>
                  <th>TIME OUT</th><th>WORKED HOURS</th><th>SHIFT</th><th>STATUS</th><th>LOCATION</th>
                </tr>
              </thead>
              <tbody>
                {detailLoading ? (
                  <tr><td colSpan="9" style={{textAlign:'center',padding:'2rem'}}>Loading...</td></tr>
                ) : detailFiltered.length === 0 ? (
                  <tr><td colSpan="9" style={{textAlign:'center',padding:'2rem'}}>No records found</td></tr>
                ) : detailFiltered.map((r,i) => (
                  <tr key={i} style={r.dayName === 'Sun' ? { backgroundColor: '#fee2e2' } : {}}>
                    <td>{r.date}</td>
                    <td style={{color: r.dayName === 'Sun' ? '#dc2626' : '#6b7280', fontWeight: r.dayName === 'Sun' ? 600 : 'normal'}}>{r.dayName}</td>
                    <td>{selectedEmployee.empId || '-'}</td>
                    <td style={{color:r.timeIn!=='-'?'#22c55e':'#9ca3af'}}>{r.timeIn}</td>
                    <td style={{color:r.timeOut!=='-'?'#ef4444':'#9ca3af'}}>{r.timeOut}</td>
                    <td style={{fontWeight:600}}>{r.workedHours}</td>
                    <td>
                      {(() => {
                        const isNightTime = (t) => t ? (t > '19:00' || t <= '08:00') : false;
                        let hasDay = false;
                        let hasNight = false;
                        // For team-records and my-records, r.timeSlots might be a string or undefined
                        let slots = [];
                        try {
                          if (r.timeSlots) {
                            slots = typeof r.timeSlots === 'string' ? JSON.parse(r.timeSlots) : r.timeSlots;
                          }
                        } catch(e) {}

                        if (slots && slots.length > 0) {
                          slots.forEach(s => {
                            if (isNightTime(s.in)) hasNight = true;
                            else hasDay = true;
                          });
                        } else {
                          if (r.shiftType === 'Night') hasNight = true;
                          else if (r.shiftType === 'Day') hasDay = true;
                        }

                        if (hasDay && hasNight) {
                          return (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 600, fontSize: '0.85rem' }}>Day</span>
                              <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: '#f3e8ff', color: '#6b21a8', fontWeight: 600, fontSize: '0.85rem' }}>Night</span>
                            </div>
                          );
                        } else if (hasNight) {
                          return <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: '#f3e8ff', color: '#6b21a8', fontWeight: 600, fontSize: '0.85rem' }}>Night</span>;
                        } else if (hasDay) {
                          return <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 600, fontSize: '0.85rem' }}>Day</span>;
                        }
                        return <span style={{ color: '#9ca3af' }}>{r.shiftType || '-'}</span>;
                      })()}
                    </td>
                    <td>{renderStatus(r.attStatus)}</td>
                    <td>
                      {punchLocations[r.date] && (punchLocations[r.date].lat != null && punchLocations[r.date].lng != null || punchLocations[r.date].siteOffice) ? (
                        <a
                          href={punchLocations[r.date].lat != null && punchLocations[r.date].lng != null
                            ? `https://www.openstreetmap.org/?mlat=${punchLocations[r.date].lat}&mlon=${punchLocations[r.date].lng}#map=17/${punchLocations[r.date].lat}/${punchLocations[r.date].lng}`
                            : `https://maps.google.com/?q=${encodeURIComponent(punchLocations[r.date].siteOffice)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={punchLocations[r.date].lat != null && punchLocations[r.date].lng != null ? `${punchLocations[r.date].lat.toFixed(5)}, ${punchLocations[r.date].lng.toFixed(5)}` : `Site office: ${punchLocations[r.date].siteOffice}`}
                          style={{display:'inline-flex',alignItems:'center',gap:4,color:'#0ea5e9',fontWeight:600,fontSize:'0.8rem',textDecoration:'none'}}
                        >
                          <MapPin size={13}/> {punchLocations[r.date].siteOffice && !(punchLocations[r.date].lat != null && punchLocations[r.date].lng != null) ? punchLocations[r.date].siteOffice : 'View'}
                        </a>
                      ) : <span style={{color:'#d1d5db'}}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!detailLoading && <div style={{padding:'0.75rem 1rem',fontSize:'0.85rem',color:'#6b7280'}}>Showing {detailFiltered.length} records</div>}
        </div>
      </div>
    );
  }

  // ======== EMPLOYEE LIST VIEW ========
  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink"><ChevronLeft size={16} /> Back to Dashboard</Link>
      <h1 className="pageTitle">Attendance Records</h1>
      <div className="tabsContainer">
        <Link href="/dashboard/attendance/my-records" className="tab">My Attendance Records</Link>
        <Link href="/dashboard/attendance/team-records" className="tab active">Team Attendance Records</Link>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea"><h2 className="tableTitle">Team Attendance Records</h2><Info size={16} className="infoIcon"/></div>
            <p className="tableSubtitle">Click on an employee to view their detailed attendance records.</p>
          </div>
          <div className="actionButtons">
            <div style={{display:'flex',alignItems:'center',gap:6, border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 12px'}}>
              <Search size={14} color="#9ca3af"/>
              <input type="text" style={{border:'none',outline:'none',fontSize:'0.875rem',width:180}} placeholder="Search employee..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
          </div>
        </div>

        <div style={{overflowX:'auto'}}>
          <table className="dataTable">
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>EMP CODE</th>
                <th>DEPARTMENT</th>
                <th>DESIGNATION</th>
                <th>TODAY STATUS</th>
                <th>TIME IN</th>
                <th>TIME OUT</th>
                <th>LOCATION</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{textAlign:'center',padding:'3rem'}}>Loading employees...</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan="9" style={{textAlign:'center',padding:'3rem'}}>No employees found</td></tr>
              ) : filteredEmployees.map((emp, i) => {
                const stat = empStats[emp.id] || { status: 'Not Marked', timeIn: '-', timeOut: '-' };
                return (
                  <tr key={i} style={{cursor:'pointer'}} onClick={() => openEmployeeDetail(emp)}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        {emp.photoUrl ? (
                          <>
                            <img src={emp.photoUrl} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',display:'none',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:'0.9rem',flexShrink:0}}>
                              {emp.name?.charAt(0).toUpperCase()}
                            </div>
                          </>
                        ) : (
                          <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:'0.9rem',flexShrink:0}}>
                            {emp.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{fontWeight:600,color:'#111827'}}>{emp.name}</div>
                          <div style={{fontSize:'0.75rem',color:'#9ca3af'}}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{emp.empId || '-'}</td>
                    <td>{emp.department || '-'}</td>
                    <td>{emp.designation || '-'}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:getStatusDot(stat.status)}}></div>
                        {renderStatus(stat.status)}
                      </div>
                    </td>
                    <td style={{color:stat.timeIn!=='-'?'#22c55e':'#9ca3af'}}>{stat.timeIn}</td>
                    <td style={{color:stat.timeOut!=='-'?'#ef4444':'#9ca3af'}}>{stat.timeOut}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {todayPunchLocations[emp.id] && (todayPunchLocations[emp.id].lat != null && todayPunchLocations[emp.id].lng != null || todayPunchLocations[emp.id].siteOffice) ? (
                        <a href={todayPunchLocations[emp.id].lat != null && todayPunchLocations[emp.id].lng != null
                          ? `https://www.openstreetmap.org/?mlat=${todayPunchLocations[emp.id].lat}&mlon=${todayPunchLocations[emp.id].lng}#map=17/${todayPunchLocations[emp.id].lat}/${todayPunchLocations[emp.id].lng}`
                          : `https://maps.google.com/?q=${encodeURIComponent(todayPunchLocations[emp.id].siteOffice)}`} target="_blank" rel="noopener noreferrer" title={todayPunchLocations[emp.id].lat != null && todayPunchLocations[emp.id].lng != null ? `${todayPunchLocations[emp.id].lat.toFixed(5)}, ${todayPunchLocations[emp.id].lng.toFixed(5)}` : `Site office: ${todayPunchLocations[emp.id].siteOffice}`} style={{display:'inline-flex',alignItems:'center',gap:4,color:'#2563eb',fontWeight:600,textDecoration:'none'}}>
                          <MapPin size={14}/> {todayPunchLocations[emp.id].lat != null && todayPunchLocations[emp.id].lng != null ? 'Map View' : todayPunchLocations[emp.id].siteOffice}
                        </a>
                      ) : <span style={{color:'#9ca3af'}}>—</span>}
                    </td>
                    <td>
                      <button
                        className="btn btnPrimary"
                        style={{padding:'4px 12px',fontSize:'0.8rem'}}
                        onClick={e => { e.stopPropagation(); openEmployeeDetail(emp); }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div style={{padding:'0.75rem 1rem',fontSize:'0.85rem',color:'#6b7280'}}>
            {filteredEmployees.length} employees
          </div>
        )}
      </div>
    </div>
  );
}
