'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Briefcase, ShoppingCart, FileSignature, MapPin, 
  TrendingUp, FileText, 
  FileCheck, LayoutDashboard, Shield, Users, LogOut, Lock 
} from 'lucide-react';
import './portal.css';

const ALL_MODULES = [
  { id: 'Dashboard', name: 'Analytics Dashboard', icon: LayoutDashboard, color: '#3b82f6', route: '/dashboard' },
  { id: 'AdminDashboard', name: 'Admin Dashboard', icon: Shield, color: '#ef4444', route: '/admin-dashboard' },
  { id: 'Engineering', name: 'Engineering', icon: Briefcase, color: '#8b5cf6', route: '/engineering/dashboard' },
  { id: 'Purchase', name: 'Purchase', icon: ShoppingCart, color: '#f59e0b', route: '/purchase/dashboard' },
  { id: 'Contracting', name: 'Contracting', icon: FileSignature, color: '#14b8a6', route: '/contracting' },
  { id: 'Site', name: 'Site', icon: MapPin, color: '#f43f5e', route: '/coming-soon' },
  { id: 'Marketing', name: 'Marketing', icon: TrendingUp, color: '#ec4899', route: '/marketing/dashboard' },
  { id: 'Accounts', name: 'Accounts', icon: FileText, color: '#6366f1', route: '/accounts/dashboard' },
  { id: 'Tender', name: 'Tender', icon: FileCheck, color: '#84cc16', route: '/tender/dashboard' },
];

export default function UnifiedPortal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [allowedModuleIds, setAllowedModuleIds] = useState([]);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    const adminData = sessionStorage.getItem('adminData');
    const empDataStr = localStorage.getItem('employeeData');

    if (isAdmin && adminData) {
      setUser({ role: 'admin', name: 'Administrator' });
      // Admin sees everything
      setAllowedModuleIds(ALL_MODULES.map(m => m.id));
      setLoading(false);
    } else if (empDataStr) {
      try {
        const empData = JSON.parse(empDataStr);
        setUser({ role: 'employee', name: empData.name, data: empData });
        
        // Employee logic: fetch fresh data to get assignedModules
        fetch(`/api/employees/${empData.id}`)
          .then(res => res.json())
          .then(data => {
            if (data && !data.error) {
              setAllowedModuleIds(data.assignedModules || []);
            } else {
              setAllowedModuleIds([]);
            }
            setLoading(false);
          })
          .catch(() => {
            setAllowedModuleIds([]);
            setLoading(false);
          });
      } catch {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="portal-loading">
        <div className="spinner"></div>
        <p>Loading your workspace...</p>
      </div>
    );
  }

  return (
    <div className="portal-container">
      <div className="portal-bg-shape shape-1"></div>
      <div className="portal-bg-shape shape-2"></div>
      
      <header className="portal-header">
        <div>
          <h1 className="portal-title">Welcome, {user?.name}</h1>
          <p className="portal-subtitle">Select a module to continue to your workspace</p>
        </div>
        <button className="portal-logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </header>

      <main className="portal-main">
        <div className="portal-grid">
          {ALL_MODULES.map((mod, index) => {
            const Icon = mod.icon;
            // Dashboard is the core app, always unlocked
            const isLocked = mod.id !== 'Dashboard' && mod.id !== 'AdminDashboard' && !allowedModuleIds.some(m => m === mod.id || m.startsWith(`${mod.id}:`));
            
            if (mod.id === 'AdminDashboard' && user?.role !== 'admin') {
              return null;
            }

            let finalRoute = mod.route;
            let finalName = mod.name;
            if (mod.id === 'Dashboard') {
              finalRoute = user?.role === 'admin' ? '/dashboard' : '/employee/dashboard';
              finalName = user?.role === 'admin' ? 'HR Dashboard' : 'Employee Dashboard';
            }

            if (isLocked) {
              return (
                <div 
                  key={mod.id} 
                  className="portal-card locked"
                  style={{ '--animation-order': index }}
                >
                  <div className="portal-card-icon" style={{ background: '#f1f5f9', color: '#94a3b8' }}>
                    <Icon size={32} />
                  </div>
                  <h3 className="portal-card-title" style={{ color: '#94a3b8' }}>{finalName}</h3>
                  <div className="portal-card-arrow" style={{ background: '#e2e8f0', color: '#94a3b8' }}>
                    <Lock size={16} />
                  </div>
                </div>
              );
            }

            return (
              <Link 
                key={mod.id} 
                href={finalRoute}
                className="portal-card"
                style={{ '--animation-order': index, textDecoration: 'none' }}
              >
                <div className="portal-card-icon" style={{ background: `${mod.color}15`, color: mod.color }}>
                  <Icon size={32} />
                </div>
                <h3 className="portal-card-title">{finalName}</h3>
                <div className="portal-card-arrow" style={{ background: mod.color }}>
                  →
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
