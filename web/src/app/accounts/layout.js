'use client';
import React from 'react';
import AccountsSidebar from '@/components/AccountsSidebar';
import './layout.css';

export default function AccountsLayout({ children }) {
  return (
    <div className="accounts-layout">
      <AccountsSidebar />
      <main className="accounts-main">
        {children}
      </main>
    </div>
  );
}
