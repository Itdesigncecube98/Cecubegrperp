'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function AttendanceSummaryPage() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [filterDept, setFilterDept] = useState('ALL');

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    fetchData();
  }, [router, month]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const empRes = await fetch('/api/employees');
      const emps = await empRes.json();

      const [year, m] = month.split('-').map(Number);
      const daysInMonth = new Date(year, m, 0).getDate();
      const startDate = `${month}-01`;
      const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;
      const report = await Promise.all(emps.filter(e => e.role === 'EMPLOYEE').map(async emp => {
        const response = await fetch(`/api/attendance/stats?employeeId=${encodeURIComponent(emp.id)}&startDate=${startDate}&endDate=${endDate}`, { cache: 'no-store' });
        const stats = response.ok ? await response.json() : [];
        const monthStats = Array.isArray(stats) ? stats.find(item => item.month === month) : null;
        const details = monthStats?.details || [];
        const present = details.filter(item => ['Present', 'P'].includes(item.status)).length;
        const absent = details.filter(item => ['Absent', 'A'].includes(item.status)).length;
        const late = details.filter(item => item.status === 'Late').length;
        const halfDay = details.filter(item => ['Half Day', 'HD'].includes(item.status)).length;
        return { ...emp, present, absent, late, halfDay, holidays: monthStats?.Holidays || 0, offDays: monthStats?.OffDays || 0, total: monthStats?.TotalWorkingDays || 0, marked: present + absent + late + halfDay };
      }));

      setData(report);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const departments = ['ALL', ...new Set(data.map(d => d.department).filter(Boolean))];
  const filtered = data.filter(d => filterDept === 'ALL' || d.department === filterDept);

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Attendance Summary Report</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Monthly attendance overview for all employees.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }} />
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }}>
          {departments.map(d => <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p>Calculating summary for {month}...</p>
          <p style={{ fontSize: '12px' }}>This may take a moment.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Employee', 'Department', 'Working Days', 'Present', 'Half Day', 'Absent', 'Late', 'Holidays', 'Week Off', 'Attendance %'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => {
                const pct = emp.total > 0 ? Math.round(((emp.present + emp.late + emp.halfDay * 0.5) / emp.total) * 100) : 0;
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{emp.name}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{emp.empId}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151' }}>{emp.department || '—'}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'center' }}>{emp.total}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 12px', borderRadius: '12px', fontWeight: 700 }}>{emp.present}</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ background: '#dbeafe', color: '#2563eb', padding: '4px 12px', borderRadius: '12px', fontWeight: 700 }}>{emp.halfDay}</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 12px', borderRadius: '12px', fontWeight: 700 }}>{emp.absent}</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: '12px', fontWeight: 700 }}>{emp.late}</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 12px', borderRadius: '12px', fontWeight: 700 }}>{emp.holidays}</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '12px', fontWeight: 700 }}>{emp.offDays}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626', borderRadius: '4px', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '36px', color: pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626' }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="10" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
