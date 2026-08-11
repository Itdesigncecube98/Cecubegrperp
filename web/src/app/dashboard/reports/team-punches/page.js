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

export default function TeamPunches() {
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
  const [punchType, setPunchType] = useState('Any');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/requests?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        let filtered = data;
        if (punchType !== 'Any') {
          filtered = filtered.filter(r => r.type === punchType);
        }
        setTableData(filtered);
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
  }, [startDate, endDate, punchType]);

  const handleClear = () => {
    setStartDate(fmt(monday));
    setEndDate(fmt(sunday));
    setPunchType('Any');
    setSearch('');
    setTableData([]);
  };

  const filteredData = tableData.filter(row => 
    row.employee?.name?.toLowerCase().includes(search.toLowerCase()) || 
    row.employee?.empId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pageContainer">
      <Link href="/dashboard/reports" className="backLink">
        <ChevronLeft size={16} /> Back
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Team Punches</div>
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
        {/* Row 2 */}
        <div className="filtersRow">
          <div className="filterGroup">
            <label className="filterLabel">Mode of Entry</label>
            <select className="filterInput">
              <option>Any</option>
              <option>Supervisor Entry</option>
              <option>Mobile GPS Entry</option>
              <option>Biometric Entry</option>
              <option>Web Entry</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">Punch Type</label>
            <select className="filterInput" value={punchType} onChange={e => setPunchType(e.target.value)}>
              <option value="Any">Any</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>
          <div className="filterGroup">
            <label className="filterLabel">View Type</label>
            <select className="filterInput">
              <option>Compact View</option>
            </select>
          </div>
          <div className="filterGroup"></div>
        </div>

        <div className="filterActions" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btnPrimary" onClick={fetchData}>View</button>
            <button className="btn" style={{ background: '#f3f4f6', color: '#9ca3af' }} onClick={handleClear}>Clear</button>
          </div>
          <button className="btn btnPrimary" style={{ background: '#10b981' }} onClick={() => {
            if (filteredData.length === 0) return;
            const rows = filteredData.map(row => ({
              'ORGANIZATION': 'Cecube Engineering India',
              'EMPLOYEE CODE': row.employee?.empId,
              'EMPLOYEE NAME': row.employee?.name,
              'DATE': row.date.split('-').reverse().join('-'),
              'TIME': row.time,
              'TYPE': row.type,
              'MODE OF ENTRY': row.latitude ? 'Mobile GPS Entry' : 'Web Entry'
            }));
            exportToCSV('team-punches.csv', rows);
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
              <h2 className="tableTitle">Team Punches</h2>
            </div>
            <p className="tableSubtitle">The below table shows the list of punches of your team.</p>
          </div>
        </div>

        <div className="tableControls">
          <div className="entriesControl">
            <select className="entriesSelect"><option>All</option></select>
            entries per page
          </div>
          <div className="searchControl">
            Search: <input type="text" className="searchInput" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="dataTable">
            <thead>
              <tr>
                <th>ORGANIZATION</th>
                <th>EMPLOYEE CODE</th>
                <th>EMPLOYEE NAME</th>
                <th>DATE</th>
                <th>TIME</th>
                <th>TYPE</th>
                <th>MODE OF ENTRY</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>Loading punches...</td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map(row => (
                  <tr key={row.id}>
                    <td>Cecube Engineering India</td>
                    <td>{row.employee?.empId}</td>
                    <td style={{ fontWeight: 600 }}>{row.employee?.name}</td>
                    <td>{row.date.split('-').reverse().join('-')}</td>
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
                    <td>{row.latitude ? 'Mobile GPS Entry' : 'Web Entry'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No data available in table</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="paginationArea">
          <div>Showing {filteredData.length > 0 ? 1 : 0} to {filteredData.length} of {filteredData.length} entries</div>
          <div className="paginationButtons">
            <button className="pageBtn" disabled>&lsaquo;</button>
            <button className="pageBtn active">1</button>
            <button className="pageBtn" disabled>&rsaquo;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
