'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Download } from 'lucide-react';
import { exportToCSV } from '../../../../lib/exportUtils';
import ReportFilters, { useReportFilters } from '../../../../components/ReportFilters';
import '../../attendance/attendance.css';
import '../reports.css';

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

export default function TeamNightPunchesDayWiseReport() {
  const [employee, setEmployee] = useState(null);
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [filters, setFilters] = useState({
    startDate: firstDayOfMonth,
    endDate: today,
    employee: 'Any'
  });

  const [punches, setPunches] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const reportFilters = useReportFilters();

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (empData) setEmployee(JSON.parse(empData));
    
    // Fetch employees for dropdown
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => setEmployeesList(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      fetchPunches();
    }
  }, [filters.startDate, filters.endDate]);

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
              const isNightTime = (timeStr) => {
                if (!timeStr) return false;
                return timeStr > '19:00' || timeStr <= '08:00';
              };

              if (slot.in && isNightTime(slot.in)) {
                allPunches.push({
                  empCode: myRecord.employee.empId || '-',
                  name: myRecord.employee.name,
                  date: date,
                  time: slot.in,
                  type: 'IN',
                });
              }
              if (slot.out && isNightTime(slot.out)) {
                allPunches.push({
                  empCode: myRecord.employee.empId || '-',
                  name: myRecord.employee.name,
                  date: date,
                  time: slot.out,
                  type: 'OUT',
                });
              }
            });
          }
        });
      }));
      
      setPunches(allPunches);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Group by date
  const filteredPunches = reportFilters.applyFilters(
    punches.filter(p => filters.employee === 'Any' || p.empCode === filters.employee),
    (row) => ({ name: row.name, empId: row.empCode, siteOffice: null, department: null })
  );
  
  const groupedByDate = {};
  filteredPunches.forEach(p => {
    if (!groupedByDate[p.date]) {
      groupedByDate[p.date] = [];
    }
    groupedByDate[p.date].push(p);
  });

  return (
    <div className="pageContainer">
      <div className="pageHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard/reports" className="backBtn">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="pageTitle" style={{ margin: 0 }}>Team Night Punches (Day-Wise)</h1>
        </div>
        <button 
          className="btn-primary" 
          style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }} 
          onClick={() => {
            const rows = [];
            Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a)).forEach(dateKey => {
              const dayPunches = groupedByDate[dateKey];
              const empMap = {};
              dayPunches.forEach(dp => {
                const k = `${dp.empCode} - ${dp.name}`;
                if(!empMap[k]) empMap[k] = [];
                empMap[k].push(dp);
              });
              Object.keys(empMap).sort().forEach(emp => {
                const punchTimes = empMap[emp].map(p => `${p.time} (${p.type})`).join(', ');
                rows.push({
                  Date: dateKey,
                  Employee: emp,
                  Punches: punchTimes
                });
              });
            });
            exportToCSV('team-night-punches-day-wise.csv', rows);
          }}
        >
          <Download size={16} /> Export
        </button>
      </div>

      <div className="filtersRow card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <ReportFilters {...reportFilters} style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '0.5rem' }} />
        <div className="filterGroup" style={{ flex: 1, minWidth: '200px' }}>
          <label className="filterLabel">Start Date</label>
          <input 
            type="date" 
            className="filterInput"
            value={filters.startDate}
            onChange={e => setFilters({...filters, startDate: e.target.value})}
          />
        </div>
        <div className="filterGroup" style={{ flex: 1, minWidth: '200px' }}>
          <label className="filterLabel">End Date</label>
          <input 
            type="date" 
            className="filterInput"
            value={filters.endDate}
            onChange={e => setFilters({...filters, endDate: e.target.value})}
          />
        </div>
      </div>

      {loading ? (
        <div className="loadingState">Fetching report data...</div>
      ) : (
        <div className="tableContainer glass-panel" style={{ marginTop: '1.5rem' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Total Night Punches</th>
                <th>Punch Details (Employee-wise)</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedByDate).length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>No night punches found in this date range.</td>
                </tr>
              ) : (
                Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a)).map(dateKey => {
                  const dayPunches = groupedByDate[dateKey];
                  
                  // Group day punches by employee so it's easier to read
                  const empMap = {};
                  dayPunches.forEach(dp => {
                    const k = `${dp.empCode} - ${dp.name}`;
                    if(!empMap[k]) empMap[k] = [];
                    empMap[k].push(dp);
                  });

                  return (
                    <tr key={dateKey}>
                      <td style={{ fontWeight: '600' }}>{dateKey}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}>
                          {dayPunches.length} Punches
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {Object.keys(empMap).sort().map(empKey => (
                            <div key={empKey} style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                              <span style={{ fontWeight: 600, color: '#334155' }}>{empKey}</span>
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '4px', flexWrap: 'wrap' }}>
                                {empMap[empKey].sort((a, b) => a.time.localeCompare(b.time)).map((p, idx) => (
                                  <span key={idx} style={{ 
                                    padding: '2px 6px', 
                                    borderRadius: '12px', 
                                    background: p.type === 'IN' ? '#dcfce7' : '#fee2e2', 
                                    color: p.type === 'IN' ? '#16a34a' : '#ef4444' 
                                  }}>
                                    {p.time} ({p.type})
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
