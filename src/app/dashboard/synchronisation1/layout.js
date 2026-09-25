'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './synchronisation.css';

export default function SynchronisationLayout({ children }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Admins', path: '/dashboard/synchronisation1/admins' },
    { name: 'Departments', path: '/dashboard/synchronisation1/org-sync?tab=departments' },
    { name: 'Branches', path: '/dashboard/synchronisation1/org-sync?tab=branches' },
    { name: 'Site Offices', path: '/dashboard/synchronisation1/org-sync?tab=siteoffices' },
    { name: 'Organizations', path: '/dashboard/synchronisation1/org-sync?tab=organizations' },
    { name: 'Designations', path: '/dashboard/synchronisation1/org-sync?tab=designations' },
    { name: 'Grades', path: '/dashboard/synchronisation1/org-sync?tab=grades' },
    { name: 'Imprest Heads', path: '/dashboard/synchronisation1/org-sync?tab=imprestheads' },
    { name: 'Imprest Types', path: '/dashboard/synchronisation1/org-sync?tab=impresttypes' },
    { name: 'Imprest Workflow', path: '/dashboard/synchronisation1/org-sync?tab=imprestworkflow' },
    { name: 'Bonus/Incentive Setup', path: '/dashboard/synchronisation1/bonus-incentive-setup' },
    { name: 'Gratuity Setup', path: '/dashboard/synchronisation1/gratuity-setup' },
    { name: 'Leaving Reasons', path: '/dashboard/synchronisation1/leaving-reasons' },
    { name: 'Doc Workflow Config', path: '/dashboard/synchronisation1/doc-workflow' },
    { name: 'HR Docs Placeholders', path: '/dashboard/synchronisation1/hrdocs-placeholders' },
  ];

  return (
    <div className="sync-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Synchronisation 1</h1>
          <p className="page-subtitle">Configure master data like Bank Names and Weekoff Types.</p>
        </div>
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

      <div className="sync-content">
        {children}
      </div>
    </div>
  );
}
