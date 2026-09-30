'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users, ChevronDown, ChevronRight, FileText,
  HelpCircle, Wrench, Layers, LogOut, Search, X,
  Sparkles, ChevronLeft, FileSignature, FileSearch
} from 'lucide-react';
import Dialog from './Dialog';
import { usePermissions } from '../context/PermissionsContext';
import './sidebar.css';

const menuConfig = [
  {
    id: 'contractors',
    label: 'Contractors',
    icon: Users,
    items: [
      { name: 'Contractor List',        path: '/contracting/contractors/contractor-list',         permissionCode: 'CONTRACT_CONTRACTOR_LIST' },
      { name: 'Add Group',              path: '/contracting/contractors/add-group',                permissionCode: 'CONTRACT_ADD_GROUP' },
      { name: 'Registered Suppliers',   path: '/contracting/contractors/registered-suppliers',     permissionCode: 'CONTRACT_REG_SUPPLIERS' },
      { name: 'Insurance Policy Detail',path: '/contracting/contractors/insurance/policy-detail',  permissionCode: 'CONTRACT_INSURANCE_POLICY' },
      { name: 'Labour Master',          path: '/contracting/contractors/labour-master',            permissionCode: 'CONTRACT_LABOUR_MASTER' },
    ],
  },
  {
    id: 'labour',
    label: 'Labour Management',
    icon: Wrench,
    items: [
      { name: 'Requisition Generation', path: '/contracting/labour/requisition',        permissionCode: 'CONTRACT_REQ_GEN' },
      { name: 'Requisition Browse',     path: '/contracting/labour/requisition-browse', permissionCode: 'CONTRACT_REQ_BROWSE' },
    ],
  },
  {
    id: 'workOrder',
    label: 'Work Order',
    icon: FileText,
    items: [
      { name: 'Raise Work Order',    path: '/contracting/work-order/raise',         permissionCode: 'CONTRACT_WO_RAISE' },
      { name: 'Browse Work Order',   path: '/contracting/work-order/browse',        permissionCode: 'CONTRACT_WO_BROWSE' },
      { name: 'Labour Rate Master',  path: '/contracting/labour/rate-master',       permissionCode: 'CONTRACT_LABOUR_RATE_MASTER' },
    ],
  },
  {
    id: 'raBills',
    label: 'RA Bills',
    icon: FileSearch,
    items: [
      { name: 'RA Bill Generation', path: '/contracting/ra-bills/generation', permissionCode: 'CONTRACT_RA_GEN' },
      { name: 'RA Bill Advance',    path: '/contracting/advance',             permissionCode: 'CONTRACT_RA_ADVANCE' },
    ],
  },
  {
    id: 'enquiry',
    label: 'Enquiry',
    icon: HelpCircle,
    items: [
      { name: 'Enquiry Generation', path: '/contracting/enquiry/enquiry-generation', permissionCode: 'CONTRACT_ENQUIRY_GEN' },
      { name: 'Enquiry Browse',     path: '/contracting/enquiry/browse',             permissionCode: 'CONTRACT_ENQUIRY_BROWSE' },
    ],
  },
  {
    id: 'quotation',
    label: 'Quotation',
    icon: FileSignature,
    items: [
      { name: 'Quotation Entry',   path: '/contracting/quotation/entry',   permissionCode: 'CONTRACT_QUOTATION_ENTRY' },
      { name: 'Quotation Browse',  path: '/contracting/quotation/browse',  permissionCode: 'CONTRACT_QUOTATION_BROWSE' },
      { name: 'Quotation Compare', path: '/contracting/quotation/compare', permissionCode: 'CONTRACT_QUOTATION_COMPARE' },
    ],
  },
];

export default function ContractingSidebar({ isCollapsed: propCollapsed, setIsCollapsed: propSetIsCollapsed }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasRight, activeEmployee, activeProject } = usePermissions();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWidget, setShowWidget] = useState(true);
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isCollapsed = propCollapsed !== undefined ? propCollapsed : localCollapsed;
  const setIsCollapsed = propSetIsCollapsed || setLocalCollapsed;

  const [expanded, setExpanded] = useState({
    contractors: true,
    labour: false,
    workOrder: false,
    raBills: false,
    enquiry: false,
    quotation: false,
  });

  const visibleMenuConfig = useMemo(() => {
    if (!activeEmployee) return menuConfig;
    if (!activeProject) return [];
    return menuConfig
      .map(group => ({
        ...group,
        items: group.items.filter(item => !item.permissionCode || hasRight(item.permissionCode)),
      }))
      .filter(group => group.items.length > 0);
  }, [activeEmployee, activeProject, hasRight]);

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
        <Link href="/contracting/contractors/contractor-list" className="sidebar-brand-wrapper">
          <div className="sidebar-logo-container">
            <img src="/logo.png" alt="CeCube" className="sidebar-logo-img" />
          </div>
          {!isCollapsed && (
            <div className="sidebar-brand-info">
              <div className="sidebar-brand-name"><span>Contracting</span></div>
              <div className="sidebar-brand-sub"><span>📝 Subcontracting</span></div>
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
            <input type="text" placeholder="Search contracting..." value={searchQuery}
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
                <Sparkles size={13} color="#14b8a6" /> Subcontracts Active
              </span>
              <button className="sidebar-widget-close" onClick={() => setShowWidget(false)} title="Dismiss"><X size={12} /></button>
            </div>
            <div className="sidebar-widget-text">Labour contracts & RA billing verifications automated.</div>
          </div>
        )}
        <div className="sidebar-user-row">
          <div className="sidebar-user-left">
            <div className="sidebar-avatar-wrapper">
              <div className="sidebar-avatar" style={{ background: '#0d9488' }}><span>C</span></div>
              <span className="sidebar-online-dot" />
            </div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">Contracting</span>
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
