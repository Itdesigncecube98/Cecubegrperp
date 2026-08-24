'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';
import '../synchronisation1/synchronisation.css';

export default function Synchronisation2Layout({ children }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Head Types', path: '/dashboard/synchronisation2/head-types' },
    { name: 'Salary Heads', path: '/dashboard/synchronisation2/salary-heads' },
    { name: 'Advance Application', path: '/dashboard/synchronisation2/advance-application' },
    { name: 'Bank Names', path: '/dashboard/synchronisation2/bank-names' },
    { name: 'Weekoff Types', path: '/dashboard/synchronisation2/weekoff-types' },
    { name: 'Leave Type', path: '/dashboard/synchronisation2/leave-type' },
    { name: 'Muster Status', path: '/dashboard/synchronisation2/muster-status' },
    { name: 'Shift', path: '/dashboard/synchronisation2/shift' },
    { name: 'Document Types', path: '/dashboard/synchronisation2/document-types' },
    { name: 'LTA Setup', path: '/dashboard/synchronisation2/lta-setup' },
    { name: 'TDS Category', path: '/dashboard/synchronisation2/tds-category' },
    { name: 'PF/NSSF Setup', path: '/dashboard/synchronisation2/pf-nssf-setup' },
    { name: 'Issuing Authority', path: '/dashboard/synchronisation2/issuing-authority' },
    { name: 'Skills', path: '/dashboard/synchronisation2/skills' },
  ];

  return (
    <div className="synchronisation-layout">
      {/* Header & Tabs */}
      <div className="synchronisation-header hide-on-print">
        <div style={{ padding: '24px 32px 16px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg,#ec4899,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                Synchronization 2
              </h1>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
                Manage Salary Heads and Advance Applications
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="synchronisation-tabs" style={{ padding: '0 32px' }}>
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
            {tabs.map((tab) => {
              const isActive = pathname === tab.path || (tab.path.includes('?') && pathname.includes(tab.path.split('?')[0]));
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  style={{
                    padding: '12px 20px',
                    color: isActive ? '#db2777' : '#64748b',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    borderBottom: isActive ? '2px solid #db2777' : '2px solid transparent',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    fontSize: '14px'
                  }}
                >
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="synchronisation-content">
        {children}
      </div>
    </div>
  );
}
