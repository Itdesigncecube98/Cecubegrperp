'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import TopHeader from '../../components/TopHeader';
import './layout.css';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isAdmin = sessionStorage.getItem('isAdmin');
    if (!isAdmin) {
      window.location.replace('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // Don't render until client side is mounted to prevent hydration errors
  if (!mounted || !isAuthenticated) return null;

  return (
    <div className={`admin-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <main className={`admin-content ${isCollapsed ? 'collapsed' : ''}`}>
        <TopHeader title="HR Dashboard" />
        <div className="content-inner">
          {children}
        </div>
      </main>
    </div>
  );
}
