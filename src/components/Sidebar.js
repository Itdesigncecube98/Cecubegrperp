'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, CalendarCheck, LogOut, Shield, Settings,
  Car, Mail, HardHat, Wallet, ChevronDown, ChevronRight
} from 'lucide-react';
import './sidebar.css';

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [enggOpen,     setEnggOpen]     = useState(pathname.startsWith('/dashboard/engg'));
  const [accountsOpen, setAccountsOpen] = useState(pathname.startsWith('/dashboard/accounts'));

  const handleLogout = () => {
    sessionStorage.removeItem('isAdmin');
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Admins',    path: '/dashboard/admins',    icon: Shield },
    { name: 'Employees', path: '/dashboard/employees', icon: Users },
    { name: 'Attendance',path: '/dashboard/attendance',icon: CalendarCheck },
    { name: 'Vehicles',  path: '/dashboard/vehicles',  icon: Car },
    { name: 'Email Blast',path: '/dashboard/email',    icon: Mail },
    { name: 'Settings',  path: '/dashboard/settings',  icon: Settings }
  ];

  const enggItems = [
    { name: 'Dashboard',         path: '/dashboard/engg' },
    { name: 'Projects',          path: '/dashboard/engg/projects' },
    { name: 'Work Orders',       path: '/dashboard/engg/work-orders' },
    { name: 'Site Visits',       path: '/dashboard/engg/site-visits' },
    { name: 'Material Requests', path: '/dashboard/engg/material-requests' },
    { name: 'Drawings',          path: '/dashboard/engg/drawings' },
    { name: 'Equipment',         path: '/dashboard/engg/equipment' },
  ];

  const accountsItems = [
    { name: 'Dashboard',       path: '/dashboard/accounts' },
    { name: 'Expenses',        path: '/dashboard/accounts/expenses' },
    { name: 'Invoices',        path: '/dashboard/accounts/invoices' },
    { name: 'Purchase Orders', path: '/dashboard/accounts/purchase-orders' },
    { name: 'Payroll',         path: '/dashboard/accounts/payroll' },
    { name: 'Vendors',         path: '/dashboard/accounts/vendors' },
    { name: 'Budget',          path: '/dashboard/accounts/budget' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src="https://www.cecubeindia.com/images/logo.png" alt="Cecube Logo" style={{ maxWidth: '160px' }} />
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* ── Engineering Module ── */}
        <button
          onClick={() => setEnggOpen(o => !o)}
          className="nav-item"
          style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', marginTop: 4 }}
        >
          <HardHat size={20} />
          <span style={{ flex: 1 }}>Engineering</span>
          {enggOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {enggOpen && (
          <div style={{ paddingLeft: 16 }}>
            {enggItems.map(item => (
              <Link key={item.path} href={item.path}
                className={`nav-item ${pathname === item.path ? 'active' : ''}`}
                style={{ fontSize: 13, paddingTop: 7, paddingBottom: 7 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: pathname === item.path ? '#6366f1' : '#cbd5e1', flexShrink: 0 }} />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        )}

        {/* ── Accounts Portal ── */}
        <button
          onClick={() => setAccountsOpen(o => !o)}
          className="nav-item"
          style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', marginTop: 4 }}
        >
          <Wallet size={20} />
          <span style={{ flex: 1 }}>Accounts</span>
          {accountsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {accountsOpen && (
          <div style={{ paddingLeft: 16 }}>
            {accountsItems.map(item => (
              <Link key={item.path} href={item.path}
                className={`nav-item ${pathname === item.path ? 'active' : ''}`}
                style={{ fontSize: 13, paddingTop: 7, paddingBottom: 7 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: pathname === item.path ? '#6366f1' : '#cbd5e1', flexShrink: 0 }} />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="btn-outline nav-item logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
