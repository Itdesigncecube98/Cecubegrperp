'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Download } from 'lucide-react';
import { exportToCSV } from '../../../../lib/exportUtils';
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

export default function TeamNightPunchesEmployeeWiseReport() {
  const [employee, setEmployee] = useState(null);
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [filters, setFilters] = useState({
    startDate: firstDayOfMonth,
    endDate: today,
  });

  const [punches, setPunches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const empData = sessionStorage.getItem('employeeData');
    if (empData) setEmployee(JSON.parse(empData));
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

  // Group by employee
  const groupedByEmployee = {};
  punches.forEach(p => {
    const key = `${p.empCode} - ${p.name}`;
    if (!groupedByEmployee[key]) {
      groupedByEmployee[key] = [];
    }
    groupedByEmployee[key].push(p);
  });

  return (
    <div className="pageContainer">
      <div className="pageHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard/reports" className="backBtn">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="pageTitle" style={{ margin: 0 }}>Team Night Punches (Employee-Wise)</h1>
        </div>
        <button 
          className="btn-primary" 
          style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }} 
          onClick={() => {
            const rows = [];
            Object.keys(groupedByEmployee).sort().forEach(empKey => {
              const empPunches = groupedByEmployee[empKey];
              empPunches.sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                return a.time.localeCompare(b.time);
              });
              const punchDetails = empPunches.map(p => `${p.date}: ${p.time} (${p.type})`).join(' | ');
              rows.push({
                Employee: empKey,
                'Total Night Punches': empPunches.length,
                'Punch Details': punchDetails
              });
            });
            exportToCSV('team-night-punches-employee-wise.csv', rows);
          }}
        >
          <Download size={16} /> Export
        </button>
      </div>

      <div className="filtersRow card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
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
                <th>Employee</th>
                <th>Total Night Punches</th>
                <th>Punch Details</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedByEmployee).length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>No night punches found in this date range.</td>
                </tr>
              ) : (
                Object.keys(groupedByEmployee).sort().map(empKey => {
                  const empPunches = groupedByEmployee[empKey];
                  empPunches.sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date);
                    return a.time.localeCompare(b.time);
                  });
                  return (
                    <tr key={empKey}>
                      <td style={{ fontWeight: '600' }}>{empKey}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}>
                          {empPunches.length} Punches
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {empPunches.map((p, idx) => (
                            <div key={idx} style={{ fontSize: '0.8rem', padding: '4px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                              <span style={{ fontWeight: 600, color: '#475569' }}>{p.date}</span>: 
                              <span style={{ marginLeft: '4px', color: p.type === 'IN' ? '#16a34a' : '#ef4444' }}>
                                {p.time} ({p.type})
                              </span>
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
