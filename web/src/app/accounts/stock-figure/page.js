'use client';
import React, { useState } from 'react';
import { 
  Search, RefreshCw, Download, Printer, Home, ChevronRight, BarChart2
} from 'lucide-react';
import '../company/company.css';

export default function StockFigureMaster() {
  const [showAll, setShowAll] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="company-container">
      {/* Header Area */}
      <div className="page-header">
        <h2 className="page-title">
          <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '8px', display: 'flex', color: '#0284c7' }}>
            <BarChart2 size={24} />
          </div>
          Stock Figure
        </h2>
        <div className="breadcrumb">
          <Home size={14} /> Home <ChevronRight size={14} /> Stock Figure
        </div>
      </div>

      <div className="modern-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
        
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '300px' }}>
              <select className="modern-input modern-select" style={{ fontSize: '0.875rem' }}>
                <option>Search Account</option>
              </select>
            </div>
            <button className="btn-primary" style={{ padding: '0.625rem 1rem' }} onClick={() => alert('Resetting search...')}>
              <RefreshCw size={16} /> Reset
            </button>
          </div>
          
          <button className="btn-outline" onClick={() => alert('Opening Import Dialog...')}>
            <Download size={16} /> Import
          </button>
        </div>

        {/* Table Area */}
        <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table className="modern-table" style={{ width: '100%' }}>
              <thead style={{ background: '#0284c7' }}>
                <tr>
                  <th style={{ color: 'white', background: '#0284c7' }}>Account Name</th>
                  <th style={{ color: 'white', background: '#0284c7' }}>Group Name</th>
                  <th style={{ color: 'white', background: '#0284c7' }}>Opening</th>
                  <th style={{ color: 'white', background: '#0284c7' }}>Closing</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No Record
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Floating Footer Toolbar */}
      <div className="floating-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155', fontWeight: 500, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              style={{ accentColor: '#0284c7', width: '16px', height: '16px' }} 
            /> Show All
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155', fontWeight: 500, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={showDetails}
              onChange={(e) => setShowDetails(e.target.checked)}
              style={{ accentColor: '#0284c7', width: '16px', height: '16px' }} 
            /> Details
          </label>
          <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 8px' }}></div>
          <button className="btn-primary" onClick={() => window.print()} style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
            <Printer size={16} /> Print <ChevronDown size={14} style={{ marginLeft: '4px' }} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ 
            background: '#a855f7', color: 'white', padding: '10px 24px', 
            borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem',
            boxShadow: '0 2px 4px rgba(168, 85, 247, 0.2)'
          }}>
            Opening Stock:0 Dr.
          </div>
          <div style={{ 
            background: '#06b6d4', color: 'white', padding: '10px 24px', 
            borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem',
            boxShadow: '0 2px 4px rgba(6, 182, 212, 0.2)'
          }}>
            Closing Stock:0
          </div>
        </div>
      </div>
    </div>
  );
}

const ChevronDown = ({ size, style }) => (
  <svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);
