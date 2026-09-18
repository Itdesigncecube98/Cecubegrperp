'use client';
import React from 'react';
import EngineeringSidebar from '../../components/EngineeringSidebar';
import { Bell, User, Paintbrush } from 'lucide-react';
import TopHeader from '../../components/TopHeader';
import './layout.css';

export default function EngineeringLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className={`engineering-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <EngineeringSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className={`engineering-main ${isCollapsed ? 'collapsed' : ''}`}>
        <div style={{ padding: '24px 24px 0 24px', background: 'var(--bg-primary, #f8fafc)' }}>
          <TopHeader title="Engineering Dashboard" />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minWidth: 0 }} className="custom-horizontal-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
