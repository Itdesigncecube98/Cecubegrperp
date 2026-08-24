'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, CalendarCheck, LogOut, Shield, Settings, Car, Mail } from 'lucide-react';
import './sidebar.css';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    sessionStorage.removeItem('isAdmin');
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Admins', path: '/dashboard/admins', icon: Shield },
    { name: 'Employees', path: '/dashboard/employees', icon: Users },
    { name: 'Attendance', path: '/dashboard/attendance', icon: CalendarCheck },
    { name: 'Vehicles', path: '/dashboard/vehicles', icon: Car },
    { name: 'Email Blast', path: '/dashboard/email', icon: Mail },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings }
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
        <button className="btn-outline nav-item logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
