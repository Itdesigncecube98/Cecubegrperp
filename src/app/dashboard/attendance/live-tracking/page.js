'use client';
import Link from 'next/link';
import { ChevronLeft, MapPin } from 'lucide-react';
import PunchLiveLocationMap from '@/components/PunchLiveLocationMap';

export default function AdminLiveTrackingPage() {
  return (
    <div style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>
          <ChevronLeft size={20} /> Back to Dashboard
        </Link>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={24} color="#3b82f6" />
          Live Fleet & Employee Tracking
        </h1>
      </div>
      
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        <PunchLiveLocationMap active={true} refreshInterval={15000} />
      </div>
    </div>
  );
}
