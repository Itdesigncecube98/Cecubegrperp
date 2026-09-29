'use client';
import React from 'react';
import PurchaseSidebar from '../../components/PurchaseSidebar';
import TopHeader from '../../components/TopHeader';
import './layout.css';
import './purchase.css';
import ProjectRoutePermissionGate from '../../components/ProjectRoutePermissionGate';

export default function PurchaseLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className={`purchase-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <PurchaseSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className={`purchase-main ${isCollapsed ? 'collapsed' : ''}`}>
        <div style={{ padding: '24px 24px 0 24px', background: 'var(--bg-primary, #f8fafc)' }}>
          <TopHeader title="Purchase Management" />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minWidth: 0 }} className="custom-horizontal-scrollbar">
          <ProjectRoutePermissionGate>{children}</ProjectRoutePermissionGate>
        </div>
      </div>
    </div>
  );
}
