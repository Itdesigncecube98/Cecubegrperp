'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Download, LayoutTemplate, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import styles from '../punches.module.css';

import { getAttendance } from '../../../../lib/data';

export default function WhosInPage() {
  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('Employee');
  const [chartData, setChartData] = useState([{ name: 'All', IN: 0, OUT: 0, 'NO PUNCH': 0, 'ON LEAVE': 0 }]);
  
  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (empData) setEmployee(JSON.parse(empData));
    fetchWhosIn();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({
    organization: 'Cecube Engineering India Pvt Ltd',
    filterBy: 'All',
    selectAll: 'Any',
    date: today,
    status: 'All'
  });

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWhosIn = async () => {
    setLoading(true);
    try {
      const data = await getAttendance(today);
      const mapped = data.map(d => {
        let attStatus = 'NO PUNCH';
        if (d.status === 'Present' || d.status === 'Late') attStatus = 'IN';
        if (d.status === 'Absent' && d.timeSlots && d.timeSlots.length > 0) attStatus = 'OUT';
        
        let firstPunch = '';
        let recentPunch = '';
        if (d.timeSlots) {
          try {
            const slots = JSON.parse(d.timeSlots);
            if (slots.length > 0) {
              firstPunch = slots[0].in || '';
              recentPunch = slots[slots.length - 1].out || slots[slots.length - 1].in || '';
            }
          } catch(e) {}
        }
        
        return {
          code: d.employee.employeeCode || d.employee.empId || 'N/A',
          name: d.employee.name,
          branch: d.employee.branch || '-',
          date: d.date,
          firstPunch,
          recentPunch,
          status: attStatus,
          department: d.employee.department,
          designation: d.employee.designation
        };
      });
      setRecords(mapped);
      
      const inCount = mapped.filter(r => r.status === 'IN').length;
      const outCount = mapped.filter(r => r.status === 'OUT').length;
      const noPunchCount = mapped.filter(r => r.status === 'NO PUNCH').length;
      const onLeaveCount = mapped.filter(r => r.status === 'ON LEAVE').length;
      
      setChartData([{ name: 'All', IN: inCount, OUT: outCount, 'NO PUNCH': noPunchCount, 'ON LEAVE': onLeaveCount }]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <Link href="/dashboard" className={styles.backLink}>
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>
        <div style={{ fontSize: '14px', fontWeight: 500, color: '#334155' }}>
          Who's In
        </div>
      </div>

      <div className={styles.pageHeader} style={{ padding: '0 24px', backgroundColor: 'white' }}>
        <div 
          className={`${styles.tab} ${activeTab === 'Employee' ? styles.active : ''}`}
          onClick={() => setActiveTab('Employee')}
        >
          Employee Wise
        </div>
        <div 
          className={`${styles.tab} ${activeTab === 'Group' ? styles.active : ''}`}
          onClick={() => setActiveTab('Group')}
        >
          Group Wise
        </div>
      </div>

      <div className={styles.contentArea}>
        {/* Who is in Chart */}
        <div className="card chartCard" style={{ marginBottom: '1.5rem', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: 'white' }}>
          <div className="chartHeader" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <h2 className="chartTitle" style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'baseline' }}>
              <span style={{ color: '#4b5563', fontWeight: '500' }}>My Team -&nbsp;</span>
              <span style={{ color: '#3b82f6', fontWeight: '500', borderBottom: '2px solid #f59e0b', paddingBottom: '0.2rem' }}>Who is in?</span>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
              <button onClick={fetchWhosIn} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={14} color="#4b5563" />
              </button>
              <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>Group By</span>
              <select style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #3b82f6', fontSize: '0.9rem', color: '#111827', outline: 'none', backgroundColor: 'white' }}>
                <option>All</option>
                <option>Branch</option>
                <option>Department</option>
                <option>Designation</option>
                <option>Location</option>
              </select>
            </div>
          </div>
          <div style={{ height: '220px', padding: '1.5rem', border: '1px solid #f3f4f6', borderRadius: '12px', backgroundColor: '#fafafa', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 20 }} barSize={35}>
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <YAxis axisLine={{stroke: '#e5e7eb'}} tickLine={false} tick={{fontSize: 12, fill: '#4b5563'}} tickCount={2} domain={[0, 1]} />
                <XAxis dataKey="name" axisLine={{stroke: '#e5e7eb'}} tickLine={false} tick={{fontSize: 12, fill: '#4b5563'}} dy={10} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Legend iconType="square" iconSize={12} wrapperStyle={{ fontSize: '11px', fontWeight: 600, bottom: -15, color: '#4b5563' }} />
                <Bar dataKey="IN" stackId="a" fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="OUT" stackId="a" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="NO PUNCH" stackId="a" fill="#f87171" radius={[6, 6, 0, 0]} />
                <Bar dataKey="ON LEAVE" stackId="a" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filterCard}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Organization</label>
              <select className={styles.filterSelect} value={filters.organization} onChange={e => setFilters({...filters, organization: e.target.value})}>
                <option value="Cecube Engineering India Pvt Ltd">Cecube Engineering India Pvt Ltd</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Filter By</label>
              <select className={styles.filterSelect} value={filters.filterBy} onChange={e => setFilters({...filters, filterBy: e.target.value})}>
                <option value="All">All</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Select all</label>
              <select className={styles.filterSelect} value={filters.selectAll} onChange={e => setFilters({...filters, selectAll: e.target.value})}>
                <option value="Any">Any</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Date</label>
              <input type="date" className={styles.filterInput} value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Status</label>
              <select className={styles.filterSelect} value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                <option value="All">All</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="NO PUNCH">No Punch</option>
              </select>
            </div>
          </div>
          <div className={styles.actionButtons}>
            <button className={styles.btnPrimary}>View</button>
            <button className={styles.btnPrimary}>Clear</button>
          </div>
        </div>

        {/* Data Table */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <h2 className={styles.tableTitle}>Employee Wise</h2>
              <p className={styles.tableSubtitle}>The below table shows the list of employee wise records.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={styles.btnOutline} style={{ color: '#f59e0b', borderColor: '#fcd34d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LayoutTemplate size={14} /> View Columns
              </button>
              <button className={styles.btnOutline} style={{ color: '#f59e0b', borderColor: '#fcd34d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          <div className={styles.tableControls}>
            <div className={styles.entriesControl}>
              <select className={styles.entriesSelect}>
                <option>All</option>
                <option>10</option>
                <option>25</option>
              </select>
              entries per page
            </div>
            <div className={styles.searchControl}>
              Search <input type="text" className={styles.searchInput} />
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>EMP CODE</th>
                  <th>NAME</th>
                  <th>BRANCH</th>
                  <th>DATE</th>
                  <th>FIRST PUNCH</th>
                  <th>RECENT PUNCH</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '1rem' }}>Loading...</td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '1rem' }}>No data available</td>
                  </tr>
                ) : (
                  records.map((r, i) => (
                    <tr key={i}>
                      <td>{r.code}</td>
                      <td>{r.name}</td>
                      <td>{r.branch}</td>
                      <td>{r.date}</td>
                      <td>{r.firstPunch}</td>
                      <td>{r.recentPunch}</td>
                      <td>
                        <span style={{ 
                          backgroundColor: r.status === 'IN' ? '#dcfce7' : r.status === 'NO PUNCH' ? '#fee2e2' : '#f3f4f6', 
                          color: r.status === 'IN' ? '#16a34a' : r.status === 'NO PUNCH' ? '#dc2626' : '#4b5563', 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: 'bold',
                          border: `1px solid ${r.status === 'IN' ? '#bbf7d0' : r.status === 'NO PUNCH' ? '#fecaca' : '#e5e7eb'}`
                        }}>{r.status}</span>
                      </td>
                      <td>
                        <button className={styles.linkButton}>View Punches</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
