'use client';
import React from 'react';
import { Building2, BookOpen, Wallet, TrendingUp } from 'lucide-react';

export default function AccountsDashboard() {
  const cardStyle = {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  };

  const titleStyle = {
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const valueStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#0f172a'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#0f172a' }}>Accounts Dashboard</h1>
        <p style={{ color: '#64748b', marginTop: '8px' }}>Overview of your accounts module and masters.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div style={cardStyle}>
          <div style={titleStyle}>
            <span>Total Companies</span>
            <Building2 size={16} />
          </div>
          <div style={valueStyle}>12</div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>+2 from last month</p>
        </div>
        
        <div style={cardStyle}>
          <div style={titleStyle}>
            <span>Chart of Accounts</span>
            <BookOpen size={16} />
          </div>
          <div style={valueStyle}>145</div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>+12 new entries</p>
        </div>

        <div style={cardStyle}>
          <div style={titleStyle}>
            <span>Cost Centers</span>
            <Wallet size={16} />
          </div>
          <div style={valueStyle}>24</div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Active centers</p>
        </div>

        <div style={cardStyle}>
          <div style={titleStyle}>
            <span>Monthly Expenses</span>
            <TrendingUp size={16} />
          </div>
          <div style={valueStyle}>₹2.4M</div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>+4% from last month</p>
        </div>
      </div>
    </div>
  );
}
