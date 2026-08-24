'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import PurchaseSidebar from '../../components/PurchaseSidebar';

export default function PurchaseLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Development bypass for Purchase module
    setAuthorized(true);
  }, [router]);

  // If we are exactly on /purchase, redirect to the first sub-page
  useEffect(() => {
    if (pathname === '/purchase') {
      router.replace('/purchase/suppliers/supplier-list');
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
      <PurchaseSidebar />
      <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#f1f5f9' }}>
        {children}
      </div>
    </div>
  );
}
