'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './payroll.css';

export default function PayrollLayout({ children }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Pay Cycle', path: '/dashboard/payroll/pay-cycle' },
    { name: 'Salary Calculation', path: '/dashboard/payroll/salary-calculation' },
    { name: 'Arrears Calculation', path: '/dashboard/payroll/arrears-calculation' },
    { name: 'Bonus/Incentive', path: '/dashboard/payroll/bonus-incentive' },
    { name: 'Gratuity', path: '/dashboard/payroll/gratuity' },
    { name: 'Post Salary', path: '/dashboard/payroll/post-salary' }
  ];

  return (
    <div className="payroll-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll Management</h1>
          <p className="page-subtitle">Manage pay cycles, salary, arrears, and more.</p>
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

      <div className="payroll-content">
        {children}
      </div>
    </div>
  );
}
