'use client';
import React from 'react';
import { Search, RefreshCw, CheckSquare } from 'lucide-react';

export default function AppraisalConfiguration() {
  const mockData = [
    { id: 1, name: 'Abhijit Chatterjee', qset: 'test', pos: 'Manager -E&C', dept: 'General Administration', appAssign: 'Not Approved', self: 'Pending', appName: 'Sanjay Kumar Arora', appStatus: 'Pending', revName: 'Anoop Singh', revStatus: 'Pending' },
    { id: 2, name: 'Kushal Yadav', qset: 'test', pos: 'Manager', dept: 'General Administration', appAssign: 'Not Approved', self: 'Pending', appName: 'Anju Singh', appStatus: 'Pending', revName: 'Anoop Singh', revStatus: 'Pending' },
    { id: 3, name: 'Nisha Yadav', qset: 'test', pos: 'Manager', dept: 'General Administration', appAssign: 'Not Approved', self: 'Pending', appName: 'Anju Singh', appStatus: 'Pending', revName: 'Anoop Singh', revStatus: 'Pending' },
    { id: 4, name: 'Prem Mishra', qset: 'test', pos: 'Manager', dept: 'General Administration', appAssign: 'Not Approved', self: 'Pending', appName: 'Anju Singh', appStatus: 'Pending', revName: 'Anoop Singh', revStatus: 'Pending' }
  ];

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <div className="filter-group">
          <label>Appraisal <span style={{ color: 'red' }}>*</span></label>
          <select><option>Test ={'>'} 16 Jun 2025 - 30 Jun 2025</option></select>
        </div>
        <div className="filter-group">
          <label>Department</label>
          <select><option>General Administration</option></select>
        </div>
        <div className="filter-group">
          <label>Grade</label>
          <select><option>Manager</option></select>
        </div>
        <div className="filter-group">
          <label>Sub Grade</label>
          <select><option>M-5</option></select>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--app-glass-border)', paddingBottom: '1.5rem' }}>
        <div className="filter-group" style={{ maxWidth: '300px' }}>
          <label>Employment Type</label>
          <select><option>Select</option></select>
        </div>

        <div className="filter-actions" style={{ alignItems: 'flex-end', paddingBottom: '2px' }}>
          <button className="btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <RefreshCw size={16} /> Reset
          </button>
          <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Search size={16} /> Search
          </button>
        </div>
      </div>

      <div className="action-bar" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#0891b2' }}>
          <CheckSquare size={16} /> Apply Question Set
        </button>

        <div className="pagination-controls">
          <span>Show Rows:</span>
          <select defaultValue="40"><option>40</option><option>100</option></select>
          <span>Page: 1 of 1</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn-outline">Go</button>
            <button className="btn-outline" disabled>{'<<'}</button>
            <button className="btn-outline" disabled>{'<'}</button>
            <button className="btn-primary">1</button>
            <button className="btn-outline" disabled>{'>'}</button>
            <button className="btn-outline" disabled>{'>>'}</button>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--app-glass-border)', borderRadius: '12px' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}><input type="checkbox" /></th>
              <th>Name</th>
              <th>Question Set</th>
              <th>Position</th>
              <th>Department</th>
              <th>Appraisal Assignment</th>
              <th>Self Appraisal</th>
              <th>Appraiser Name</th>
              <th>Appraisal Status</th>
              <th>Reviewer Name</th>
              <th>Reviewer Status</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map(row => (
              <tr key={row.id}>
                <td style={{ textAlign: 'center' }}><input type="checkbox" /></td>
                <td style={{ fontWeight: '500' }}>{row.name}</td>
                <td>{row.qset}</td>
                <td>{row.pos}</td>
                <td>{row.dept}</td>
                <td>{row.appAssign}</td>
                <td>{row.self}</td>
                <td>{row.appName}</td>
                <td>{row.appStatus}</td>
                <td>{row.revName}</td>
                <td>{row.revStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
