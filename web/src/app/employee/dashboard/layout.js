'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, UserCircle, Layers } from 'lucide-react';
import Dialog from '../../../components/Dialog';
import './employee.css';

export default function EmployeeLayout({ children }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isMobileApp, setIsMobileApp] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState(null);

  useEffect(() => {
    // Client-only session and Capacitor detection prevents hydration mismatches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (typeof window !== 'undefined') {
      const isApp = localStorage.getItem('isMobileApp') === 'true' || 
                    Boolean(window.Capacitor?.isNativePlatform?.());
      setIsMobileApp(isApp);

      if (isApp) {
        fetch(`/app-version.json?t=${Date.now()}`, { cache: 'no-store' })
          .then(res => res.ok ? res.json() : null)
          .then(remoteVersion => {
            if (!remoteVersion?.version) return;
            const appliedVersion = localStorage.getItem('employeeAppVersion');
            if (appliedVersion !== remoteVersion.version) {
              setAvailableUpdate(remoteVersion);
            }
          })
          .catch(err => console.warn('Unable to check for app updates', err));
      }
    }

    const empData = localStorage.getItem('employeeData');
    if (!empData) {
      const isApp = typeof window !== 'undefined' && (localStorage.getItem('isMobileApp') === 'true' || Boolean(window.Capacitor?.isNativePlatform?.()));
      router.replace(isApp ? '/employeedashboard/login' : '/login');
    } else {
      const parsed = JSON.parse(empData);
      setEmployee(parsed);
      
      // Fetch fresh data in the background so the UI (dept, photo) updates if an admin changed it
      fetch(`/api/employees/${parsed.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setEmployee(data);
            localStorage.setItem('employeeData', JSON.stringify(data));
          }
        })
        .catch(err => console.error('Failed to update employee session', err));
    }
  }, [router]);

  const confirmLogout = () => {
    localStorage.removeItem('employeeData');
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('adminData');
    if (isMobileApp) {
      router.push('/employeedashboard/login');
    } else {
      router.push('/login');
    }
  };

  const applyUpdate = () => {
    if (!availableUpdate?.version) return;
    localStorage.setItem('employeeAppVersion', availableUpdate.version);
    window.location.reload();
  };

  if (!mounted || !employee) return null;

  return (
    <div className="employee-layout">
      <nav className="employee-navbar glass-panel">
        <div className="nav-brand">
          <img alt="Cecube Logo" src="/logo.png" style={{ maxWidth: '240px' }} />
        </div>
        
        <div className="nav-profile">
          {!isMobileApp && (
            <button 
              type="button"
              onClick={() => router.push('/portal')} 
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#f8fafc', border: '1px solid #cbd5e1',
                padding: '7px 14px', borderRadius: '8px',
                fontSize: '13px', fontWeight: 600, color: '#1e293b',
                cursor: 'pointer', marginRight: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease'
              }}
              title="View Assigned Workspaces & Modules"
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#4f46e5'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#1e293b'; }}
            >
              <Layers size={16} color="#6366f1" />
              <span>Workspaces</span>
            </button>
          )}
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

      {isMobileApp && availableUpdate && (
        <div style={{ position: 'fixed', right: '20px', bottom: '20px', zIndex: 2000, width: 'min(360px, calc(100vw - 40px))', background: '#fff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '16px', boxShadow: '0 12px 30px rgba(15,23,42,0.18)' }}>
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>New app update available</div>
          <div style={{ fontSize: '13px', lineHeight: 1.5, color: '#64748b', marginBottom: '12px' }}>{availableUpdate.releaseNotes || 'Refresh the employee app to load the latest changes.'}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={applyUpdate} style={{ flex: 1, padding: '8px 12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: 700 }}>Update now</button>
            <a href={availableUpdate.apkUrl || '/downloads/cecube-dashboard.apk'} target="_blank" rel="noreferrer" style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '7px', color: '#334155', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>APK</a>
          </div>
        </div>
      )}

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
