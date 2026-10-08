'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MapPin, ChevronDown, ChevronRight, ChevronLeft,
  Layers, LogOut, Search, X, Sparkles
} from 'lucide-react';
import Dialog from './Dialog';
import { usePermissions } from '../context/PermissionsContext';
import './sidebar.css';

const menuConfig = [
  {
    id: 'site',
    label: 'Site Management',
    icon: MapPin,
    items: [
      { name: 'Site Dashboard',         path: '/site/dashboard',       permissionCode: 'SITE_DASHBOARD' },
      { name: 'Daily Progress (DPR)',   path: '/site/dpr',             permissionCode: 'SITE_DPR' },
      { name: 'Work Completion',        path: '/site/work-completion', permissionCode: 'SITE_WORK_COMPLETION' },
      { name: 'Material Requisition',   path: '/site/material',        permissionCode: 'SITE_MATERIAL_REQUISITION' },
      { name: 'GTN (Testing Note)',     path: '/site/material/gtn',    permissionCode: 'SITE_GTN' },
      { name: 'GRN Register',           path: '/site/material/grn',    permissionCode: 'SITE_GRN' },
      { name: 'Site Store',             path: '/site/store',           permissionCode: 'SITE_STORE' },
      { name: 'Task Status',            path: '/site/task-status',     permissionCode: 'SITE_TASK_STATUS' },
      { name: 'Quality & Safety',       path: '/site/quality',         permissionCode: 'SITE_QUALITY' },
    ],
  },
];

export default function SiteSidebar({ isCollapsed: propCollapsed, setIsCollapsed: propSetIsCollapsed }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWidget, setShowWidget] = useState(true);
  const { hasRight, activeEmployee } = usePermissions();
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isCollapsed = propCollapsed !== undefined ? propCollapsed : localCollapsed;
  const setIsCollapsed = propSetIsCollapsed || setLocalCollapsed;
  const [expanded, setExpanded] = useState({ site: true });

  const visibleMenuConfig = useMemo(() =>
    menuConfig
      .map(g => ({ ...g, items: g.items.filter(i => !activeEmployee || hasRight(i.permissionCode)) }))
      .filter(g => g.items.length > 0),
  [activeEmployee, hasRight]);

  const allItems = useMemo(() =>
    visibleMenuConfig.flatMap(g => g.items.map(i => ({ ...i, groupIcon: g.icon }))),
  [visibleMenuConfig]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return q ? allItems.filter(i => i.name.toLowerCase().includes(q)) : null;
  }, [searchQuery, allItems]);

  const confirmLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}); sessionStorage.clear(); for (const key of ['employeeData', 'activeEmp', 'activeProj']) localStorage.removeItem(key); router.push('/login'); };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand' : 'Collapse'} aria-label="Toggle sidebar">
        {isCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
      </div>

      <div className="sidebar-header">
        <Link href="/site/dashboard" className="sidebar-brand-wrapper">
          <div className="sidebar-logo-container">
            <img src="/logo.png" alt="CeCube" className="sidebar-logo-img" />
          </div>
          {!isCollapsed && (
            <div className="sidebar-brand-info">
              <div className="sidebar-brand-name"><span>Site Management</span></div>
              <div className="sidebar-brand-sub"><span>🏚️ Site Execution</span></div>
            </div>
          )}
        </Link>
        {!isCollapsed && (
          <button className="sidebar-header-btn" title="Switch Module" onClick={() => router.push('/portal')}>
            <Layers size={14} />
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="sidebar-search-box">
          <div className="sidebar-search-inner">
            <Search size={14} color="#64748b" />
            <input type="text" placeholder="Search site..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} className="sidebar-search-input" />
            {searchQuery
              ? <X size={12} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
              : <span className="sidebar-search-kbd">⌘K</span>}
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        <Link href="/portal" className="nav-item" title="Switch Module">
          <div className="nav-item-left"><Layers size={17} /><span>Switch Module</span></div>
        </Link>

        {filteredItems ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredItems.length === 0
              ? <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>No results</div>
              : filteredItems.map(item => {
                const Icon = item.groupIcon;
                const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
                return (
                  <Link key={item.path} href={item.path} className={`nav-item ${active ? 'active' : ''}`} title={item.name}>
                    <div className="nav-item-left"><Icon size={17} /><span>{item.name}</span></div>
                  </Link>
                );
              })}
          </div>
        ) : (
          visibleMenuConfig.map(section => {
            const Icon = section.icon;
            const isOpen = expanded[section.id];
            const hasActive = section.items.some(i => pathname === i.path || pathname.startsWith(`${i.path}/`));
            return (
              <div key={section.id} style={{ marginTop: '2px' }}>
                <div className={`nav-item ${hasActive ? 'active' : ''}`}
                  onClick={() => setExpanded(p => ({ ...p, [section.id]: !p[section.id] }))}
                  title={section.label} style={{ cursor: 'pointer' }}>
                  <div className="nav-item-left"><Icon size={17} /><span>{section.label}</span></div>
                  {!isCollapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="group-badge-count">{section.items.length}</span>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  )}
                </div>
                {!isCollapsed && isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '1px' }}>
                    {section.items.map(item => {
                      const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
                      return (
                        <Link key={item.path} href={item.path} className={`nav-subitem ${active ? 'active' : ''}`} title={item.name}>
                          <div className="nav-subitem-bullet" /><span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      <div className="sidebar-footer">
        {!isCollapsed && showWidget && (
          <div className="sidebar-widget-card">
            <div className="sidebar-widget-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={13} /> Site Alert
              </span>
              <button className="sidebar-widget-close" onClick={() => setShowWidget(false)} title="Dismiss"><X size={12} /></button>
            </div>
            <div className="sidebar-widget-text">Keep daily progress reports updated before EOD.</div>
          </div>
        )}
        <div className="sidebar-user-row">
          <div className="sidebar-user-left">
            <div className="sidebar-avatar-wrapper">
              <div className="sidebar-avatar" style={{ background: '#0284c7' }}><span>S</span></div>
              <span className="sidebar-online-dot" />
            </div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">Site Manager</span>
              <span className="sidebar-user-email">cecube.com</span>
            </div>
          </div>
          <button className="sidebar-logout-icon-btn" title="Sign out" onClick={() => setShowLogoutDialog(true)}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <Dialog isOpen={showLogoutDialog} type="confirm" title="Logout"
        message="Are you sure you want to logout?"
        onConfirm={confirmLogout} onCancel={() => setShowLogoutDialog(false)} />
    </aside>
  );
}
