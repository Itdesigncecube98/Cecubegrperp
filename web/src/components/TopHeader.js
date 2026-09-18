import React from 'react';
import { Layers } from 'lucide-react';

export default function TopHeader({ title }) {
  return (
    <div className="top-header" style={{
      marginBottom: '1.5rem',
      padding: '0.75rem 1.25rem',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'linear-gradient(to right, #ffffff, #f8fafc)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{
          padding: '8px',
          backgroundColor: '#eff6ff',
          borderRadius: '8px',
          color: '#3b82f6'
        }}>
          <Layers size={18} />
        </div>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#1e293b',
            letterSpacing: '-0.01em'
          }}>
            {title}
          </h1>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
            Active Module
          </p>
        </div>
      </div>
    </div>
  );
}
