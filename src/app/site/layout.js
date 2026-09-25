'use client';
import React from 'react';
import SiteSidebar from '../../components/SiteSidebar';
import TopHeader from '../../components/TopHeader';
import '../engineering/layout.css';

export default function SiteLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  return (
    <div className={`engineering-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <SiteSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className={`engineering-main ${isCollapsed ? 'collapsed' : ''}`}>
        <div style={{ padding: '24px 24px 0 24px', background: '#f8fafc' }}><TopHeader title="Site Management" /></div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minWidth: 0 }} className="custom-horizontal-scrollbar">{children}</div>
      </div>
    </div>
  );
}
