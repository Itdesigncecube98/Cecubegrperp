'use client';
import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, LayoutDashboard, LogOut, Users, Building2, Key,
  ClipboardList, Settings, FileText, ChevronLeft, ChevronRight,
} from 'lucide-react';
import TopHeader from '../../components/TopHeader';
import './admin-dashboard.css';

const NAV_SECTIONS = [
  {
    group: 'System',
    items: [
      { id: 'overview',    label: 'Overview',        icon: LayoutDashboard, href: '/admin-dashboard' },
      { id: 'users',       label: 'User Management', icon: Users,          href: '/admin-dashboard/users' },
      { id: 'tools',       label: 'Tool Permissions', icon: Key,           href: '/admin-dashboard/tools' },
      { id: 'employee-tools', label: 'Employee Access', icon: Users,       href: '/admin-dashboard/employee-tools' },
      { id: 'company',     label: 'Company Setup',   icon: Building2,      href: '/admin-dashboard/company' },
      { id: 'security',    label: 'Security Policy', icon: Key,            href: '/admin-dashboard/security' },
      { id: 'access-logs', label: 'Access Logs',     icon: ClipboardList,  href: '/admin-dashboard/access-logs' },
      { id: 'license',     label: 'License',         icon: FileText,       href: '/admin-dashboard/license' },
      { id: 'settings',    label: 'System Settings', icon: Settings,       href: '/admin-dashboard/settings' },
    ],
  },
];

function AdminDashboardContent({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('isAdmin');
    if (isAdmin !== 'true') router.push('/login');
  }, [router]);

  const isActive = (href) =>
    href === '/admin-dashboard'
      ? pathname === '/admin-dashboard'
      : pathname.startsWith(href);

  return (
    <div className="adm-shell">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`adm-sidebar${collapsed ? ' is-collapsed' : ''}`}>
        {/* Brand */}
        <div className="adm-brand">
          <div className="adm-brand-mark">
            <Shield size={18} />
          </div>
          {!collapsed && <div className="adm-brand-copy"><strong>CeCube</strong><span>ADMIN CONSOLE</span></div>}
          <button
            type="button"
            className="adm-collapse-button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed(value => !value)}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="adm-nav">
          <Link href="/portal" className="adm-portal-link" title={collapsed ? 'Back to Portal' : undefined}>
            <LayoutDashboard size={17} />
            {!collapsed && <span>Back to Portal</span>}
          </Link>
          {NAV_SECTIONS.map(section => (
            <div key={section.group} className="adm-nav-section">
              {!collapsed && <div className="adm-section-label">{section.group}</div>}
              {section.items.map(item => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`adm-nav-link${active ? ' is-active' : ''}`}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={17} />
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && active && <span className="adm-active-indicator" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="adm-sidebar-footer">
          {!collapsed && (
            <div className="adm-account-card">
              <div className="adm-account-avatar"><Shield size={16} /></div>
              <div className="adm-account-copy"><strong>Administrator</strong><span>System access</span></div>
            </div>
          )}
          <button
            type="button"
            className="adm-logout-button"
            title={collapsed ? 'Logout' : undefined}
            onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}); sessionStorage.clear(); localStorage.removeItem('employeeData'); localStorage.removeItem('activeEmp'); localStorage.removeItem('activeProj'); router.push('/login'); }}
          >
            <LogOut size={17} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="adm-main">
        <div className="adm-topbar"><TopHeader title="Admin Workspace" /></div>
        <div className="adm-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboardLayout({ children }) {
  return (
    <Suspense fallback={<div hidden />}>
      <AdminDashboardContent>{children}</AdminDashboardContent>
    </Suspense>
  );
}
