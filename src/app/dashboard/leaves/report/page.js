'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';

export default function LeaveReportPage() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('ALL');

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, leaveRes, balRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/leaves'),
        fetch('/api/leaves/balance')
      ]);
      const emps = await empRes.json();
      const leaves = await leaveRes.json();
      const bals = await balRes.json();
      
      const report = emps.filter(e => e.role === 'EMPLOYEE').map(emp => {
        const empLeaves = leaves.filter(l => l.employeeId === emp.id);
        const bal = (Array.isArray(bals) ? bals : []).find(b => b.employeeId === emp.id);
        const approved = empLeaves.filter(l => l.status === 'APPROVED').length;
        const pending = empLeaves.filter(l => l.status === 'PENDING').length;
        const rejected = empLeaves.filter(l => l.status === 'REJECTED').length;
        return {
          ...emp,
          totalRequests: empLeaves.length,
          approved, pending, rejected,
          casualBalance: bal?.casualLeaves ?? 0,
          lwpBalance: bal?.leaveWithoutPay ?? 0,
          earnedBalance: bal?.earnedLeaves ?? 0,
          coffBalance: bal?.compensatoryLeaves ?? 0
        };
      });
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
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Leave Entitlements & Usage Report</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>Overview of leave usage across all employees</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none' }}>
          {departments.map(d => <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>)}
        </select>
        <button onClick={fetchData} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Refresh</button>
      </div>

      {loading ? <p>Loading report...</p> : (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Employee', 'Dept', 'Total Requests', 'Approved', 'Pending', 'Rejected', 'Casual (Rem.)', 'LWP (Rem.)', 'Earned (Rem.)', 'COFF (Rem.)'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px', fontSize: '14px', fontWeight: 600 }}>
                    {emp.name}
                    <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>{emp.empId}</div>
                  </td>
                  <td style={{ padding: '14px', fontSize: '13px', color: '#374151' }}>{emp.department || '—'}</td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px' }}>{emp.totalRequests}</span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ background: '#dcfce7', color: '#16a34a', padding: '3px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}>{emp.approved}</span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ background: '#fef3c7', color: '#d97706', padding: '3px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}>{emp.pending}</span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}>{emp.rejected}</span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{emp.casualBalance}</span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ color: '#d97706', fontWeight: 700 }}>{emp.lwpBalance}</span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>{emp.earnedBalance}</span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{emp.coffBalance}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No data found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
