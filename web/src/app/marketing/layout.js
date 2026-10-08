'use client';
import React from 'react';
import MarketingSidebar from '../../components/MarketingSidebar';
import TopHeader from '../../components/TopHeader';
import './layout.css';
import './marketing.css';
import ProjectRoutePermissionGate from '@/components/ProjectRoutePermissionGate';

export default function MarketingLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className={`marketing-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <MarketingSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className={`marketing-main ${isCollapsed ? 'collapsed' : ''}`}>
        <div style={{ padding: '24px 24px 0 24px', background: 'var(--bg-primary, #f8fafc)' }}>
          <TopHeader title="Marketing Dashboard" />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minWidth: 0 }} className="custom-horizontal-scrollbar">
          <ProjectRoutePermissionGate>{children}</ProjectRoutePermissionGate>
        </div>
      </div>
    </div>
  );
}
