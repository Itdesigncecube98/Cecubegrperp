'use client';

export default function PrintButton() {
  return (
    <div className="no-print" style={{ marginBottom: '20px', textAlign: 'right' }}>
      <button 
        onClick={() => window.print()}
        style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
      >
        Print Bill
      </button>
    </div>
  );
}
