'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopHeader from '../../components/TopHeader';

const MODULE_ID = 'ClientProjectLifecycle';

export default function ClientProjectLifecycleLayout({ children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true' && Boolean(sessionStorage.getItem('adminData'));
    if (isAdmin) {
      setAuthorized(true);
      return;
    }

    const employeeData = localStorage.getItem('employeeData');
    if (!employeeData) {
      router.replace('/login');
      return;
    }

    let employeeId;
    try {
      employeeId = JSON.parse(employeeData)?.id;
    } catch {
      router.replace('/login');
      return;
    }
    if (!employeeId) {
      router.replace('/login');
      return;
    }

    fetch(`/api/employees/${encodeURIComponent(employeeId)}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(employee => {
        const modules = Array.isArray(employee?.assignedModules) ? employee.assignedModules : [];
        if (modules.some(module => module === MODULE_ID || module.startsWith(`${MODULE_ID}:`))) {
          setAuthorized(true);
        } else {
          router.replace('/portal');
        }
      })
      .catch(() => router.replace('/portal'));
  }, [router]);

  if (!authorized) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#64748b' }}>Checking module access...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <div style={{ padding: '20px 24px 0' }}><TopHeader title="Client Project Lifecycle" /></div>
      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '20px 24px 40px' }}>{children}</main>
    </div>
  );
}
