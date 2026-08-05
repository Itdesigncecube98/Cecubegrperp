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

const ROW_LABELS = [
  { key: 'status', label: null }, // main status row
  { key: 'inTime', label: 'In Time' },
  { key: 'outTime', label: 'Out Time' },
  { key: 'totalDuration', label: 'Total Duration' },
  { key: 'locationName', label: 'Location Name' },
  { key: 'checkoutLocation', label: 'Checkout Location Name' },
  { key: 'otHours', label: 'OT Hours' },
  { key: 'hotHours', label: 'HOT Hours' },
  { key: 'lcHours', label: 'LC Hours' },
  { key: 'egHours', label: 'EG Hours' },
];

export default function AttendanceGridPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedEmp, setExpandedEmp] = useState(null);

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
    const durMin = calcDuration(slots);
    const firstIn = slots[0]?.in || '';
    const lastOut = slots[slots.length - 1]?.out || '';

    // OT: worked more than 8h
    const otMin = Math.max(0, durMin - 480);
    // HOT: half OT (worked between 4-8h)
    const hotMin = durMin >= 240 && durMin < 480 ? durMin - 240 : 0;
    // LC: Late coming (in after 10:00)
    const lcMin = firstIn > '10:00' && firstIn ? 30 : 0;
    // EG: Early going (out before 17:00)
    const egMin = lastOut && lastOut < '17:00' && lastOut ? 30 : 0;

    return {
      status: rec.status,
      inTime: firstIn || '00:00',
      outTime: lastOut || '00:00',
      totalDuration: toHHMM(durMin),
      locationName: '',
      checkoutLocation: '',
      otHours: toHHMM(otMin),
      hotHours: toHHMM(hotMin),
      lcHours: toHHMM(lcMin),
      egHours: toHHMM(egMin),
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
    if (s === 'Present') return '#16a34a';
    if (s === 'Absent') return '#dc2626';
    if (s === 'Late') return '#d97706';
    if (s === 'Weekly Off' || s === 'WO') return '#6b7280';
    return '#374151';
  };

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#f4f6f8', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'white', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/dashboard/attendance')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
          ← Back to Attendance
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Advanced Attendance Grid</h2>
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
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: '100%', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '130px' }} />
                <col style={{ width: '120px' }} />
                {days.map((_, i) => <col key={i} style={{ width: '70px' }} />)}
              </colgroup>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={thSt}>EMPLOYEE CODE</th>
                  <th style={thSt}>BRANCH</th>
                  <th style={thSt}>DESIGNATION</th>
                  <th style={thSt}>DEPARTMENT</th>
                  <th style={thSt}>EMPLOYEE NAME</th>
                  <th style={{ ...thSt, width: '120px' }}></th>
                  {days.map(d => (
                    <th key={fmt(d)} style={{ ...thSt, textAlign: 'center', fontSize: '10px', lineHeight: '1.4' }}>
                      <div style={{ fontWeight: 700 }}>{fmt(d).substring(5).replace('-', '-')}</div>
                      <div style={{ color: '#9ca3af' }}>{dayLabel(d)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, empIdx) => {
                  const isExpanded = expandedEmp === emp.id;
                  const bgColor = empIdx % 2 === 0 ? 'white' : '#fafafa';

                  return ROW_LABELS.map((rowDef, rowIdx) => {
                    if (rowIdx === 0) {
                      // Main employee row (status row)
                      return (
                        <tr key={`${emp.id}-status`} style={{ background: bgColor, borderBottom: '1px solid #f3f4f6' }}>
                          <td style={tdSt} rowSpan={ROW_LABELS.length}>
                            <span style={{ fontWeight: 600, fontSize: '12px' }}>{emp.empId || '—'}</span>
                          </td>
                          <td style={tdSt} rowSpan={ROW_LABELS.length}>
                            <span style={{ fontSize: '12px' }}>{emp.branch || 'DEFAULT'}</span>
                          </td>
                          <td style={tdSt} rowSpan={ROW_LABELS.length}>
                            <span style={{ fontSize: '12px' }}>{emp.designation || 'EMPLOYEE'}</span>
                          </td>
                          <td style={tdSt} rowSpan={ROW_LABELS.length}>
                            <span style={{ fontSize: '12px' }}>{emp.department}</span>
                          </td>
                          <td style={{ ...tdSt, fontWeight: 600, fontSize: '13px' }} rowSpan={ROW_LABELS.length}>
                            <span style={{ cursor: 'pointer', color: '#007bff' }} onClick={() => router.push(`/dashboard/employees/${emp.id}`)}>{emp.name}</span>
                          </td>
                          {/* Row label column */}
                          <td style={{ ...tdSt, fontSize: '11px', color: '#6b7280', fontStyle: 'italic', padding: '6px 8px', background: '#f9fafb', borderRight: '1px solid #f3f4f6' }}></td>
                          {days.map(d => {
                            const data = getCellData(emp.id, fmt(d));
                            const abbr = data ? statusAbbr(data.status) : '';
                            return (
                              <td key={fmt(d)} style={{ ...tdSt, textAlign: 'center', padding: '8px 4px' }}>
                                <span style={{ fontWeight: 700, fontSize: '12px', color: data ? statusColor(data.status) : '#d1d5db' }}>
                                  {abbr || '—'}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    }
                    // Sub-rows
                    return (
                      <tr key={`${emp.id}-${rowDef.key}`} style={{ background: bgColor, borderBottom: rowIdx === ROW_LABELS.length - 1 ? '2px solid #e5e7eb' : '1px solid #f3f4f6' }}>
                        <td style={{ ...tdSt, fontSize: '11px', color: '#6b7280', padding: '5px 8px', background: '#f9fafb', borderRight: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                          {rowDef.label}
                        </td>
                        {days.map(d => {
                          const data = getCellData(emp.id, fmt(d));
                          const val = data ? (data[rowDef.key] ?? '—') : '';
                          const isTime = ['inTime','outTime','totalDuration','otHours','hotHours','lcHours','egHours'].includes(rowDef.key);
                          return (
                            <td key={fmt(d)} style={{ ...tdSt, textAlign: 'center', fontSize: '11px', padding: '5px 4px', color: val === '00:00' ? '#d1d5db' : '#374151' }}>
                              {data ? (val || '—') : ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6 + days.length} style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
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

const thSt = { padding: '10px 8px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', whiteSpace: 'nowrap', borderRight: '1px solid #f3f4f6' };
const tdSt = { padding: '8px', verticalAlign: 'middle', fontSize: '12px', color: '#374151', borderRight: '1px solid #f3f4f6' };
