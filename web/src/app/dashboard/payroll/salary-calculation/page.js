'use client';
import React from 'react';
import { Search, RefreshCw, Calculator, Printer, FileDown } from 'lucide-react';

export default function SalaryCalculation() {
  const mockData = [
    { id: 1, empNo: 'FTC001', name: 'Karamvir Singh', position: 'Manager', location: 'METL Project Office', department: 'Operations / Projects', branch: 'Head Office', wDays: 31, leDays: 0, earning: '0.00', deduction: '0.00', net: '0.00', status: '' }
  ];

  return (
    <div>
      <div className="filter-bar">
        <div className="filter-group">
          <label>Pay Code</label>
          <select><option>July 2026</option></select>
        </div>
        <div className="filter-group">
          <label>Department</label>
          <select><option>Select Here</option></select>
        </div>
        <div className="filter-group">
          <label>Branch</label>
          <select><option>Select Here</option></select>
        </div>
        <div className="filter-group">
          <label>Location</label>
          <select><option>Select Here</option></select>
        </div>
        <div className="filter-group">
          <label>Employee</label>
          <select><option>134 all selected!</option></select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select><option>Calculate</option></select>
        </div>
      </div>

      <div className="filter-bar" style={{ marginTop: '-0.5rem' }}>
        <div className="checkbox-group">
          <input type="checkbox" id="bonus" />
          <label htmlFor="bonus">Consider Bonus & Incentive</label>
          <input type="date" value="2026-08-20" readOnly style={{ marginLeft: '0.5rem', height: '32px' }} />
          <input type="date" value="2026-08-20" readOnly style={{ marginLeft: '0.5rem', height: '32px' }} />
        </div>
        
        <div className="checkbox-group" style={{ marginLeft: '1rem' }}>
          <input type="checkbox" id="leaveEncash" />
          <label htmlFor="leaveEncash">Leave Encashment Till</label>
          <input type="date" value="2026-08-20" readOnly style={{ marginLeft: '0.5rem', height: '32px' }} />
        </div>
      </div>

      <div className="filter-bar" style={{ marginTop: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div className="checkbox-group">
          <input type="checkbox" id="tds" defaultChecked />
          <label htmlFor="tds">Consider TDS</label>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#0ea5e9' }}>
            <Calculator size={16} /> Calculate
          </button>
          <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#0ea5e9' }}>
            <Printer size={16} /> Print
          </button>
          <button className="btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderColor: 'var(--pay-primary)', color: 'var(--pay-primary)' }}>
            <FileDown size={16} /> Export To excel
          </button>
        </div>
      </div>

      <div className="summary-badges">
        <div className="summary-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>0 of 1</div>
        <div className="summary-badge" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>1 Jul 2026 - 31 Jul 2026</div>
        <div className="summary-badge green">Salary Processed : 1</div>
        <div className="summary-badge red">Total Issue: 0</div>
        <div className="summary-badge blue">Salary Remaining: 1</div>
        
        <div className="pagination-controls" style={{ marginLeft: 'auto', marginTop: 0 }}>
          <span>Show Rows:</span>
          <select defaultValue="40"><option>40</option><option>100</option></select>
          <span>Page: 1 of 1</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>Go</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>{'<<'}</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>{'<'}</button>
            <button className="btn-primary" style={{ padding: '0.25rem 0.5rem' }}>1</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>{'>'}</button>
            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem' }}>{'>>'}</button>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px 8px 0 0' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" title="Select All" /></th>
              <th>emp no</th>
              <th>name</th>
              <th>position</th>
              <th>location</th>
              <th>dept</th>
              <th>branch name</th>
              <th>workdays</th>
              <th>leavedays</th>
              <th>total earning</th>
              <th>total deduction</th>
              <th>net salary</th>
              <th>salary status</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map(row => (
              <tr key={row.id}>
                <td><input type="checkbox" /></td>
                <td>{row.empNo}</td>
                <td style={{ color: 'var(--primary-color)', fontWeight: '500' }}>{row.name}</td>
                <td>{row.position}</td>
                <td>{row.location}</td>
                <td>{row.department}</td>
                <td>{row.branch}</td>
                <td>{row.wDays}</td>
                <td>{row.leDays}</td>
                <td>{row.earning}</td>
                <td>{row.deduction}</td>
                <td>{row.net}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 8px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#0ea5e9' }}>
          <Calculator size={16} /> Calculate
        </button>
        <div style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: '600' }}>
          Total: 0.00
        </div>
      </div>
    </div>
  );
}
