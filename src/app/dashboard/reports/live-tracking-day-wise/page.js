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

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '0m';
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function LiveTrackingDayWise() {
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
      const res = await fetch(`/api/location-requests?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        // Group by Employee + Date
        const grouped = {};
        
        data.forEach(req => {
          const dateStr = req.requestedAt.split('T')[0];
          const empId = req.employeeId;
          const key = `${empId}_${dateStr}`;
          
          if (!grouped[key]) {
            grouped[key] = {
              id: key,
              employee: req.employee,
              date: dateStr,
              totalDistance: 0,
              totalDurationMs: 0
            };
          }
          
          // Calculate distance and duration for this request
          if (req.pings && req.pings.length > 1) {
            let reqDistance = 0;
            for (let i = 1; i < req.pings.length; i++) {
              reqDistance += getDistance(
                req.pings[i-1].latitude, req.pings[i-1].longitude,
                req.pings[i].latitude, req.pings[i].longitude
              );
            }
            
            const firstPing = new Date(req.pings[0].timestamp).getTime();
            const lastPing = new Date(req.pings[req.pings.length - 1].timestamp).getTime();
            const reqDuration = lastPing - firstPing;
            
            grouped[key].totalDistance += reqDistance;
            grouped[key].totalDurationMs += reqDuration;
          }
        });
        
        const results = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
        setTableData(results);
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
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Live Tracking Day Wise Summary</div>
      </div>

      <div className="card">
        {/* Row 1 */}
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Organization</label>
            <select className="filterInput">
              <option>Cecube Engineering India Pvt Ltd</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Employee</label>
            <select className="filterInput">
              <option>Any</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Start Date</label>
            <input type="date" className="filterInput" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="filterGroup">
            <label className="filterLabel">End Date</label>
            <input type="date" className="filterInput" value={endDate} onChange={e => setEndDate(e.target.value)} />
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
              'EMPLOYEE CODE': row.employee?.empId || '—',
              'EMPLOYEE NAME': row.employee?.name,
              'DATE': row.date.split('-').reverse().join('-'),
              'DISTANCE TRAVELED (km)': row.totalDistance.toFixed(2) + ' km',
              'DURATION ON ROAD': formatDuration(row.totalDurationMs)
            }));
            exportToCSV('live-tracking-day-wise.csv', rows);
          }}>
            <Download size={16} style={{ marginRight: '8px' }} />
            Export
          </button>
        </div>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">Day Wise Live Tracking</h2>
            </div>
            <p className="tableSubtitle">Summary of journey status (distance traveled, duration) for each day.</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="dataTable">
            <thead>
              <tr>
                <th>EMPLOYEE CODE</th>
                <th>EMPLOYEE NAME</th>
                <th>DATE</th>
                <th>DISTANCE TRAVELED (km)</th>
                <th>DURATION ON ROAD</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>Loading tracking data...</td>
                </tr>
              ) : tableData.length > 0 ? (
                tableData.map(row => (
                  <tr key={row.id}>
                    <td>{row.employee?.empId || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{row.employee?.name}</td>
                    <td>{row.date.split('-').reverse().join('-')}</td>
                    <td>{row.totalDistance.toFixed(2)} km</td>
                    <td>{formatDuration(row.totalDurationMs)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No data available in table</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
