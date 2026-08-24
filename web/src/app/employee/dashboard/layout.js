'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, UserCircle } from 'lucide-react';
import Dialog from '../../../components/Dialog';
import './employee.css';

export default function EmployeeLayout({ children }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    setMounted(true);
    const empData = sessionStorage.getItem('employeeData');
    if (!empData) {
      router.replace('/login');
    } else {
      const parsed = JSON.parse(empData);
      setEmployee(parsed);
      
      // Fetch fresh data in the background so the UI (dept, photo) updates if an admin changed it
      fetch(`/api/employees/${parsed.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setEmployee(data);
            sessionStorage.setItem('employeeData', JSON.stringify(data));
          }
        })
        .catch(err => console.error('Failed to update employee session', err));
    }
  }, [router]);

  const confirmLogout = () => {
    sessionStorage.removeItem('employeeData');
    router.push('/login');
  };

  if (!mounted || !employee) return null;

  return (
    <div className="employee-layout">
      <nav className="employee-navbar glass-panel">
        <div className="nav-brand">
          <img alt="Cecube Logo" src="/logo.png" style={{ maxWidth: '240px' }} />
          <span className="portal-badge">Employee Portal</span>
        </div>
        
        <div className="nav-profile">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <UserCircle size={36} color="#0d9488" />
            <div className="profile-info" style={{ alignItems: 'flex-start' }}>
              <span className="profile-name">{employee?.name || 'Aditya Yadav'}</span>
              <span className="profile-dept">{employee?.designation || 'HRMS Dashboard Developer'}</span>
            </div>
          </div>
          <button className="icon-btn logout-btn" onClick={() => setShowLogoutDialog(true)} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </nav>
      
      <main className="employee-main">
        {children}
      </main>

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
