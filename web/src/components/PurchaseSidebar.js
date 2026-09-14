'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  ShoppingCart, FileText, Settings, 
  ChevronDown, ChevronRight, Users, 
  LogOut, Search, X, 
  ChevronLeft, Sparkles, BarChart2, Layers,
  FileSignature, Truck, CheckSquare, ListOrdered
} from 'lucide-react';
import Dialog from './Dialog';
import './sidebar.css';

export default function PurchaseSidebar({ isCollapsed: propCollapsed, setIsCollapsed: propSetIsCollapsed }) {
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
    procurement: true,
    reports: true
  });

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const confirmLogout = () => {
    sessionStorage.removeItem('isAdmin');
    router.push('/login');
  };

  const menuConfig = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart2,
      items: [
        { name: 'Purchase Dashboard', path: '/purchase/dashboard' },
      ]
    },
    {
      id: 'procurement',
      label: 'Procurement',
      icon: ShoppingCart,
      items: [
        { name: 'Purchase Indent (PR)', path: '/purchase/pr' },
        { name: 'Vendor Master', path: '/purchase/vendors' },
        { name: 'Brand Master', path: '/purchase/brands' },
        { name: 'Enquiry Generation', path: '/purchase/enquiry/generation' },
        { name: 'Enquiry Browse', path: '/purchase/enquiry/browse' },
        { name: 'Quotation', path: '/purchase/quotation' },
        { name: 'Purchase Orders (PO)', path: '/purchase/po' },
        { name: 'PO Material Browse', path: '/purchase/po/browse' },
      ]
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart2,
      items: [
        { name: 'Supplier Reports', path: '/purchase/reports/supplier' },
        { name: 'Payment Details', path: '/purchase/reports/payment-summary' },
      ]
    }
  ];

  const allItems = menuConfig.flatMap(group => (
    group.items.map(item => ({ ...item, group: group.label, icon: group.icon }))
  ));

  const filteredItems = searchQuery.trim() ? allItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  ) : null;

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
        <Link href="/purchase/dashboard" className="sidebar-brand-wrapper">
          <div className="sidebar-logo-container" style={{ background: '#f59e0b' }}>
            <ShoppingCart size={20} color="white" />
          </div>
          {!isCollapsed && (
            <div className="sidebar-brand-info">
              <div className="sidebar-brand-name">
                <span>Purchase</span>
              </div>
              <div className="sidebar-brand-sub">
                <span>📦 Supply Chain</span>
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
              placeholder="Search purchase..."
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
                No results for &quot;{searchQuery}&quot;
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
          <div className="sidebar-widget-card" style={{ background: '#fef3c7', borderColor: '#fde68a' }}>
            <div className="sidebar-widget-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#b45309' }}>
                <Sparkles size={13} color="#b45309" /> Purchase Savings
              </span>
              <button 
                className="sidebar-widget-close" 
                onClick={() => setShowWidget(false)}
                title="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
            <div className="sidebar-widget-text" style={{ color: '#92400e' }}>
              Negotiate hard to improve your purchase savings KPI.
            </div>
          </div>
        )}

        <div className="sidebar-user-row">
          <div className="sidebar-user-left">
            <div className="sidebar-avatar-wrapper">
              <div className="sidebar-avatar" style={{ background: '#f59e0b' }}>
                <span>P</span>
              </div>
              <span className="sidebar-online-dot"></span>
            </div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">Purchase Mgr</span>
              <span className="sidebar-user-email">purchase@cecube.com</span>
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
