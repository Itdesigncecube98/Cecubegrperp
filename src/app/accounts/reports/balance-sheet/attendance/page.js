'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function PostedSalaryAttendancePage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const recordId = new URLSearchParams(window.location.search).get('recordId');
    if (!recordId) {
      setError('Posted salary record ID is missing.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadAttendance = async () => {
      try {
        const response = await fetch(
          `/api/accounts/balance-sheet/posted-salaries/${encodeURIComponent(recordId)}/attendance`,
          { cache: 'no-store' }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load attendance.');
        if (!cancelled) setData(result.data);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Could not load attendance.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAttendance();
    return () => { cancelled = true; };
  }, []);

  const attendanceByDate = new Map((data?.attendance || []).map(item => [item.date, item]));
  const dateRows = [];
  if (data?.payCycle?.startDate && data?.payCycle?.endDate) {
    const start = new Date(`${String(data.payCycle.startDate).slice(0, 10)}T00:00:00`);
    const end = new Date(`${String(data.payCycle.endDate).slice(0, 10)}T00:00:00`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateKey = getDateKey(date);
        dateRows.push({
          dateKey,
          dateLabel: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date),
          dayLabel: new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(date),
          attendance: attendanceByDate.get(dateKey),
        });
      }
    }
  }

  const handleExport = () => {
    if (!data || dateRows.length === 0) return;
    const exportRows = dateRows.map(row => ({
      'Employee Name': data.employee.name,
      'Employee ID': data.employee.empId || '',
      'Pay Cycle': data.payCycle.name,
      Date: row.dateLabel,
      Day: row.dayLabel,
      Attendance: row.attendance?.status || 'Not Marked',
    }));
    const filePart = `${data.employee.empId || data.employee.name}_${data.payCycle.name}`
      .replace(/[<>:"/\\|?*]+/g, '_')
      .replace(/\s+/g, '_');
    exportToExcel(exportRows, `Attendance_${filePart}`, 'Attendance');
  };

  return (
    <main style={{ minHeight: '100vh', padding: '20px', background: '#f1f5f9', color: '#1e293b' }}>
      <button
        type="button"
        onClick={() => router.back()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', color: '#334155', cursor: 'pointer' }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <section style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', overflow: 'hidden' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Employee Attendance</h1>
            {data && (
              <div style={{ marginTop: '6px', color: '#64748b', fontSize: '0.85rem' }}>
                {data.employee.name} ({data.employee.empId || '-'}) · {data.payCycle.name}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!data || dateRows.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', border: 0, borderRadius: '6px', background: '#0f766e', color: 'white', cursor: !data || dateRows.length === 0 ? 'not-allowed' : 'pointer', opacity: !data || dateRows.length === 0 ? 0.6 : 1 }}
          >
            <Download size={15} /> Export Excel
          </button>
        </header>

        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
            <Loader2 className="animate-spin inline-block mr-2" size={20} /> Loading attendance...
          </div>
        ) : error ? (
          <div role="alert" style={{ padding: '24px', color: '#b91c1c' }}>{error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#0f766e', color: 'white', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Day</th>
                  <th style={{ padding: '10px 14px' }}>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {dateRows.map(row => {
                  const attendance = row.attendance;
                  return (
                    <tr key={row.dateKey} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '9px 14px' }}>{row.dateLabel}</td>
                      <td style={{ padding: '9px 14px' }}>{row.dayLabel}</td>
                      <td style={{ padding: '9px 14px', fontWeight: 600, color: attendance ? '#334155' : '#94a3b8' }}>
                        {attendance?.status || 'Not Marked'}
                      </td>
                    </tr>
                  );
                })}
                {dateRows.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      No attendance dates are available for this pay cycle.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
