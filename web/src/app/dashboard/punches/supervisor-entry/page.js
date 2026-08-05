'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import styles from '../punches.module.css';

export default function SupervisorEntryPage() {
  const [employee, setEmployee] = useState(null);
  
  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (empData) setEmployee(JSON.parse(empData));
  }, []);

  const [records, setRecords] = useState([]);

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <Link href="/dashboard" className={styles.backLink}>
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>
        <div className={styles.pageHeader}>
          <div className={styles.pageTitle}>Supervisor Entry</div>
        </div>
      </div>

      <div className={styles.contentArea}>
        {/* Data Table */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <p className={styles.tableSubtitle}>The below table shows the list of rules assigned to you.</p>
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
                  <th>NAME</th>
                  <th>DESCRIPTION</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="3" className={styles.emptyState}>No data available in table</td>
                  </tr>
                ) : (
                  records.map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td>{r.description}</td>
                      <td>{r.action}</td>
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
