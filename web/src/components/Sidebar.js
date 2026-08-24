'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, CalendarCheck, LogOut, Shield, Settings, Car, Mail, Clock, Wallet, Building2, Layers, Banknote, ClipboardList, Award, FileText } from 'lucide-react';
import Dialog from './Dialog';
import './sidebar.css';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const confirmLogout = () => {
    sessionStorage.removeItem('isAdmin');
    router.push('/login');
  };



  const navItems = [
    { name: 'Switch Module', path: '/portal', icon: Layers },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Org Structure', path: '/dashboard/organization/structure', icon: Users },
    { name: 'Employee Assignment', path: '/dashboard/organization/assignment', icon: ClipboardList },
    { name: 'Employee Master', path: '/dashboard/employees', icon: Users },
    { name: 'Candidates', path: '/dashboard/candidates', icon: Users },
    { name: 'Muster Management', path: '/dashboard/attendance', icon: CalendarCheck },
    { name: 'Payroll', path: '/dashboard/payroll', icon: Banknote },
    { name: 'TDS Management', path: '/dashboard/tds', icon: ClipboardList },
    { name: 'Appraisal', path: '/dashboard/appraisal', icon: Award },
    { name: 'Requirements', path: '/dashboard/requirements', icon: ClipboardList },
    { name: 'Vehicles Expenses', path: '/dashboard/vehicles', icon: Car },
    { name: 'Email Blast', path: '/dashboard/email', icon: Mail },
    { name: 'Imprest Management', path: '/dashboard/imprest', icon: Wallet },
    { name: 'Doc Generator', path: '/dashboard/doc-generator', icon: ClipboardList },
    { name: 'HR Letters', path: '/dashboard/hr-docs', icon: FileText }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
        <img src="/logo.png" alt="Cecube Logo" style={{ maxWidth: '160px' }} />
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const itemPath = item.path.split('?')[0];
          const isActive = pathname === itemPath || (item.path.includes('?') && pathname === itemPath);
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
