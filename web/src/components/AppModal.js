'use client';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function AppModal({ isOpen, title, onClose, onConfirm, confirmLabel = 'Save', confirmColor = '#0284c7', children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const widths = { sm: '400px', md: '560px', lg: '720px', xl: '900px' };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.45)',
      backdropFilter: 'blur(3px)',
      zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }} onClick={onClose}>
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        width: '100%',
        maxWidth: widths[size] || widths.md,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
        border: '1px solid #e2e8f0',
        animation: 'modalSlideIn 0.2s ease'
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #f1f5f9',
          background: '#f8fafc',
          borderRadius: '14px 14px 0 0'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', padding: '4px', borderRadius: '6px',
            display: 'flex', alignItems: 'center'
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem' }}>
          {children}
        </div>

        {/* Footer */}
        {onConfirm && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: '0.6rem',
            padding: '0.875rem 1.25rem',
            borderTop: '1px solid #f1f5f9',
            background: '#f8fafc',
            borderRadius: '0 0 14px 14px'
          }}>
            <button onClick={onClose} style={{
              padding: '0.45rem 1rem', background: 'white', border: '1px solid #e2e8f0',
              borderRadius: '7px', fontWeight: 500, fontSize: '0.82rem', cursor: 'pointer', color: '#64748b'
            }}>Cancel</button>
            <button onClick={onConfirm} style={{
              padding: '0.45rem 1.1rem', background: confirmColor, color: 'white',
              border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer'
            }}>{confirmLabel}</button>
          </div>
        )}

        <style>{`
          @keyframes modalSlideIn {
            from { opacity: 0; transform: translateY(-16px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}
