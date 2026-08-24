'use client';
import React, { useState } from 'react';
import { Search, UserPlus, Users, Edit2, Home, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import '../../contracting.css';

export default function LabourList() {
  const [labours] = useState([
    { code: '2', name: 'Kanhaiya Lal Kushwah', status: 'Working', esi: '6933278219', pf: '', wages: '650' },
    { code: '1', name: 'Ravi Kushwaha', status: 'Working', esi: '6933278196', pf: '', wages: '700' },
  ]);

  return (
    <div className="contracting-container">
      
      <div className="contracting-header">
        <div className="contracting-header-title">
          <Users size={18} />
          Labour List
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#666', gap: '4px' }}>
          <Home size={14} /> Home <ChevronRight size={14} /> Labour List
        </div>
      </div>

      <div className="contracting-actions-bar">
        <div className="contracting-filters">
          <input type="text" className="contracting-input" placeholder="Search..." />
          <Search size={20} color="#666" style={{ cursor: 'pointer', marginLeft: '4px' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/contracting/contractors/labour-master/add-labour">
            <button className="btn-cyan"><UserPlus size={14} /> Add Labour</button>
          </Link>
        </div>
      </div>

      <div className="contracting-table-wrapper">
        <table className="contracting-table">
          <thead>
            <tr>
              <th>Employee Code</th>
              <th>Labour Name</th>
              <th>Employee Status</th>
              <th>ESI No</th>
              <th>PF NO</th>
              <th style={{ textAlign: 'right' }}>Daily Wages</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {labours.map(l => (
              <tr key={l.code}>
                <td>{l.code}</td>
                <td>{l.name}</td>
                <td>{l.status}</td>
                <td>{l.esi}</td>
                <td>{l.pf}</td>
                <td style={{ textAlign: 'right' }}>{l.wages}</td>
                <td style={{ textAlign: 'center' }}>
                  <Link href="/contracting/contractors/labour-master/add-labour">
                    <Edit2 size={14} className="action-icon" />
                  </Link>
                </td>
              </tr>
            ))}
            {labours.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: '#999' }}>No data available in table</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
