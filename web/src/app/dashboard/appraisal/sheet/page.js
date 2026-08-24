'use client';
import React from 'react';
import { RefreshCw, Printer } from 'lucide-react';

export default function AppraisalSheet() {
  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <div className="filter-group">
          <label>Department</label>
          <select><option>Select Here</option></select>
        </div>
        <div className="filter-group">
          <label>Grade</label>
          <select><option>Select</option></select>
        </div>
        <div className="filter-group">
          <label>SubGrade</label>
          <select><option>Select</option></select>
        </div>
        <div className="filter-group">
          <label>Employee <span style={{ color: 'red' }}>*</span></label>
          <select><option>Harmesh Kumar</option></select>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--app-glass-border)', paddingBottom: '1.5rem', alignItems: 'flex-end' }}>
        <div className="filter-group">
          <label>Report Type</label>
          <select><option>Appraisal Sheet - Summary</option></select>
        </div>
        <div className="filter-group">
          <label>Appraisal <span style={{ color: 'red' }}>*</span></label>
          <select><option>Test ={'>'} 16 Jun 2025 - 30 Jun 2025</option></select>
        </div>

        <div className="filter-actions">
          <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Printer size={16} /> Print
          </button>
          <button className="btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <RefreshCw size={16} /> Reset
          </button>
        </div>
      </div>

      <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--app-glass-border)', color: 'var(--app-text-muted)' }}>
        <Printer size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
        <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>Select an employee and appraisal to view the sheet.</p>
      </div>
    </div>
  );
}
