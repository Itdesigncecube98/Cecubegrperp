'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download } from 'lucide-react';
import { exportToCSV } from '../../../../lib/exportUtils';
import '../../attendance/attendance.css';

function fmt(dateObj) {
  return dateObj.toISOString().split('T')[0];
}

export default function MobileCheckin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);

  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 10);

  const [startDate, setStartDate] = useState(fmt(monday));
  const [endDate, setEndDate] = useState(fmt(sunday));

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/requests?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        // Filter only those with GPS coordinates
        const mobilePunches = data.filter(r => r.latitude && r.longitude);
        setTableData(mobilePunches);
      } else {
        setTableData([]);
      }
    } catch (e) {
      console.error(e);
      setTableData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    fetchData();
  }, [startDate, endDate]);

  const handleClear = () => {
    setStartDate(fmt(monday));
    setEndDate(fmt(sunday));
    setTableData([]);
  };

  return (
    <div className="pageContainer">
      <Link href="/dashboard/reports" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
        <h1 style={{ fontSize: '16px', color: '#111827', margin: 0 }}>Mobile Checkin Report</h1>
        <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid #e5e7eb', width: '100%' }}>
          <div className="tab active" style={{ fontSize: '14px', borderBottom: '2px solid #f59e0b', paddingBottom: '0.5rem', cursor: 'pointer' }}>Team Mobile Checkin Report</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        {/* Row 1 */}
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
            <label className="filterLabel">Location Type</label>
            <select className="filterInput">
              <option>Any</option>
              <option>CUSTOMER</option>
              <option>OFFICE</option>
              <option>OTHERS</option>
            </select>
          </div>
        </div>
        
        <div className="filterActions" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btnPrimary" onClick={fetchData}>View</button>
            <button className="btn" style={{ background: '#f3f4f6', color: '#9ca3af' }} onClick={handleClear}>Clear</button>
          </div>
          <button className="btn btnPrimary" style={{ background: '#10b981' }} onClick={() => {
            if (tableData.length === 0) return;
            const rows = tableData.map(row => ({
              'EMPLOYEE NAME': row.employee?.name,
              'EMPLOYEE CODE': row.employee?.empId,
              'DATE': row.date.split('-').reverse().join('-'),
              'TIME': row.time,
              'PUNCH TYPE': row.type,
              'LATITUDE': row.latitude,
              'LONGITUDE': row.longitude,
              'STATUS': row.status
            }));
            exportToCSV('mobile-checkin.csv', rows);
          }}>
            <Download size={16} style={{ marginRight: '8px' }} />
            Export
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">GPS Check-ins</h2>
            </div>
            <p className="tableSubtitle">List of punches made with mobile GPS tracking.</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="dataTable">
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>DATE</th>
                <th>TIME</th>
                <th>PUNCH TYPE</th>
                <th>COORDINATES (Lat, Long)</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>Loading records...</td>
                </tr>
              ) : tableData.length > 0 ? (
                tableData.map(row => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{row.employee?.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.employee?.empId}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '13px' }}>
                        {new Date(row.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}, {row.date.split('-').reverse().join('-')}
                      </div>
                    </td>
                    <td>{row.time}</td>
                    <td>
                      <span style={{ 
                        padding: '2px 8px', borderRadius: '12px', fontSize: '12px',
                        background: row.type === 'IN' ? '#dcfce7' : '#fee2e2',
                        color: row.type === 'IN' ? '#16a34a' : '#dc2626'
                      }}>
                        {row.type}
                      </span>
                    </td>
                    <td>
                      <a href={`https://maps.google.com/?q=${row.latitude},${row.longitude}`} target="_blank" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                        {row.latitude.toFixed(5)}, {row.longitude.toFixed(5)}
                      </a>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '2px 8px', borderRadius: '12px', fontSize: '12px',
                        background: row.status === 'APPROVED' ? '#dcfce7' : row.status === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                        color: row.status === 'APPROVED' ? '#16a34a' : row.status === 'REJECTED' ? '#dc2626' : '#d97706'
                      }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No data available in table</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
