'use client';
import React from 'react';
import AccountsSidebar from '../../components/AccountsSidebar';
import TopHeader from '../../components/TopHeader';
import './layout.css';
import './accounts.css';

export default function AccountsLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className={`acc-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AccountsSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className={`acc-main ${isCollapsed ? 'collapsed' : ''}`}>
        <div style={{ padding: '24px 24px 0 24px', background: 'var(--bg-primary, #f8fafc)' }}>
          <TopHeader title="Accounts & Finance" />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minWidth: 0 }} className="custom-horizontal-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
