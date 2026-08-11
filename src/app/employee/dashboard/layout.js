'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, UserCircle } from 'lucide-react';
import './employee.css';

export default function EmployeeLayout({ children }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    setMounted(true);
    const empData = sessionStorage.getItem('employeeData');
    if (!empData) {
      router.replace('/login');
    } else {
      setEmployee(JSON.parse(empData));
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('employeeData');
    router.push('/login');
  };

  if (!mounted || !employee) return null;

  return (
    <div className="employee-layout">
      <nav className="employee-navbar glass-panel">
        <div className="nav-brand">
          <img src="https://www.cecubeindia.com/images/logo.png" alt="Cecube" />
          <span className="portal-badge">Employee Portal</span>
        </div>
        
        <div className="nav-profile">
          <div className="profile-info">
            <span className="profile-name">{employee.name}</span>
            <span className="profile-dept">{employee.department}</span>
          </div>
          <button className="icon-btn logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </nav>
      
      <main className="employee-main">
        {children}
      </main>
    </div>
  );
}
