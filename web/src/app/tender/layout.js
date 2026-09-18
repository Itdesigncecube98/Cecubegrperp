'use client';
import React from 'react';
import TenderSidebar from '../../components/TenderSidebar';
import TopHeader from '../../components/TopHeader';
import './layout.css';
import './tender.css';

export default function TenderLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className={`tender-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <TenderSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className={`tender-main ${isCollapsed ? 'collapsed' : ''}`}>
        <div style={{ padding: '24px 24px 0 24px', background: 'var(--bg-primary, #f8fafc)' }}>
          <TopHeader title="Tender Dashboard" />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minWidth: 0 }} className="custom-horizontal-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
