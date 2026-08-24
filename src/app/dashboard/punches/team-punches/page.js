'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import styles from '../punches.module.css';

function getDaysInRange(startDate, endDate) {
  const days = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    days.push(new Date(cur).toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export default function TeamPunchesPage() {
  const searchParams = useSearchParams();
  const [employee, setEmployee] = useState(null);
  const today = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({
    organization: 'Cecube Engineering India Pvt Ltd',
    employee: 'Any',
    startDate: today,
    endDate: today,
    modeOfEntry: 'Any',
    punchType: 'Any',
    viewType: 'Compact View'
  });

  const [punches, setPunches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (empData) setEmployee(JSON.parse(empData));
  }, []);

  useEffect(() => {
    const employeeCode = searchParams.get('employeeCode');
    if (employeeCode) {
      setFilters(prev => ({ ...prev, employee: employeeCode }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      fetchPunches();
    }
  }, [filters.startDate, filters.endDate, filters.employee]);

  const fetchPunches = async () => {
    setLoading(true);
    try {
      const dates = getDaysInRange(filters.startDate, filters.endDate);
      const allPunches = [];

      await Promise.all(dates.map(async (date) => {
        const res = await fetch(`/api/attendance?date=${date}`);
        const data = await res.json();
        
        data.forEach(myRecord => {
          if (myRecord && myRecord.timeSlots) {
            let slots = [];
            try {
              slots = JSON.parse(myRecord.timeSlots);
            } catch(e){}

            slots.forEach(slot => {
              if (slot.in) {
                allPunches.push({
                  org: 'Cecube Engineering India Pvt Ltd',
                  empCode: myRecord.employee.empId || '-',
                  name: myRecord.employee.name,
                  date: date,
                  time: slot.in,
                  type: 'IN',
                  mode: 'Web'
                });
              }
              if (slot.out) {
                allPunches.push({
                  org: 'Cecube Engineering India Pvt Ltd',
                  empCode: myRecord.employee.empId || '-',
                  name: myRecord.employee.name,
                  date: date,
                  time: slot.out,
                  type: 'OUT',
                  mode: 'Web'
                });
              }
            });
          }
        });
      }));
      
      // Sort punches by date and time descending
      allPunches.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
      });

      setPunches(allPunches);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPunches = punches.filter(p => {
    if (filters.employee !== 'Any' && p.empCode !== filters.employee) return false;
    if (filters.punchType !== 'Any' && p.type !== filters.punchType) return false;
    if (filters.modeOfEntry !== 'Any' && p.mode !== filters.modeOfEntry) return false;
    return true;
  });

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
            <button className={styles.btnPrimary} onClick={fetchPunches}>View</button>
            <button className={styles.btnPrimary} onClick={() => setFilters({...filters, startDate: today, endDate: today, punchType: 'Any', modeOfEntry: 'Any'})}>Clear</button>
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
                {loading ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyState}>Loading team punches...</td>
                  </tr>
                ) : filteredPunches.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyState}>No data available in table</td>
                  </tr>
                ) : (
                  filteredPunches.map((p, i) => (
                    <tr key={i}>
                      <td>{p.org}</td>
                      <td>{p.empCode}</td>
                      <td>{p.name}</td>
                      <td>{p.date}</td>
                      <td>{p.time}</td>
                      <td><span style={{color: p.type === 'IN' ? '#16a34a' : '#dc2626', fontWeight: 600}}>{p.type}</span></td>
                      <td>{p.mode}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <span>Showing {filteredPunches.length > 0 ? 1 : 0} to {filteredPunches.length} of {filteredPunches.length} entries</span>
            <div className={styles.pageControls}>
              <button className={styles.pageBtn} disabled>&laquo;</button>
              <button className={styles.pageBtn} disabled>&lsaquo;</button>
              <button className={`${styles.pageBtn} ${styles.active}`}>1</button>
              <button className={styles.pageBtn} disabled>&rsaquo;</button>
              <button className={styles.pageBtn} disabled>&raquo;</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
