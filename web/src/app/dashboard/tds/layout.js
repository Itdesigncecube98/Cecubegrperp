'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './tds.css';

export default function TDSLayout({ children }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Tax Slab', path: '/dashboard/tds/tax-slab' },
    { name: 'TDS Heads & Rules', path: '/dashboard/tds/heads-rules' },
    { name: 'Assign TDS rules', path: '/dashboard/tds/assign-rules' },
    { name: 'Income/Investment Declaration', path: '/dashboard/tds/declaration' },
    { name: 'Income Tax Calculations', path: '/dashboard/tds/tax-calculations' },
    { name: 'TDS Monthly Chart', path: '/dashboard/tds/monthly-chart' },
  ];

  return (
    <div className="tds-container">
      <div className="page-header">
        <h1 className="page-title">TDS Management</h1>
        <p className="page-subtitle">Configure Tax Slabs, TDS Rules, and process Income/Investment Declarations.</p>
      </div>

      <div className="tabs-container">
        {tabs.map((tab) => (
          <Link
            key={tab.path}
            href={tab.path}
            className={`tab-link ${pathname === tab.path ? 'active' : ''}`}
          >
            {tab.name}
          </Link>
        ))}
      </div>

      <div className="tds-content">
        {children}
      </div>
    </div>
  );
}
