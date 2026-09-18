'use client';
import React, { useEffect } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';

const TOAST_DURATION_MS = 3500;

export default function BrandToast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      maxWidth: '360px',
      background: isError ? '#fee2e2' : '#ecfdf5',
      color: isError ? '#b91c1c' : '#047857',
      border: `1px solid ${isError ? '#fecaca' : '#a7f3d0'}`,
      padding: '12px 14px',
      borderRadius: '10px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '0.85rem',
      fontWeight: 500
    }}>
      {isError ? <AlertCircle size={16} /> : <Check size={16} />}
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
