'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Users, ChevronDown, ChevronRight, FileText, 
  HelpCircle, Settings, FileSearch, PieChart, Wrench, 
  Layers, LogOut, Search, X, Sparkles, ChevronLeft, FileSignature
} from 'lucide-react';
import Dialog from './Dialog';
import './sidebar.css';

export default function ContractingSidebar({ isCollapsed: propCollapsed, setIsCollapsed: propSetIsCollapsed }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWidget, setShowWidget] = useState(true);

  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isCollapsed = propCollapsed !== undefined ? propCollapsed : localCollapsed;
  const setIsCollapsed = propSetIsCollapsed || setLocalCollapsed;

  const [expanded, setExpanded] = useState({
    contractors: pathname.includes('/contractors'),
    labour: pathname.includes('/labour'),
    workOrder: pathname.includes('/work-order'),
    raBills: pathname.includes('/ra-bills'),
    enquiry: pathname.includes('/enquiry'),
    quotation: pathname.includes('/quotation'),
  });

  const toggleSection = (menu) => {
    setExpanded(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const confirmLogout = () => {
    sessionStorage.removeItem('isAdmin');
    router.push('/login');
  };

  const menuConfig = [
    {
      id: 'contractors',
      label: 'Contractors',
      icon: Users,
      items: [
        { name: 'Contractor List', path: '/contracting/contractors/contractor-list' },
        { name: 'Add Group', path: '/contracting/contractors/add-group' },
        { name: 'Registered Suppliers', path: '/contracting/contractors/registered-suppliers' },
        { name: 'Insurance Policy Detail', path: '/contracting/contractors/insurance/policy-detail' },
        { name: 'Labour Master', path: '/contracting/contractors/labour-master' },
      ]
    },
    {
      id: 'labour',
      label: 'Labour Management',
      icon: Wrench,
      items: [
        { name: 'Requisition Generation', path: '/contracting/labour/requisition' },
        { name: 'Requisition Browse', path: '/contracting/labour/requisition-browse' },
      ]
    },
    {
      id: 'workOrder',
      label: 'Work Order',
      icon: FileText,
      items: [
        { name: 'Raise Work Order', path: '/contracting/work-order/raise' },
        { name: 'Browse Work Order', path: '/contracting/work-order/browse' },
        { name: 'Labour Rate Master', path: '/contracting/labour/rate-master' },
      ]
    },
    {
      id: 'raBills',
      label: 'RA Bills',
      icon: FileSearch,
      items: [
        { name: 'RA Bill Generation', path: '/contracting/ra-bills/generation' },
      ]
    },
    {
      id: 'enquiry',
      label: 'Enquiry',
      icon: HelpCircle,
      items: [
        { name: 'Enquiry Generation', path: '/contracting/enquiry/enquiry-generation' },
        { name: 'Enquiry Browse', path: '/contracting/enquiry/browse' },
      ]
    },
    {
      id: 'quotation',
      label: 'Quotation',
      icon: FileSignature,
      items: [
        { name: 'Quotation Entry', path: '/contracting/quotation/entry' },
        { name: 'Quotation Browse', path: '/contracting/quotation/browse' },
        { name: 'Quotation Compare', path: '/contracting/quotation/compare' },
      ]
    },
  
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
        <Link href="/contracting/contractors/contractor-list" className="sidebar-brand-wrapper">
          <div className="sidebar-logo-container">
            <img src="/logo.png" alt="CeCube Group" className="sidebar-logo-img" />
          </div>
          {!isCollapsed && (
            <div className="sidebar-brand-info">
              <div className="sidebar-brand-name">
                <span>Contracting</span>
              </div>
              <div className="sidebar-brand-sub">
                <span>📝 CeCube Subcontracting</span>
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
              placeholder="Search contracting..."
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

      {/* NAVIGATION */}
      <nav className="sidebar-nav">
        {/* Switch Module Quick Nav */}
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

        {/* Filtered Search Results */}
        {filteredItems ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredItems.length === 0 ? (
              <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                No results for &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
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
          /* Normal Accordion Groups */
          menuConfig.map((section) => {
            const Icon = section.icon;
            const isGroupOpen = expanded[section.id];
            const hasActiveChild = section.items.some(item => pathname === item.path);

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

                {/* Sub Items */}
                {!isCollapsed && isGroupOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '1px' }}>
                    {section.items.map((item) => {
                      const isActive = pathname === item.path;
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

      {/* FOOTER & PROFILE */}
      <div className="sidebar-footer">
        {!isCollapsed && showWidget && (
          <div className="sidebar-widget-card">
            <div className="sidebar-widget-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={13} color="#14b8a6" /> Subcontracts Active
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
              Labour contracts & RA billing verifications automated.
            </div>
          </div>
        )}

        <div className="sidebar-user-row">
          <div className="sidebar-user-left">
            <div className="sidebar-avatar-wrapper">
              <div className="sidebar-avatar" style={{ background: '#0d9488' }}>
                <span>C</span>
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
