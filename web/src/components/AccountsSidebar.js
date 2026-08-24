'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, Layers, Building2, BookOpen, Wallet, ChevronDown, ChevronRight, BarChart2 } from 'lucide-react';
import Dialog from './Dialog';
import './sidebar.css';

export default function AccountsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [mastersExpanded, setMastersExpanded] = useState(true);

  const confirmLogout = () => {
    sessionStorage.removeItem('isAdmin');
    router.push('/login');
  };

  const navItems = [
    { name: 'Switch Module', path: '/portal', icon: Layers },
    { name: 'Dashboard', path: '/accounts', icon: LayoutDashboard }
  ];

  const mastersItems = [
    { name: 'Company', path: '/accounts/company', icon: Building2 },
    { name: 'Chart of Accounts', path: '/accounts/chart-of-accounts', icon: BookOpen },
    { name: 'Cost Center', path: '/accounts/cost-center', icon: Wallet },
    { name: 'Stock Figure', path: '/accounts/stock-figure', icon: BarChart2 },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
        <img src="/logo.png" alt="Cecube Logo" style={{ maxWidth: '160px' }} />
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <div className="nav-group">
          <div 
            className="nav-group-header nav-item" 
            onClick={() => setMastersExpanded(!mastersExpanded)}
            style={{ cursor: 'pointer', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Layers size={20} />
              <span>Masters</span>
            </div>
            {mastersExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          
          {mastersExpanded && (
            <div className="nav-group-items" style={{ marginLeft: '1rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {mastersItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={() => setShowLogoutDialog(true)}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>

      <Dialog
        isOpen={showLogoutDialog}
        type="confirm"
        title="Logout"
        message="Are you sure you want to logout?"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </div>
  );
}
