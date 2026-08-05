'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import styles from '../punches.module.css';

export default function TeamPunchesPage() {
  const [employee, setEmployee] = useState(null);
  
  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (empData) setEmployee(JSON.parse(empData));
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({
    organization: 'Cecube Engineering India Pvt Ltd',
    employee: 'Any',
    startDate: today,
    endDate: '',
    modeOfEntry: 'Any',
    punchType: 'Any',
    viewType: 'Compact View'
  });

  const [punches, setPunches] = useState([]);

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <Link href="/dashboard" className={styles.backLink}>
          <ChevronLeft size={16} /> Back
        </Link>
        <div className={styles.pageHeader}>
          <div className={styles.pageTitle}>Team Punches</div>
        </div>
      </div>

      <div className={styles.contentArea}>
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
              <label className={styles.filterLabel}>Employee</label>
              <select className={styles.filterSelect} value={filters.employee} onChange={e => setFilters({...filters, employee: e.target.value})}>
                <option value="Any">Any</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Start Date</label>
              <input type="date" className={styles.filterInput} value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>End Date</label>
              <input type="date" className={styles.filterInput} value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Mode of Entry</label>
              <select className={styles.filterSelect} value={filters.modeOfEntry} onChange={e => setFilters({...filters, modeOfEntry: e.target.value})}>
                <option value="Any">Any</option>
                <option value="Web">Web</option>
                <option value="Mobile">Mobile</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Punch Type</label>
              <select className={styles.filterSelect} value={filters.punchType} onChange={e => setFilters({...filters, punchType: e.target.value})}>
                <option value="Any">Any</option>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>View Type</label>
              <select className={styles.filterSelect} value={filters.viewType} onChange={e => setFilters({...filters, viewType: e.target.value})}>
                <option value="Compact View">Compact View</option>
                <option value="Detailed View">Detailed View</option>
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
              <h2 className={styles.tableTitle}>Team Punches</h2>
              <p className={styles.tableSubtitle}>The below table shows the list of punches of your team.</p>
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
                {punches.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyState}>No data available in table</td>
                  </tr>
                ) : (
                  punches.map((p, i) => (
                    <tr key={i}>
                      <td>{p.org}</td>
                      <td>{p.empCode}</td>
                      <td>{p.name}</td>
                      <td>{p.date}</td>
                      <td>{p.time}</td>
                      <td>{p.type}</td>
                      <td>{p.mode}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <span>Showing 0 to 0 of 0 entries</span>
            <div className={styles.pageControls}>
              <button className={styles.pageBtn}>&laquo;</button>
              <button className={styles.pageBtn}>&lsaquo;</button>
              <button className={`${styles.pageBtn} ${styles.active}`}>1</button>
              <button className={styles.pageBtn}>&rsaquo;</button>
              <button className={styles.pageBtn}>&raquo;</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
