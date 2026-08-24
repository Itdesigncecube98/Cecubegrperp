'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, redirect } from 'next/navigation';

export default function DocGeneratorLayout({ children }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Doc Builder', path: '/dashboard/doc-generator/builder' },
    { name: 'Doc Approvals', path: '/dashboard/doc-generator/submissions' }
  ];

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Doc Generator</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Manage document templates and approve employee requests.</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        {tabs.map((tab) => (
          <Link
            key={tab.path}
            href={tab.path}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
              background: pathname === tab.path ? '#0ea5e9' : 'transparent',
              color: pathname === tab.path ? '#fff' : '#64748b',
              transition: 'all 0.2s'
            }}
          >
            {tab.name}
          </Link>
        ))}
      </div>

      <div style={{ background: 'transparent' }}>
        {children}
      </div>
    </div>
  );
}
