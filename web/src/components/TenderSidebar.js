'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Briefcase, FileText, Settings, 
  ChevronDown, ChevronRight, Users, 
  LogOut, Search, X, 
  ChevronLeft, Sparkles, BarChart2, Layers,
  ListOrdered
} from 'lucide-react';
import Dialog from './Dialog';
import './sidebar.css';

export default function TenderSidebar({ isCollapsed: propCollapsed, setIsCollapsed: propSetIsCollapsed }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWidget, setShowWidget] = useState(true);

  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isCollapsed = propCollapsed !== undefined ? propCollapsed : localCollapsed;
  const setIsCollapsed = propSetIsCollapsed || setLocalCollapsed;
  
  const [expanded, setExpanded] = useState({
    dashboard: true,
    register: true
  });

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const confirmLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    sessionStorage.clear();
    for (const key of ['employeeData', 'activeEmp', 'activeProj']) localStorage.removeItem(key);
    router.push('/login');
  };

  const menuConfig = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart2,
      items: [
        { name: 'Tender Dashboard', path: '/tender/dashboard' },
      ]
    },
    {
      id: 'register',
      label: 'Tenders',
      icon: ListOrdered,
      items: [
        { name: 'Tender Register', path: '/tender/register' },
        { name: 'New Tender', path: '/tender/create' },
      ]
    },
    {
      id: 'master',
      label: 'Masters',
      icon: Settings,
      items: [
        { name: 'Tender Master', path: '/tender/master' },
      ]
    }
  ];

  const allItems = useMemo(() => {
    const list = [];
    menuConfig.forEach(group => {
      group.items.forEach(item => {
        list.push({ ...item, group: group.label, icon: group.icon });
      });
    });
    return list;
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return allItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [searchQuery, allItems]);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div 
        className="sidebar-toggle-btn" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        aria-label="Toggle sidebar"
      >
        {isCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
      </div>

      <div className="sidebar-header">
        <Link href="/tender/dashboard" className="sidebar-brand-wrapper">
          <div className="sidebar-logo-container" style={{ background: '#10b981' }}>
            <Briefcase size={20} color="white" />
          </div>
          {!isCollapsed && (
            <div className="sidebar-brand-info">
              <div className="sidebar-brand-name">
                <span>Tender</span>
              </div>
              <div className="sidebar-brand-sub">
                <span>📈 Bidding & Estimation</span>
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

      {!isCollapsed && (
        <div className="sidebar-search-box">
          <div className="sidebar-search-inner">
            <Search size={14} color="#64748b" />
            <input 
              type="text"
              placeholder="Search tender..."
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

      <nav className="sidebar-nav">
        <Link 
          href="/portal" 
          className="nav-item" 
          title="Switch Module"
        >
          <div className="nav-item-left">
            <Layers size={17} />
            <span>Switch Module</span>
          </div>
        </Link>

        {filteredItems ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredItems.length === 0 ? (
              <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                No results for "{searchQuery}"
              </div>
            ) : (
              filteredItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
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
          menuConfig.map((section) => {
            const Icon = section.icon;
            const isGroupOpen = expanded[section.id];
            const hasActiveChild = section.items.some(item => pathname === item.path || pathname.startsWith(`${item.path}/`));

            return (
              <div key={section.id} style={{ marginTop: '2px' }}>
                <div 
                  className={`nav-item ${hasActiveChild ? 'active' : ''}`}
                  onClick={() => toggleSection(section.id)}
                  title={section.label}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="nav-item-left">
                    <Icon size={17} />
                    <span>{section.label}</span>
                  </div>
                  {!isCollapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="group-badge-count">{section.items.length}</span>
                      {isGroupOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  )}
                </div>

                {!isCollapsed && isGroupOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '1px' }}>
                    {section.items.map((item) => {
                      const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
                      return (
                        <Link
                          key={item.path}
                          href={item.path}
                          className={`nav-subitem ${isActive ? 'active' : ''}`}
                          title={item.name}
                        >
                          <div className="nav-subitem-bullet"></div>
                          <span>{item.name}</span>
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
          <div className="sidebar-widget-card" style={{ background: '#d1fae5', borderColor: '#a7f3d0' }}>
            <div className="sidebar-widget-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#047857' }}>
                <Sparkles size={13} color="#047857" /> Bidding Engine
              </span>
              <button 
                className="sidebar-widget-close" 
                onClick={() => setShowWidget(false)}
                title="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
            <div className="sidebar-widget-text" style={{ color: '#065f46' }}>
              Keep your tenders up to date to hit targets.
            </div>
          </div>
        )}

        <div className="sidebar-user-row">
          <div className="sidebar-user-left">
            <div className="sidebar-avatar-wrapper">
              <div className="sidebar-avatar" style={{ background: '#10b981' }}>
                <span>B</span>
              </div>
              <span className="sidebar-online-dot"></span>
            </div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">Bidding Mgr</span>
              <span className="sidebar-user-email">bidding@cecube.com</span>
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
