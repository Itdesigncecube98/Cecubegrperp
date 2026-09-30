'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingCart, BarChart2,
  ChevronDown, ChevronRight, ChevronLeft,
  Layers, LogOut, Search, X, Sparkles
} from 'lucide-react';
import Dialog from './Dialog';
import { usePermissions } from '../context/PermissionsContext';
import './sidebar.css';

const menuConfig = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart2,
    items: [
      { name: 'Purchase Dashboard', path: '/purchase/dashboard', permissionCode: 'PURCHASE_DASHBOARD' },
    ],
  },
  {
    id: 'procurement',
    label: 'Procurement',
    icon: ShoppingCart,
    items: [
      { name: 'Purchase Indent (PR)',  path: '/purchase/pr',                   permissionCode: 'PURCHASE_PR' },
      { name: 'Vendor Master',         path: '/purchase/vendors',               permissionCode: 'PURCHASE_VENDOR_MASTER' },
      { name: 'Brand Master',          path: '/purchase/brands',                permissionCode: 'PURCHASE_BRAND_MASTER' },
      { name: 'Enquiry Generation',    path: '/purchase/enquiry/generation',    permissionCode: 'PURCHASE_ENQUIRY_GENERATION' },
      { name: 'Enquiry Browse',        path: '/purchase/enquiry/browse',        permissionCode: 'PURCHASE_ENQUIRY_BROWSE' },
      { name: 'Quotation',             path: '/purchase/quotation',             permissionCode: 'PURCHASE_QUOTATION' },
      { name: 'Purchase Orders (PO)',  path: '/purchase/po',                   permissionCode: 'PURCHASE_PO' },
      { name: 'PO Material Browse',    path: '/purchase/po/browse',            permissionCode: 'PURCHASE_PO_BROWSE' },
      { name: 'Purchase Advance',      path: '/purchase/advance',              permissionCode: 'PURCHASE_ADVANCE' },
      { name: 'Purchase Bills',        path: '/purchase/bills',                permissionCode: 'PURCHASE_BILLS' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: BarChart2,
    items: [
      { name: 'Supplier',                  path: '/purchase/reports/supplier/supplier',                    permissionCode: 'PURCHASE_REPORT_SUPPLIER' },
      { name: 'Short Supplier',            path: '/purchase/reports/supplier/short-supplier',             permissionCode: 'PURCHASE_REPORT_SHORT_SUPPLIER' },
      { name: 'Supplier Summary',          path: '/purchase/reports/supplier/summary',                    permissionCode: 'PURCHASE_REPORT_SUPPLIER_SUMMARY' },
      { name: 'Supplier Rating',           path: '/purchase/reports/supplier/rating',                     permissionCode: 'PURCHASE_REPORT_SUPPLIER_RATING' },
      { name: 'PO Analysis',              path: '/purchase/reports/supplier/po-analysis',                permissionCode: 'PURCHASE_REPORT_PO_ANALYSIS' },
      { name: 'Supplier Wise Transaction', path: '/purchase/reports/supplier/supplier-wise-transaction',  permissionCode: 'PURCHASE_REPORT_SUPPLIER_TXN' },
      { name: 'Supplier Wise PO',          path: '/purchase/reports/supplier/supplier-wise-po',          permissionCode: 'PURCHASE_REPORT_SUPPLIER_PO' },
      { name: 'Payment Summary',           path: '/purchase/reports/payment/summary',                     permissionCode: 'PURCHASE_REPORT_PAYMENT_SUMMARY' },
      { name: 'Payment Details',           path: '/purchase/reports/payment/details',                     permissionCode: 'PURCHASE_REPORT_PAYMENT_DETAILS' },
      { name: 'Date Tracking',             path: '/purchase/reports/payment/date-tracking',               permissionCode: 'PURCHASE_REPORT_DATE_TRACKING' },
      { name: 'Ageing',                    path: '/purchase/reports/payment/ageing',                      permissionCode: 'PURCHASE_REPORT_AGEING' },
    ],
  },
];

export default function PurchaseSidebar({ isCollapsed: propCollapsed, setIsCollapsed: propSetIsCollapsed }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWidget, setShowWidget] = useState(true);
  const { hasRight, activeEmployee } = usePermissions();
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isCollapsed = propCollapsed !== undefined ? propCollapsed : localCollapsed;
  const setIsCollapsed = propSetIsCollapsed || setLocalCollapsed;
  const [expanded, setExpanded] = useState({ dashboard: true, procurement: true, reports: false });

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
        <Link href="/purchase/dashboard" className="sidebar-brand-wrapper">
          <div className="sidebar-logo-container" style={{ background: '#f59e0b' }}>
            <ShoppingCart size={20} color="white" />
          </div>
          {!isCollapsed && (
            <div className="sidebar-brand-info">
              <div className="sidebar-brand-name"><span>Purchase</span></div>
              <div className="sidebar-brand-sub"><span>📦 Supply Chain</span></div>
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
            <input type="text" placeholder="Search purchase..." value={searchQuery}
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
          <div className="sidebar-widget-card" style={{ background: '#fef3c7', borderColor: '#fde68a' }}>
            <div className="sidebar-widget-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#b45309' }}>
                <Sparkles size={13} color="#b45309" /> Purchase Savings
              </span>
              <button className="sidebar-widget-close" onClick={() => setShowWidget(false)} title="Dismiss"><X size={12} /></button>
            </div>
            <div className="sidebar-widget-text" style={{ color: '#92400e' }}>Negotiate hard to improve your purchase savings KPI.</div>
          </div>
        )}
        <div className="sidebar-user-row">
          <div className="sidebar-user-left">
            <div className="sidebar-avatar-wrapper">
              <div className="sidebar-avatar" style={{ background: '#f59e0b' }}><span>P</span></div>
              <span className="sidebar-online-dot" />
            </div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">Purchase</span>
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
