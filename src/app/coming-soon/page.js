'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { HardHat, ArrowLeft } from 'lucide-react';

export default function ComingSoon() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: '"Inter", sans-serif'
    }}>
      <div style={{
        background: '#ffffff',
        padding: '3rem',
        borderRadius: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '90%'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: '#fef3c7',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <HardHat size={40} color="#d97706" />
        </div>
        <h1 style={{ margin: '0 0 16px', fontSize: '28px', color: '#1e293b', fontWeight: 800 }}>Under Construction</h1>
        <p style={{ margin: '0 0 32px', fontSize: '16px', color: '#64748b', lineHeight: '1.6' }}>
          This module is currently being built and will be available soon. Please check back later!
        </p>
        <button
          onClick={() => router.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
          onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}
        >
          <ArrowLeft size={18} />
          Go Back
        </button>
      </div>
    </div>
  );
}
