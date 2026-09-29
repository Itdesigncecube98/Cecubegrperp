'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ContractingSidebar from '../../components/ContractingSidebar';
import TopHeader from '../../components/TopHeader';
import ProjectRoutePermissionGate from '../../components/ProjectRoutePermissionGate';

export default function ContractingLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    const adminData = sessionStorage.getItem('adminData');
    const empDataStr = localStorage.getItem('employeeData');

    if (isAdmin && adminData) {
      setAuthorized(true);
    } else if (empDataStr) {
      const empData = JSON.parse(empDataStr);
      fetch(`/api/employees/${empData.id}`)
        .then(res => res.json())
        .then(data => {
          const assignedModules = data?.assignedModules || [];
          if (data && !data.error && (assignedModules.length === 0 || assignedModules.some(module => String(module) === 'Contracting' || String(module).startsWith('Contracting:')))) {
            setAuthorized(true);
          } else {
            router.push('/portal'); // Not authorized for this module
          }
        })
        .catch(() => router.push('/portal'));
    } else {
      router.push('/login');
    }
  }, [router]);

  // If we are exactly on /contracting, redirect to the first sub-page
  useEffect(() => {
    if (pathname === '/contracting') {
      router.replace('/contracting/contractors/contractor-list');
    }
  }, [pathname, router]);

  if (!authorized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #14b8a6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <ContractingSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div style={{ flex: 1, marginLeft: isCollapsed ? '68px' : '260px', transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'auto', backgroundColor: '#f1f5f9' }}>
        <div style={{ padding: '24px 24px 0 24px' }}>
          <TopHeader title="Contracting Dashboard" />
        </div>
        <ProjectRoutePermissionGate>{children}</ProjectRoutePermissionGate>
      </div>
    </div>
  );
}
