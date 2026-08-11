'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import './layout.css';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isAdmin = sessionStorage.getItem('isAdmin');
    if (!isAdmin) {
      router.replace('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // Don't render until client side is mounted to prevent hydration errors
  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}
