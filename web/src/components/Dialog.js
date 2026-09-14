import React from 'react';

export default function Dialog({ isOpen, type, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  const handleConfirm = onConfirm || onCancel || (() => {});

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>
          {title}
        </h3>
        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          {type === 'confirm' && (
            <button
              onClick={onCancel}
              style={{
                padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
                background: 'white', fontWeight: 600, color: '#475569', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleConfirm}
            style={{
              padding: '10px 16px', borderRadius: '8px', border: 'none',
              background: type === 'confirm' ? '#ef4444' : '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer'
            }}
          >
            {type === 'confirm' ? 'Yes, Confirm' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
