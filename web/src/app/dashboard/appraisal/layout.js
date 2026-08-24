'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './appraisal.css';

export default function AppraisalLayout({ children }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Question Set Configuration', path: '/dashboard/appraisal/question-set' },
    { name: 'Appraisal Process', path: '/dashboard/appraisal/process' },
    { name: 'Appraisal Configuration', path: '/dashboard/appraisal/configuration' },
    { name: 'Appraisal Summary', path: '/dashboard/appraisal/summary' },
    { name: 'Appraisal Sheet', path: '/dashboard/appraisal/sheet' }
  ];

  return (
    <div className="app-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Appraisal</h1>
          <p className="page-subtitle">Manage employee appraisals, question sets, and processes.</p>
        </div>
      </div>
      
      <div className="tabs-container">
        {tabs.map(tab => (
          <Link 
            key={tab.path} 
            href={tab.path}
            className={`tab-link ${pathname === tab.path ? 'active' : ''}`}
          >
            {tab.name}
          </Link>
        ))}
      </div>

      <div className="app-content">
        {children}
      </div>
    </div>
  );
}
