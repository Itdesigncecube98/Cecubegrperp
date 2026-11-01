'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, RefreshCw, Search } from 'lucide-react';

const PAGE_SIZE = 100;

function todayInIndia() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatPunchTime(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

export default function BiometricBackupPage() {
  const [startDate, setStartDate] = useState('2025-08-01');
  const [endDate, setEndDate] = useState(todayInIndia());
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ records: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      startDate,
      endDate,
      page: String(page),
      pageSize: String(PAGE_SIZE),
      search,
    });

    async function loadPunches() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/attendance/punches?${params}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Failed to load biometric backup.');
        setResult(body);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'Failed to load biometric backup.');
          setResult({ records: [], total: 0, totalPages: 1 });
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadPunches();
    return () => controller.abort();
  }, [startDate, endDate, page, search]);

  const exportCurrentPage = () => {
    if (result.records.length === 0) return;
    const rows = result.records.map((record) => ({
      'Punch Date & Time (IST)': formatPunchTime(record.punchTime),
      'Employee Code': record.employeeCode || '',
      'Employee Name': record.employeeName || '',
      'Device User ID': record.userId || '',
      Direction: record.direction || '',
      Location: record.location || '',
      'Device ID': record.deviceId,
      'Device Log ID': record.deviceLogId,
      Source: record.source,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 26 }, { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 12 },
      { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 38 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Biometric Backup');
    XLSX.writeFile(workbook, `Biometric_Attendance_${startDate}_to_${endDate}_page-${page}.xlsx`);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchText.trim());
  };

  return (
    <div style={{ padding: '1.5rem 2rem', minHeight: '100vh', background: '#f8fafc' }}>
      <Link href="/dashboard/attendance" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0369a1', textDecoration: 'none', marginBottom: 16 }}>
        <ArrowLeft size={17} /> Attendance Tracking
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: 26 }}>Biometric Attendance Backup</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b' }}>
            Raw device punches from 1 Aug 2025 onward. This is read-only and does not change daily attendance.
          </p>
        </div>
        <button type="button" onClick={exportCurrentPage} disabled={!result.records.length || loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '0 14px', border: 0, borderRadius: 8, background: '#0284c7', color: '#fff', fontWeight: 600, cursor: result.records.length && !loading ? 'pointer' : 'not-allowed', opacity: result.records.length && !loading ? 1 : 0.55 }}>
          <Download size={16} /> Export Current Page
        </button>
      </div>

      <form onSubmit={submitSearch} style={{ display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap', padding: 16, marginBottom: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
        <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 13, fontWeight: 600 }}>
          From
          <input type="date" value={startDate} max={endDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} style={{ minHeight: 40, padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: 7, color: '#0f172a' }} />
        </label>
        <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 13, fontWeight: 600 }}>
          To
          <input type="date" value={endDate} min={startDate} max={todayInIndia()} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} style={{ minHeight: 40, padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: 7, color: '#0f172a' }} />
        </label>
        <label style={{ display: 'grid', gap: 6, flex: '1 1 240px', color: '#475569', fontSize: 13, fontWeight: 600 }}>
          Search employee / device
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Name, employee code, device user ID" style={{ minHeight: 40, padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: 7, color: '#0f172a' }} />
        </label>
        <button type="submit" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 40, padding: '0 14px', border: 0, borderRadius: 7, background: '#0f172a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          <Search size={16} /> Search
        </button>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10, color: '#475569' }}>
        <span><strong style={{ color: '#0f172a' }}>{result.total.toLocaleString()}</strong> punches in selected range</span>
        <span>Page {result.page || page} of {result.totalPages || 1}</span>
      </div>

      {error && <div role="alert" style={{ padding: 12, marginBottom: 12, border: '1px solid #fca5a5', borderRadius: 8, background: '#fef2f2', color: '#991b1b' }}>{error}</div>}

      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
        <table style={{ width: '100%', minWidth: 1050, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#f1f5f9', color: '#475569' }}>
              {['Punch Time (IST)', 'Employee Code', 'Employee Name', 'Device User ID', 'Direction', 'Location', 'Device / Log ID', 'Source'].map((heading) => (
                <th key={heading} style={{ padding: '12px 10px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: '#64748b' }}><RefreshCw size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} />Loading biometric punches...</td></tr>
            ) : error ? (
              <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: '#991b1b' }}>Backup records could not be loaded.</td></tr>
            ) : result.records.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>No biometric backup records found in this date range.</td></tr>
            ) : result.records.map((record) => (
              <tr key={record.id}>
                <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', color: '#0f172a' }}>{formatPunchTime(record.punchTime)}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{record.employeeCode || '-'}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{record.employeeName || '-'}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{record.userId || '-'}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{record.direction || '-'}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{record.location || '-'}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{record.deviceId} / {record.deviceLogId}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{record.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} style={{ minHeight: 36, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#334155', cursor: page <= 1 || loading ? 'not-allowed' : 'pointer', opacity: page <= 1 || loading ? 0.5 : 1 }}>
          <ChevronLeft size={16} /> Previous
        </button>
        <button type="button" aria-label="Next page" disabled={page >= result.totalPages || loading} onClick={() => setPage((current) => current + 1)} style={{ minHeight: 36, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#334155', cursor: page >= result.totalPages || loading ? 'not-allowed' : 'pointer', opacity: page >= result.totalPages || loading ? 0.5 : 1 }}>
          Next <ChevronRight size={16} />
        </button>
      </div>
      {result.records.length > 0 && <p style={{ marginTop: 8, textAlign: 'right', color: '#64748b', fontSize: 12 }}>Excel export includes this page only ({PAGE_SIZE} records maximum).</p>}
    </div>
  );
}
