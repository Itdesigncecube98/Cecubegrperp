'use client';
import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, LayoutDashboard, LogOut, Users, Building2, Key,
  ClipboardList, Settings, FileText, ShoppingCart, Warehouse,
  Calendar, HardHat, DollarSign, Megaphone, FileCheck,
  Star, AlertTriangle, Receipt, Wrench, ChevronRight,
} from 'lucide-react';
import TopHeader from '../../components/TopHeader';

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
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#f1f5f9', fontFamily: '"Inter", sans-serif' }}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 64 : 240,
        minWidth: collapsed ? 64 : 240,
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease', overflow: 'hidden',
        boxShadow: '4px 0 32px rgba(0,0,0,0.15)', zIndex: 20,
      }}>

        {/* Brand */}
        <div style={{ padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }} onClick={() => setCollapsed(c => !c)}>
          <div style={{ minWidth: 32, width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
            <Shield size={16} color="#fff" />
          </div>
          {!collapsed && <span style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>System Admin</span>}
          {!collapsed && <ChevronRight size={14} color="#64748b" style={{ marginLeft: 'auto', transform: 'rotate(180deg)' }} />}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', scrollbarWidth: 'none' }}>
          {NAV_SECTIONS.map(section => (
            <div key={section.group} style={{ marginBottom: 4 }}>
              {!collapsed && (
                <div style={{ padding: '12px 8px 4px', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  {section.group}
                </div>
              )}
              {section.items.map(item => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.id} href={item.href} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: collapsed ? '10px 16px' : '9px 10px',
                    borderRadius: 8, textDecoration: 'none',
                    color: active ? '#fff' : '#94a3b8',
                    fontWeight: active ? 600 : 500, fontSize: 13,
                    background: active ? 'rgba(99,102,241,0.25)' : 'transparent',
                    borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
                    transition: 'all 0.15s', marginBottom: 2,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#f1f5f9'; }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; } }}
                  >
                    <Icon size={15} style={{ minWidth: 15 }} />
                    {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                    {!collapsed && active && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: 3, background: '#6366f1' }} />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Back to Portal + Logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/portal" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, color: '#64748b', textDecoration: 'none', fontSize: 13, fontWeight: 500, justifyContent: collapsed ? 'center' : 'flex-start', marginBottom: 4 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}>
            <LayoutDashboard size={15} style={{ minWidth: 15 }} />
            {!collapsed && 'Back to Portal'}
          </Link>
          <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}); sessionStorage.clear(); localStorage.removeItem('employeeData'); localStorage.removeItem('activeEmp'); localStorage.removeItem('activeProj'); router.push('/login'); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 500, justifyContent: collapsed ? 'center' : 'flex-start' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}>
            <LogOut size={15} style={{ minWidth: 15 }} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopHeader title="Admin Workspace" />
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
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
