"use client";
import React, { useEffect, useState } from 'react';
import { X, Bell } from 'lucide-react';

export default function GlobalAlert() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // Override the native window.alert globally
    const originalAlert = window.alert;
    window.alert = (message) => {
      const id = Date.now() + Math.random();
      setAlerts(prev => [...prev, { id, message }]);
      
      // Auto dismiss after 5 seconds
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }, 5000);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const dismissAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {alerts.map(alert => (
        <div key={alert.id} style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          padding: '16px 20px',
          minWidth: '320px',
          maxWidth: '400px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#0f766e' }}></div>
          <div style={{ background: '#ccfbf1', padding: '10px', borderRadius: '50%' }}>
            <Bell size={20} color="#0f766e" />
          </div>
          <div style={{ flex: 1, paddingRight: '20px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Cecube</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>{alert.message}</p>
          </div>
          <button 
            onClick={() => dismissAlert(alert.id)}
            style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              padding: '4px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              borderRadius: '6px', 
              color: '#94a3b8',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
