'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import styles from '../punches.module.css';

export default function MobileCheckinPage() {
  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('My');
  
  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (empData) setEmployee(JSON.parse(empData));
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({
    startDate: '2026-07-29', // Matching the image's example date
    endDate: today,
    locationType: 'Any',
    entityName: 'Any',
    viewType: 'Detail View'
  });

  const [records, setRecords] = useState([]);

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <Link href="/dashboard" className={styles.backLink}>
          <ChevronLeft size={16} /> Back
        </Link>
        <div style={{ fontSize: '14px', fontWeight: 500, color: '#334155' }}>
          Mobile Checkin Report
        </div>
      </div>

      <div className={styles.pageHeader} style={{ padding: '0 24px', backgroundColor: 'white' }}>
        <div 
          className={`${styles.tab} ${activeTab === 'My' ? styles.active : ''}`}
          onClick={() => setActiveTab('My')}
        >
          My Mobile Checkin Report
        </div>
        <div 
          className={`${styles.tab} ${activeTab === 'Team' ? styles.active : ''}`}
          onClick={() => setActiveTab('Team')}
        >
          Team Mobile Checkin Report
        </div>
      </div>

      <div className={styles.contentArea}>
        {/* Filters */}
        <div className={styles.filterCard}>
          <div className={styles.filterGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Start Date</label>
              <input type="date" className={styles.filterInput} value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>End Date</label>
              <input type="date" className={styles.filterInput} value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Location Type</label>
              <select className={styles.filterSelect} value={filters.locationType} onChange={e => setFilters({...filters, locationType: e.target.value})}>
                <option value="Any">Any</option>
                <option value="Office">Office</option>
                <option value="Field">Field</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Entity Name</label>
              <select className={styles.filterSelect} value={filters.entityName} onChange={e => setFilters({...filters, entityName: e.target.value})}>
                <option value="Any">Any</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>View Type</label>
              <select className={styles.filterSelect} value={filters.viewType} onChange={e => setFilters({...filters, viewType: e.target.value})}>
                <option value="Detail View">Detail View</option>
                <option value="Summary View">Summary View</option>
              </select>
            </div>
          </div>
          <div className={styles.actionButtons}>
            <button className={styles.btnPrimary}>View</button>
            <button className={styles.btnPrimary}>Clear</button>
          </div>
        </div>

        {/* Data Table */}
        <div className={styles.tableCard} style={{ padding: '0' }}>
          {records.length === 0 ? (
            <div className={styles.emptyState} style={{ padding: '40px', backgroundColor: 'white', borderRadius: '6px' }}>
              No records found
            </div>
          ) : (
             <div className={styles.tableWrapper}>
                {/* Table implementation goes here when data is available */}
             </div>
          )}
        </div>

      </div>
    </div>
  );
}
