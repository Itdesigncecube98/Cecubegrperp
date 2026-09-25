'use client';
import React, { useState } from 'react';
import { RotateCcw, Printer, Share2, Save, Check } from 'lucide-react';

export default function ActionToolbar({ onReset, onSave, printRef, shareTitle = 'HRMS Report' }) {
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);

  const handleSave = () => {
    if (onSave) onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url });
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const handleReset = () => {
    if (onReset) onReset();
  };

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.4rem 0.8rem', borderRadius: '7px', fontSize: '0.78rem',
    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease', border: '1px solid',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: '9px', padding: '0.4rem 0.6rem',
      marginBottom: '1rem'
    }}>
      {/* Reset */}
      <button onClick={handleReset} style={{ ...btnBase, background: '#fff', borderColor: '#e2e8f0', color: '#64748b' }}
        title="Reset filters">
        <RotateCcw size={13} /> Reset
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />

      {/* Print */}
      <button onClick={handlePrint} style={{ ...btnBase, background: '#fff', borderColor: '#e2e8f0', color: '#475569' }}
        title="Print this page">
        <Printer size={13} /> Print
      </button>

      {/* Share */}
      <button onClick={handleShare} style={{ ...btnBase, background: '#fff', borderColor: '#e2e8f0', color: shared ? '#10b981' : '#475569' }}
        title="Share link">
        {shared ? <Check size={13} /> : <Share2 size={13} />}
        {shared ? 'Copied!' : 'Share'}
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />

      {/* Save */}
      <button onClick={handleSave} style={{
        ...btnBase,
        background: saved ? '#10b981' : '#0284c7',
        borderColor: saved ? '#10b981' : '#0284c7',
        color: '#fff'
      }} title="Save changes">
        {saved ? <Check size={13} /> : <Save size={13} />}
        {saved ? 'Saved!' : 'Save'}
      </button>
    </div>
  );
}
