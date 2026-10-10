'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, CalendarCheck, LogOut, Shield, Settings, 
  Car, Mail, Wallet, Building2, Layers, Banknote, ClipboardList, 
  Award, FileText, ChevronRight, ChevronLeft, ChevronDown, 
  Search, Sparkles, X, ArrowUpRight, MapPin
} from 'lucide-react';
import Dialog from './Dialog';
import './sidebar.css';

const isActiveSidebarItem = (currentPath, itemPath) => {
  if (!currentPath || !itemPath) return false;

  const normalizedCurrent = currentPath.split('?')[0].split('#')[0].trim();
  const normalizedItem = itemPath.split('?')[0].split('#')[0].trim();

  if (!normalizedCurrent || !normalizedItem) return false;
  if (normalizedCurrent === normalizedItem) return true;

  const currentSegments = normalizedCurrent.split('/').filter(Boolean);
  const itemSegments = normalizedItem.split('/').filter(Boolean);

  if (itemSegments.length > 0 && currentSegments.length >= itemSegments.length) {
    const baseMatch = itemSegments.every((segment, index) => segment === currentSegments[index]);
    if (baseMatch && itemSegments[itemSegments.length - 1] !== 'dashboard') {
      return true;
    }
  }

  return false;
};

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWidget, setShowWidget] = useState(true);

  // Grouped Navigation Structure
  const [expandedSections, setExpandedSections] = useState({
    workforce: true,
    operations: true,
    reports: true
  });

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const confirmLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    sessionStorage.clear();
    for (const key of ['employeeData', 'activeEmp', 'activeProj']) localStorage.removeItem(key);
    router.push('/login');
  };

  // Main navigation items
  const mainItems = [
    { name: 'Switch Module', path: '/portal', icon: Layers, badge: null },
    { name: 'HR Dashboard', path: '/dashboard', icon: LayoutDashboard, badge: null },
  ];

  const sections = [
    {
      id: 'workforce',
      label: 'Workforce & People',
      items: [
        { name: 'Org Structure', path: '/dashboard/organization/structure', icon: Building2 },
        { name: 'Employee Master', path: '/dashboard/employees', icon: Users },
        { name: 'Candidates', path: '/dashboard/candidates', icon: Users },
        { name: 'Muster Management', path: '/dashboard/attendance', icon: CalendarCheck },
        { name: 'Payroll', path: '/dashboard/payroll', icon: Banknote },
        { name: 'TDS Management', path: '/dashboard/tds', icon: ClipboardList },
        { name: 'Appraisal', path: '/dashboard/appraisal', icon: Award },
        { name: 'Requirements', path: '/dashboard/requirements', icon: ClipboardList },
      ]
    },
    {
      id: 'operations',
      label: 'Operations & Comms',
      items: [
        { name: 'Live Tracking', path: '/dashboard/attendance/live-tracking', icon: MapPin },
        { name: 'Vehicles Expenses', path: '/dashboard/vehicles', icon: Car },
        { name: 'Email Blast', path: '/dashboard/email', icon: Mail },
        { name: 'Imprest Management', path: '/dashboard/imprest', icon: Wallet },
        { name: 'Doc Generator', path: '/dashboard/doc-generator', icon: ClipboardList },
      ]
    },
    {
      id: 'reports',
      label: 'Analytics & Docs',
      items: [
        { name: 'HR Reports', path: '/dashboard/hr-reports', icon: FileText },
        { name: 'HR Letters', path: '/dashboard/hr-docs', icon: FileText },
      ]
    }
  ];

  // Flat list for search filtering
  const allNavItems = useMemo(() => {
    const list = [...mainItems];
    sections.forEach(sec => {
      sec.items.forEach(item => list.push({ ...item, group: sec.label }));
    });
    return list;
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return allNavItems.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [searchQuery, allNavItems]);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* CHOCH (Toggle Notch on Sidebar Edge) */}
      <div 
        className="sidebar-toggle-btn" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expand Sidebar (Choch)" : "Collapse Sidebar (Choch)"}
        aria-label="Toggle sidebar"
      >
        {isCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
      </div>

      {/* WORKSPACE HEADER */}
      <div className="sidebar-header">
        <Link href="/dashboard" className="sidebar-brand-wrapper">
          <div className="sidebar-logo-container">
            <img src="/logo.png" alt="CeCube Group" className="sidebar-logo-img" />
          </div>
          {!isCollapsed && (
            <div className="sidebar-brand-info">
              <div className="sidebar-brand-name">
                <span>CeCube HRMS</span>
              </div>
              <div className="sidebar-brand-sub">
                <span>👥 Members</span>
              </div>
            </div>
          )}
        </Link>
        {!isCollapsed && (
          <button 
            className="sidebar-header-btn" 
            title="Switch Module"
            onClick={() => router.push('/portal')}
          >
            <Layers size={14} />
          </button>
        )}
      </div>

      {/* SEARCH BAR (⌘K style) */}
      {!isCollapsed && (
        <div className="sidebar-search-box">
          <div className="sidebar-search-inner">
            <Search size={14} color="#64748b" />
            <input 
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sidebar-search-input"
            />
            {searchQuery ? (
              <X size={12} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
            ) : (
              <span className="sidebar-search-kbd">⌘K</span>
            )}
          </div>
        </div>
      )}

      {/* NAVIGATION ITEMS */}
      <nav className="sidebar-nav">
        {/* If Search is Active */}
        {filteredItems ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredItems.length === 0 ? (
              <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                No results for "{searchQuery}"
              </div>
            ) : (
              filteredItems.map(item => {
                const Icon = item.icon;
                const isActive = isActiveSidebarItem(pathname, item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    title={item.name}
                  >
                    <div className="nav-item-left">
                      <Icon size={17} />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        ) : (
          /* Normal Grouped Navigation */
          <>
            {mainItems.map(item => {
              const Icon = item.icon;
              const isActive = isActiveSidebarItem(pathname, item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  title={item.name}
                >
                  <div className="nav-item-left">
                    <Icon size={17} />
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}

            {sections.map(sec => {
              const isExpanded = expandedSections[sec.id] !== false;
              const hasActiveChild = sec.items.some(it => isActiveSidebarItem(pathname, it.path));

              return (
                <div key={sec.id} style={{ marginTop: '4px' }}>
                  {!isCollapsed && (
                    <div 
                      className="sidebar-group-header"
                      onClick={() => toggleSection(sec.id)}
                    >
                      <span className="group-title">
                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        <span>{sec.label}</span>
                      </span>
                      <span className="group-badge-count">{sec.items.length}</span>
                    </div>
                  )}

                  {(isExpanded || isCollapsed) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {sec.items.map(item => {
                        const Icon = item.icon;
                        const isActive = isActiveSidebarItem(pathname, item.path);
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                            title={item.name}
                          >
                            <div className="nav-item-left">
                              <Icon size={17} />
                              <span>{item.name}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* FOOTER & USER PROFILE */}
      <div className="sidebar-footer">
        {/* Optional Announcement Widget */}
        {!isCollapsed && showWidget && (
          <div className="sidebar-widget-card">
            <div className="sidebar-widget-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={13} color="#38bdf8" /> New update v2.4
              </span>
              <button 
                className="sidebar-widget-close" 
                onClick={() => setShowWidget(false)}
                title="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
            <div className="sidebar-widget-text">
              CeCube Cloud Suite is synchronized with real-time Neon DB.
            </div>
          </div>
        )}

        {/* User Profile Card */}
        <div className="sidebar-user-row">
          <div className="sidebar-user-left">
            <div className="sidebar-avatar-wrapper">
              <div className="sidebar-avatar">
                <span>A</span>
              </div>
              <span className="sidebar-online-dot"></span>
            </div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">Aditya Yadav</span>
              <span className="sidebar-user-email">admin@cecubeindia.com</span>
            </div>
          </div>
          <button 
            className="sidebar-logout-icon-btn" 
            title="Sign out"
            onClick={() => setShowLogoutDialog(true)}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <Dialog
        isOpen={showLogoutDialog}
        type="confirm"
        title="Logout"
        message="Are you sure you want to logout?"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </aside>
  );
}
