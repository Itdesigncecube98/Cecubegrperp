'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';

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

function dayLabel(dateObj) {
  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  return days[dateObj.getDay()];
}

function parseTimeSlots(ts) {
  try { return ts ? JSON.parse(ts) : []; } catch { return []; }
}

function calcDuration(slots) {
  let total = 0;
  for (const s of slots) {
    if (s.in && s.out) {
      const [ih, im] = s.in.split(':').map(Number);
      const [oh, om] = s.out.split(':').map(Number);
      total += (oh * 60 + om) - (ih * 60 + im);
    }
  }
  return total; // minutes
}

function toHHMM(minutes) {
  if (!minutes || minutes <= 0) return '00:00';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

export default function AttendanceGridPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Date range - default current week
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 10);

  const [startDate, setStartDate] = useState(fmt(monday));
  const [endDate, setEndDate] = useState(fmt(sunday));

  const days = getDaysInRange(startDate, endDate);

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const empRes = await fetch('/api/employees');
      const emps = await empRes.json();
      setEmployees(emps);

      // Fetch attendance for each day in range
      const map = {};
      await Promise.all(days.map(async (d) => {
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

    return {
      status: rec.status,
      inTime: firstIn,
      outTime: lastOut,
    };
  };

  const statusAbbr = (status) => {
    if (!status) return '';
    if (status === 'Present') return 'P';
    if (status === 'Absent') return 'A';
    if (status === 'Late') return 'L';
    return status === 'Weekly Off' ? 'WO' : status.substring(0, 2).toUpperCase();
  };

  const statusColor = (s) => {
    if (s === 'Present') return '#374151'; // standard dark gray as per image
    if (s === 'Absent') return '#374151'; 
    if (s === 'Late') return '#374151';
    if (s === 'Weekly Off' || s === 'WO') return '#374151';
    return '#374151';
  };

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#f4f6f8', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'white', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/dashboard/attendance')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
          ← Back to Attendance
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Attendance Report</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500 }}>From:</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500 }}>To:</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
          </div>
          <button onClick={fetchData} style={{ padding: '7px 18px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>View</button>
          <button style={{ padding: '7px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>Loading attendance data...</div>
        ) : (
          <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e5e7eb', overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: '100%', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '90px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '130px' }} />
                <col style={{ width: '140px' }} />
                {days.map((_, i) => <col key={i} style={{ width: '70px' }} />)}
              </colgroup>
              <thead>
                <tr style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={thSt}>EMPLOYEE<br/>CODE</th>
                  <th style={thSt}>BRANCH</th>
                  <th style={thSt}>DESIGNATION</th>
                  <th style={thSt}>EMPLOYEE<br/>NAME</th>
                  {days.map(d => {
                    const dStr = fmt(d);
                    const yearPart = dStr.substring(0, 5); // "2026-"
                    const mdPart = dStr.substring(5);      // "07-01"
                    return (
                      <th key={dStr} style={{ ...thSt, textAlign: 'center', fontSize: '10px', lineHeight: '1.4' }}>
                        <div>{yearPart}</div>
                        <div>{mdPart}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, empIdx) => {
                  return (
                    <tr key={emp.id} style={{ background: '#ffffff', borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tdSt}>
                        <span style={{ fontWeight: 600 }}>{emp.empId || '—'}</span>
                      </td>
                      <td style={tdSt}>
                        <span>{emp.branch || 'DEFAULT'}</span>
                      </td>
                      <td style={tdSt}>
                        <span>{emp.designation || 'EMPLOYEE'}</span>
                      </td>
                      <td style={{ ...tdSt, fontWeight: 600 }}>
                        <span style={{ cursor: 'pointer', color: '#374151' }} onClick={() => router.push(`/dashboard/employees/${emp.id}`)}>
                          {emp.name.split(' ').map((n, i) => <div key={i}>{n}</div>)}
                        </span>
                      </td>
                      {days.map(d => {
                        const data = getCellData(emp.id, fmt(d));
                        if (!data) {
                          return <td key={fmt(d)} style={{ ...tdSt, textAlign: 'center' }}></td>;
                        }
                        
                        // If there are punches, show them stacked
                        if (data.inTime || data.outTime) {
                          return (
                            <td key={fmt(d)} style={{ ...tdSt, textAlign: 'center', padding: '4px' }}>
                              {data.inTime && <div style={{ lineHeight: '1.2' }}>{data.inTime}</div>}
                              {data.outTime && <div style={{ lineHeight: '1.2' }}>{data.outTime}</div>}
                            </td>
                          );
                        }

                        // Otherwise show Status abbreviation
                        const abbr = statusAbbr(data.status);
                        return (
                          <td key={fmt(d)} style={{ ...tdSt, textAlign: 'center' }}>
                            <span style={{ fontWeight: 600, color: statusColor(data.status) }}>
                              {abbr || ''}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={4 + days.length} style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
                      No employee data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const thSt = { padding: '12px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', verticalAlign: 'middle', borderRight: '1px solid #f3f4f6' };
const tdSt = { padding: '10px', verticalAlign: 'middle', fontSize: '11px', color: '#374151', borderRight: '1px solid #f3f4f6' };
