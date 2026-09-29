'use client';

export default function PrintButton({ billId }) {
  return (
    <div
      className="no-print"
      style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}
    >
      <a
        href={`/contracting/ra-bills/${billId}/edit`}
        style={{
          background: '#2563eb',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 4,
          textDecoration: 'none',
        }}
      >
        Edit Bill
      </a>

      <button
        onClick={() => window.print()}
        style={{
          background: '#0f172a',
          color: '#fff',
          border: 'none',
          padding: '8px 16px',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        Print Bill
      </button>
    </div>
  );
}